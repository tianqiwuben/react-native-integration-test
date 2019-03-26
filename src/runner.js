import { 
  findNodeHandle, 
  View, 
  Dimensions,
  StyleSheet,
  Platform,
  InteractionManager,
} from 'react-native';
import DeviceInfo from 'react-native-device-info';

const UIManager = require('react-native').NativeModules.UIManager;

const TestStore = require('./testStore');

import Gestures from './gestures';

class Runner {

  constructor() {
    this._windowWidth = Dimensions.get('window').width;
    this._windowHeight = Dimensions.get('window').height;
    this._retry = 0;
    this._verbose = false;
    
    this.initWs();
  }

  initWs = () => {
    const port = 8098;
    const getDevServer = require('react-native/Libraries/Core/Devtools/getDevServer');
    const devServer = getDevServer();
    const testHost = devServer.url.replace(/https?:\/\//, '').split(':')[0];

    this._ws = new WebSocket(`ws://${testHost}:${port}`);
 
    this._ws.onopen = () => {
      this._retry = 0;
      this.registerDevice();
    };

    this._ws.onclose = () => {
      setTimeout(() => {
        this._retry += 1;
        this.initWs();
      }, 4000);
    }

    this._ws.onmessage = (payload) => {
      const data = JSON.parse(payload.data);
      switch(data.type) {
        case 'config': {
          const config = data.config;
          TestStore.setWaitTime(config.waitTime);
          this._verbose = config.verbose || false;
          this._pauseAfterPress = config.pauseAfterPress || 0;
          this._visibilityThreshold = config.visibilityThreshold || 100;
          this._waitVisibility = config.waitVisibility || 500;
          break;
        }
        case 'exec': {
          this.exec(data);
        }
      }
    };
  }

  registerDevice = () => {
    const os = Platform.OS
    this.send({type: 'deviceInfo', 
      deviceInfo: {
        platform: os,
        apiLevel: os === 'android' ? DeviceInfo.getAPILevel() : null,
        buildNumber: DeviceInfo.getBuildNumber(),
        model: DeviceInfo.getModel(),
        systemVersion: DeviceInfo.getSystemVersion(),
        version: DeviceInfo.getVersion(),
        windowWidth: this._windowWidth,
        windowHeight: this._windowHeight,
      }
    });
  }


  send = (data) => {
    if (this._ws.readyState === this._ws.OPEN) {
      this._ws.send(JSON.stringify(data));
    }
  }

  exec = async (payload) => {
    try {
      await this._waitInteraction(payload.options);
      switch(payload.command) {
        case 'press': {
          await this.press(payload.matcher, payload.options);
          this.reportExecDone(payload.cid, true);
          break;
        }
        case 'fillIn': {
          await this.fillIn(payload.matcher, payload.content, payload.options);
          this.reportExecDone(payload.cid, true);
          break;
        }
        case 'visible': {
          const isVisible = await this.visible(payload.matcher, payload.options);
          this.reportExecDone(payload.cid, isVisible);
          break;
        }
        case 'exists': {
          const execResult = await TestStore.findComponent(payload.matcher, true);
          this.reportExecDone(payload.cid, execResult);
          break;
        }
        case'propCallback': {
          const execResult = await this.propCallback(payload.matcher, payload.funcName, payload.params);
          this.reportExecDone(payload.cid, execResult);
          break;
        }
        case 'getStyle': {
          const style = await this.getStyle(payload.matcher, payload.options);
          this.reportExecDone(payload.cid, style);
          break;
        }
        case 'measure': {
          const position = await this.measure(payload.matcher, payload.options);
          this.reportExecDone(payload.cid, position);
          break;
        }
        case 'scrollTo': {
          const execResult = await this.scrollTo(payload.matcher, payload.params, payload.options);
          this.reportExecDone(payload.cid, execResult);
          break;
        }
        case 'scrollToEnd': {
          const execResult = await this.scrollToEnd(payload.matcher, payload.params, payload.options);
          this.reportExecDone(payload.cid, execResult);
          break;
        }
        case 'scrollToSee': {
          const execResult = await this.scrollToSee(payload.matcher, payload.childMatcher, payload.options);
          this.reportExecDone(payload.cid, execResult);
          break;
        }
        case 'gesture': {
          const execResult = await this.gesture(payload.actions, payload.options);
          this.reportExecDone(payload.cid, execResult);
          break;
        }
        case 'extended': {
          const func = TestStore.getTestExtend(payload.funcName);
          if(typeof func != 'function') {
            throw new Error(`Extended function ${payload.funcName} is not a function`);
          }
          const execResult = await func(...payload.args);
          this.reportExecDone(payload.cid, execResult);
          break;
        }
        default: {
          throw new Error(`Unknown command ${payload.command}`);
        }
      }
    } catch (e) {
      this.reportException(payload.cid, e);
    }

  }

  reportExecDone = (cid, result) => {
    this.send({type: 'execDone', cid, result });
  }  

  reportException = (cid, e) => {
    this.send({type: 'reportException', cid, message: e.message});
  }

  gesture = async (actions, options) => {
    return await Gestures.action(actions);
  }

  fillIn = async (matcher, content, options={}) => {
    const component = await TestStore.findComponent(matcher);
    const position = await this._componentMustVisible(component, matcher, options);
    component.publicInstance.focus();
    component.props.onChangeText(content);
    return true;
  }

  propCallback = async (matcher, funcName, params) => {
    const component = await TestStore.findComponent(matcher);
    component.props[funcName](...params);
    return true;
  }

  press = async (matcher, options = {}) => {
    const component = await TestStore.findComponent(matcher);
    const multiPress = options.multiPress || 1;
    if(typeof component.props.onPress != 'function') {
      throw new Error(`Component does not have onPress function with matcher ${JSON.stringify(matcher)}`);
    }

    for(let i = 0; i < multiPress; i++) {
      const position = await this._componentMustVisible(component, matcher, options);
      if(position.width < 20 || position.height < 20) {
        throw new Error(`Component is too small to press w-${position.width} h-${position.height} with matcher ${JSON.stringify(matcher)}`);
      }
      const pauseAfterPress = options.pauseAfterPress || this._pauseAfterPress;
      component.props.onPress();
      const x = position.pageX + (options.atX || position.width / 2);
      const y = position.pageY + (options.atY || position.height / 2);
      Gestures.press(x, y);
      if(pauseAfterPress > 0) {
        await this.pause(pauseAfterPress);
      }
    }
    return true;
  }

  _waitInteraction = (options = {}) => {
    let interactionWait = 300;
    if(typeof options.interactionWait == 'number') {
      if(options.interactionWait <= 0) {
        return;
      }
      if(options.interactionWait > 10000) {
        interactionWait = 10000;
      } else {
        interactionWait = options.interactionWait;
      }
    }
    return new Promise((resolve, reject) => {
      let resolved = false;
      let st = setTimeout(() => {
        if(!resolved) {
          resolved = true;
          resolve();
        }
      }, interactionWait);
      InteractionManager.runAfterInteractions(() => {
        if(!resolved) {
          resolved = true;
          resolve();
        }
      });
    });
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

  _measureComponent = (component) => {
    const nativeViewTag = findNodeHandle(component.publicInstance);
    if(!nativeViewTag) {
      throw new Error(`Can't found nativeViewTag for component ${component.name} ${component.nodeType}`);
    }
    let promise = new Promise((resolve, reject) => {
      try{
        UIManager.measure(nativeViewTag, (x, y, width, height, pageX, pageY) => {
          resolve({x, y, width, height, pageX, pageY, nativeViewTag});
        })
      } catch (e) {
        reject(e);
      }
    });
    return promise;
  }


  measure = async (matcher, options = {}) => {
    const component = await TestStore.findComponent(matcher);
    return await this._measureComponent(component);
  }


  _checkVisible = async (component, threshold) => {
    const position = await this._measureComponent(component);
    if(threshold === 0) {
      return {position, isVisible: true};
    }
    const x_distance = Math.min(this._windowWidth, position.pageX + position.width) - Math.max(0, position.pageX);
    const y_distance = Math.min(this._windowHeight, position.pageY + position.height) - Math.max(0, position.pageY);
    if(x_distance > 0 && y_distance > 0) {
      if(threshold == 100) {
        if(position.pageX >= 0 && 
          position.pageX + position.width <= this._windowWidth &&
          position.pageY >= 0 &&
          position.pageY + position.height <= this._windowHeight) {
          return {position, isVisible: true};
        }
      } else {
        if(x_distance * y_distance >= position.width * position.height * threshold / 100) {
          return {position, isVisible: true};
        }
      }
    }
    return {position, isVisible: false};
  }

  _componentVisible = async (component, options = {}) => {
    let threshold = this._visibilityThreshold;
    if(typeof options.visibility == 'number') {
      threshold = options.visibility;
    }
    let waitVisibility = this._waitVisibility;
    if(typeof options.waitVisibility == 'number') {
      waitVisibility = options.waitVisibility;
    }
    let checkVis = await this._checkVisible(component, threshold);
    checkVis.threshold = threshold;
    checkVis.waitVisibility = waitVisibility;
    let position = checkVis.position;
    if(checkVis.isVisible) {
      return checkVis;
    }
    if(waitVisibility > 0) {
      await this.pause(waitVisibility);
    } else {
      return checkVis;
    }
    checkVis = await this._checkVisible(component, threshold);
    checkVis.threshold = threshold;
    checkVis.waitVisibility = waitVisibility;
    return checkVis;
  }

  _componentMustVisible = async (component, matcher, options = {}) => {
    const checkVis = await this._componentVisible(component, options);
    const {position, isVisible, threshold, waitVisibility} = checkVis;
    if(isVisible) {
      return position;
    }
    throw new Error(`Component with matcher ${JSON.stringify(matcher)} was not visible: threshold ${threshold} waitVisibility ${waitVisibility} ${JSON.stringify(position)}`);
  }

  visible = async (matcher, options = {}) => {
    try{
      const component = await TestStore.findComponent(matcher);
      const checkVis = await this._componentVisible(component, options);
      return checkVis.isVisible;
    }catch(e) {
      return false;
    }
  }

  scrollToEnd = async (matcher, params, options = {}) => {
    const component = await TestStore.findComponent(matcher);
    const position = await this._componentMustVisible(component, matcher, options);
    const animated = (params && params.animated) !== false;
    UIManager.dispatchViewManagerCommand(
      position.nativeViewTag,
      UIManager.RCTScrollView.Commands.scrollToEnd,
      [animated],
    );
    return true;
  }

  scrollTo = async (matcher, params, options = {}) => {
    const component = await TestStore.findComponent(matcher);
    const position = await this._componentMustVisible(component, matcher, options);
    const {x, y, animated} = params;
    UIManager.dispatchViewManagerCommand(
      position.nativeViewTag,
      UIManager.RCTScrollView.Commands.scrollTo,
      [x || 0, y || 0, animated !== false],
    );
    return true;
  }

  // options
  //   position: start, end, visible, center
  //     default: visible

  scrollToSee = async (matcher, childMatcher, options = {}) => {
    const scrollview = await TestStore.findComponent(matcher);
    const scrollPos = await this._measureComponent(scrollview);

    const component = await TestStore.findComponent(childMatcher);
    const componentPos = await this._measureComponent(component);

    const bottomDiff = componentPos.pageY + componentPos.height - scrollPos.pageY - scrollPos.height;
    const topDiff = componentPos.pageY - scrollPos.pageY;
    const rightDiff = componentPos.pageX + componentPos.width - scrollPos.pageX - scrollPos.width;
    const leftDiff = componentPos.pageX - scrollPos.pageX;
    let x = componentPos.x;
    let y = componentPos.y;   //start
    const posOption = options.position || 'visible';
    if(posOption == 'end') {
      y = componentPos.height + componentPos.y - scrollPos.height;
      x = componentPos.width + componentPos.x - scrollPos.width;
    } else if(posOption == 'center') {
      y = componentPos.y - (scrollPos.height - componentPos.height) / 2;
      x = componentPos.x - (scrollPos.width - componentPos.width) / 2;
    } else if (posOption == 'visible') {
      let needToScroll = false;
      if(bottomDiff > 0) {
        y = componentPos.height + componentPos.y - scrollPos.height;
        needToScroll = true;
      } else if (topDiff < 0) {
        needToScroll = true;
      }
      if(rightDiff > 0) {
        x = componentPos.width + componentPos.x - scrollPos.width;
        needToScroll = true;
      } else if (leftDiff < 0) {
        needToScroll = true;
      }
      if(!needToScroll) {
        return await this.visible(matcher, options);
      }
    }
    if(x < 0) {
      x = 0;
    }
    if(y < 0) {
      y = 0;
    }

    UIManager.dispatchViewManagerCommand(
      scrollPos.nativeViewTag,
      UIManager.RCTScrollView.Commands.scrollTo,
      [x, y, true],
    );

    return await this._componentVisible(component, options);
  }

}


export default Runner;
