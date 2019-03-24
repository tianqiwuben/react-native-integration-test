const WebSocket = require('ws');


class Tester {

  constructor(config = {}) {

    this._ws = null;
    this.cid = 0;
    this._config = config;
    this.commandResults = {};
    this._deviceInfo = null;

    const port = config.port || 8098;
    let testHost = config.testHost || 'localhost';


    if(this._config.verbose) {
      console.log('---- Configuration ----');
      for(let attr in this._config) {
        console.log(attr + ': ' + this._config[attr])
      }
    }

    const httpServer = require('http').createServer();
    const server = new WebSocket.Server({server: httpServer});


    httpServer.listen(8098);

    server.on('connection', (ws) => {
      this._ws = ws;

      ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        if(this._config.verbose) {
          console.log('Receive message', msg.data);
        }
        switch(data.type){
          case 'deviceInfo': {
            const deviceInfo = data.deviceInfo;
            if(this._config.verbose) {
              console.log("\n---- Device connected ----");
              for(let attr in deviceInfo) {
                console.log(attr + ': ' + deviceInfo[attr])
              }
            }

            this.send({type: 'config', config: this._config});

            this._deviceInfo = deviceInfo;

            device.setInfo(deviceInfo, this);
            device.setRunnerConnected(true);
            break;
          }
          case 'execDone': {
            this.commandResults[data.cid] = {result: data.result};
            if(this._config.verbose && data.cid != this.cid) {
              console.log('Warning: device responded time out result.');
            }
            break;
          }
          case 'reportException': {
            this.commandResults[data.cid] = {exception: data.message};
            break;
          }
        }
      }

      ws.onclose = () => {
        device.setRunnerConnected(false);
        if(!this._config.allowDeviceDisconnet) {
          throw new Error('Device disconnected');
        }
      }
    });

    this.exec.bind(this);
    this.send.bind(this);
    this.sendCommand.bind(this);

  }

  send(payload){
    if (this._ws.readyState === this._ws.OPEN) {
      const message = JSON.stringify(payload)
      if(this._config.verbose) {
        console.log('Send message', message);
      }
      this._ws.send(message);
    } else {
      throw new Error('Device not connected');
    }
  }


  async exec(target, data = {}){
    await device.runnerConnect();
    let traceError = new Error();
    try {
      return await this.sendCommand(target, data);
    } catch(e) {
      traceError.message = e.message;
      throw traceError;
    }
  }

  sendCommand(target, data) {
    let promise = new Promise((resolve, reject) => {
      this.cid += 1;
      const cid = this.cid;
      const payload = Object.assign({type: 'exec', target, cid}, data);
      this.send(payload);
      let startTime = Date.now();
      let loop = setInterval(() => {
        if(this.commandResults[cid]) {
          clearInterval(loop);
          const result = this.commandResults[cid];
          delete this.commandResults[cid];
          if(result.exception) {
            let message = result.exception;
            if(this._config.verbose) {
              message = `${result.exception}\n-- ${target} -- \n${JSON.stringify(data)}`;
            }
            return reject(new Error(message));
          } else {
            return resolve(result.result);
          }
        } else {
          let shouldWait = (data.options && data.options.deviceTimeout) || this._config.deviceTimeout || 5000;
          if(target === 'device' && data.command == 'gesture') {
            shouldWait += data.duration;
          }
          if(target === 'component' && data.options && data.options.waitTime) {
            shouldWait = data.options.waitTime + 1000;
          }
          if (Date.now() - startTime >= shouldWait) {
            clearInterval(loop);
            return reject(new Error('Execution time out for ' + JSON.stringify(data)));
          }
        }
      }, 25);
    });
    return promise;
  }

}


module.exports = Tester;
