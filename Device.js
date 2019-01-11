class Component {
  constructor(identifier, device) {
    this.identifier = identifier;
    this.jobs = [];
    this.device = device;
  }

  variable(varName) {
    this.jobs.push({job: 'variable', varName});
    return this;
  }

  func(funcName, ...args) {
    this.jobs.push({job: 'func', funcName, args: args});
    return this;
  }

  asyncFunc(funcName, ...args) {
    this.jobs.push({job: 'asyncFunc', funcName, args: args});
    return this;
  }

  async exec(options = {}) {
    return await this.device.exec('component', {identifier: this.identifier, jobs: this.jobs, options});
  }

}


class Device {

  constructor(config = {}, deviceReady = () => {}) {

    this.socket = null;
    this.cid = 0;
    this.config = config;
    this.commandResults = {};

    const app = require('express')();
    const http = require('http').Server(app);
    const port = config.port || 8083
    
    http.listen(port, () => {
      if(config.verbose) {
        console.log(`Device listening on *:${port}`);
      }
    });

    this.io = require('socket.io')(http);

    this.io.on('connection', (socket) => {
      this.socket = socket;

      socket.on('deviceInfo', (deviceInfo) => {
        if(config.verbose) {
          console.log(new Date(), 'Tester connected with ip', socket.handshake.address);
          for(let attr in deviceInfo) {
            console.log(attr + ': ' + deviceInfo[attr])
          }
        }

        socket.emit('config', config);

        deviceReady(deviceInfo);

      });


      socket.on('execDone', (payload) => {
        this.commandResults[payload.cid] = {result: payload.result};
        if(config.verbose && payload.cid != this.cid) {
          console.log('Warning: device responded time out result.');
        }
      });

      socket.on('reportException', (payload) => {
        this.commandResults[payload.cid] = {exception: payload.message};
      });


    });

    this.measure.bind(this);
    this.visible.bind(this);
    this.invisible.bind(this);
    this.getHooks.bind(this);
    this.getAllStyles.bind(this);
    this.getStyle.bind(this);
    this.exists.bind(this);
    this.notExists.bind(this);
    this.fillIn.bind(this);
    this.press.bind(this);
    this.exec.bind(this);

  }

  component(identifier) {
    return new Component(identifier, this);
  }

  async measure(identifier, options = {}) {
    return await this.exec('measure', {identifier, options});
  }

  async visible(identifier, options = {}) {
    return await this.exec('visible', {identifier, options});
  }

  async invisible(identifier, options = {}) {
    return await this.exec('invisible', {identifier, options});
  }

  async getHooks() {
    return await this.exec('getHooks');
  }

  async getAllStyles() {
    return await this.exec('getAllStyles');
  }

  async getStyle(identifier, options = {}) {
    return await this.exec('getStyle', {identifier, options});
  }

  async exists(identifier, options = {}) {
    return await this.exec('exists', {identifier, options});
  }

  async notExists(identifier, options = {}) {
    return await this.exec('notExists', {identifier, options});
  }

  async fillIn(identifier, content, options = {}) {
    return await this.exec('fillIn', {identifier, content, options});
  }

  async press(identifier, options = {}){
    return await this.exec('press', {identifier, options});
  }


  async exec(command, payload = {}){
    let promise = new Promise((resolve, reject) => {
      this.cid += 1;
      const cid = this.cid;
      const allPayload = Object.assign({}, payload, {command, cid});
      this.socket.emit('exec', allPayload);
      let startTime = Date.now();
      let loop = setInterval(() => {
        if(this.commandResults[cid]) {
          clearInterval(loop);
          const result = this.commandResults[cid];
          delete this.commandResults[cid];
          if(result.exception) {
            return reject(new Error(result.exception));
          } else {
            return resolve(result.result);
          }
        } else {
          const shouldWait = this.config.deviceTimeout || 5000;
          if (Date.now() - startTime >= shouldWait) {
            clearInterval(loop);
            return reject(new Error('Device time out for ' + command + ' ' + JSON.stringify(payload)));
          }
        }
      }, 25);
    });
    return promise;
  }

  async pause(time){
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


}


module.exports = Device;
