import { 
  findNodeHandle, 
  View, 
  Dimensions,
  StyleSheet,
  Platform,
} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import io from 'socket.io-client';
const RCTUIManager = require('react-native').NativeModules.UIManager;

import TestHook from './TestHook';


class ComponentNotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ComponentNotFoundError';
  }
}

class ComponentNotVisibleError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ComponentNotVisibleError';
  }
}

let tester = null;

class Tester {

  static init() {
    tester = new Tester();
  }

  constructor(config = {}) {
    this.windowWidth = Dimensions.get('window').width;
    this.windowHeight = Dimensions.get('window').height;
    this.testOverLayComponent = null;
    const testHost = config.testHost || '127.0.0.1';
    const port = config.port || '8083';

    this.socket = io(`ws://${ipAddress}:${port}`, {
        jsonp: false,
        transports: ['websocket']
    });


    this.socket.on('connect', () => {
      this.registerDevice();
    });

    this.socket.on('config', (config) => {
      this.waitTime = config.waitTime || 2000;
      this.pauseAfterPress = config.pauseAfterPress || 0;
      this.visibilityThreshold = config.visibilityThreshold || 100;
    });

    this.socket.on('exec', (payload) => {
      this.exec(payload);
    })

  }


  registerDevice = () => {
    const os = Platform.OS
    this.socket.emit('deviceInfo', {
      platform: os,
      apiLevel: os === 'android' ? DeviceInfo.getAPILevel() : null,
      buildNumber: DeviceInfo.getBuildNumber(),
      model: DeviceInfo.getModel(),
      systemVersion: DeviceInfo.getSystemVersion(),
      version: DeviceInfo.getVersion(),
    });
  }

  exec = async (payload) => {
    try {
      switch(payload.command) {
        case 'press': {
          await this.press(payload.identifier, payload.options);
          this.reportExecDone(payload.cid, true);
          break;
        }
        case 'fillIn': {
          await this.fillIn(payload.identifier, payload.content, payload.options);
          this.reportExecDone(payload.cid, true);
          break;
        }
        case 'exists': {
          await this.exists(payload.identifier, payload.options);
          this.reportExecDone(payload.cid, true);
          break;
        }
        case 'notExists': {
          await this.notExists(payload.identifier, payload.options);
          this.reportExecDone(payload.cid, true);
          break;
        }
        case 'visible': {
          await this.visible(payload.identifier, payload.options);
          this.reportExecDone(payload.cid, true);
          break;
        }
        case 'invisible': {
          await this.invisible(payload.identifier, payload.options);
          this.reportExecDone(payload.cid, true);
          break;
        }
        case 'getHooks': {
          const hookNames = this.getHooks();
          this.reportExecDone(payload.cid, hookNames);
          break;
        }
        case 'getStyle': {
          const style = await this.getStyle(payload.identifier, payload.options);
          this.reportExecDone(payload.cid, style);
          break;
        }
        case 'getAllStyles': {
          const styles = this.getAllStyles();
          this.reportExecDone(payload.cid, styles);
          break;
        }
        case 'measure': {
          const position = await this.measure(payload.identifier, payload.options);
          this.reportExecDone(payload.cid, position);
          break;
        }
        case 'component': {
          const execResult = await this.componentExec(payload.identifier, payload.jobs, payload.options);
          this.reportExecDone(payload.cid, execResult);
          break;
        }
      }
    } catch (e) {
      this.reportException(payload.cid, e);
    }

  }

  reportExecDone = (cid, result) => {
    this.socket.emit('execDone', { cid, result });
  }  

  reportException = (cid, e) => {
    this.socket.emit('reportException', {cid, message: e.message});
  }


  componentExec = async (identifier, jobs, options) => {
    const component = await this.findComponent(identifier, options);
    let result = component;
    for(let i = 0; i < jobs.length; i++) {
      switch(jobs[i].job) {
        case 'variable': {
          result = result[jobs[i].varName];
          break;
        }
        case 'func': {
          result = result[jobs[i].funcName](...jobs[i].args);
          break;
        }
        case 'asyncFunc': {
          result = await result[jobs[i].funcName](...jobs[i].args);
          break;
        }
      }
    }
    //FIXME opbject too large
    return result;
  }

  overlayPressPosition = (position) => {
    const overlay = TestHook.get('IntegrationTestOverlay');
    if(overlay) {
      overlay.pressAt(position.pageX + position.width / 2, position.pageY + position.height / 2);
    }
  }


  findComponent = (identifier, options = {}) => {
    let promise = new Promise((resolve, reject) => {
      let startTime = Date.now();
      let loop = setInterval(() => {
        const component = TestHook.get(identifier);
        if (component) {
          clearInterval(loop);
          return resolve(component);
        } else {
          const shouldWait = options.waitTime || this.waitTime;
          if (Date.now() - startTime >= shouldWait) {
            reject(new ComponentNotFoundError(`Could not find component with identifier ${identifier}`));
            clearInterval(loop);
          }
        }
      }, 100);
    });

    return promise;
  }

  fillIn = async (identifier, str, options={}) => {
    const position = await this.visible(identifier, options);
    const component = await this.findComponent(identifier, options);
    this.overlayPressPosition(position);
    component.focus();
    component.props.onChangeText(str);
  }

  press = async (identifier, options = {}) => {
    const position = await this.visible(identifier, options);
    const component = await this.findComponent(identifier, options);
    const pressCount = options.count || 1;
    const pauseAfterPress = options.pauseAfterPress || this.pauseAfterPress;
    for(let i = 0; i < pressCount; i++) {
      this.overlayPressPosition(position);
      component.props.onPress();
      if(i > 0) {
        await this.pause(pauseAfterPress);
      }
    }
    if(pauseAfterPress === 0) {
      return;
    }
    await this.pause(pauseAfterPress);
  }

  pause = async (time) => {
    if(time <= 0) {
      return;
    }
    let promise = new Promise((resolve, reject) => {
      setTimeout(function() {
        resolve();
      }, time);
    });

    return promise;
  }

  getHooks = () => {
    return Object.keys(TestHook.getHooks());
  }

  measure = async (identifier, options = {}) => {
    const component = await this.findComponent(identifier, options);
    let promise = new Promise((resolve, reject) => {
      try{
        RCTUIManager.measure(findNodeHandle(component), (x, y, width, height, pageX, pageY) => {
          resolve({x, y, width, height, pageX, pageY});
        })
      } catch (e) {
        reject(e);
      }
    });
    return promise;
  }

  visible = async (identifier, options = {}) => {
    const component = await this.findComponent(identifier, options);
    const position = await this.measure(identifier);
    const threshold = options.visibility || this.visibilityThreshold;
    const x_distance = Math.min(this.windowWidth, position.pageX + position.width) - Math.max(0, position.pageX);
    const y_distance = Math.min(this.windowHeight, position.pageY + position.height) - Math.max(0, position.pageY);
    if(x_distance > 0 && y_distance > 0) {
      if(threshold == 100) {
        if(position.pageX >= 0 && 
          position.pageX + position.width <= this.windowWidth &&
          position.pageY >= 0 &&
          position.pageY + position.height <= this.windowHeight) {
          return position;
        }
      } else {
        if(x_distance * y_distance >= position.width * position.height * threshold / 100) {
          return position;
        }
      }
    }
    throw new ComponentNotVisibleError(`Component with identifier ${identifier} was not visible: threshold ${threshold} ${options.visibility} ${this.visibilityThreshold} ${JSON.stringify(position)}`);
  }

  invisible = async (identifier, options = {}) => {
    try {
      await this.visible(identifier, options);
    } catch (e) {
      if(e.name == 'ComponentNotVisibleError') {
        return true;
      }
      throw e;
    }
    throw new Error(`Component with identifier ${identifier} was visible`);
  }

  exists = async (identifier, options = {}) => {
    const component = await this.findComponent(identifier, options);
    return !!component;
  }


  notExists = async (identifier, options = {}) => {
    try {
      await this.findComponent(identifier);
    } catch(e) {
      if (e.name == 'ComponentNotFoundError') {
        return true;
      }
      throw e;
    }
    throw new Error(`Component with identifier ${identifier} was present`);
  }

  getStyle = async (identifier, options = {}) => {
    const component = await this.findComponent(identifier, options);
    return StyleSheet.flatten(component.props.style);
  }

  getAllStyles = () => {
    const styles = {};
    const hooks = TestHook.getHooks();
    for (let id in hooks) {
      const component = hooks[id];
      if(component.props && component.props.style) {
        styles[id] = StyleSheet.flatten(component.props.style);
      }
    }
    return styles;
  }

  reRenderApp = async () => {
    this.component.forceUpdate();
  }

}


export default Tester;
