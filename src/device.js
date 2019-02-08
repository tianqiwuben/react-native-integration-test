
class Device {

  constructor() {
    this._resolveRunnerConnect = null;
    this.setRunnerConnected.bind(this);
    this.getInfo.bind(this);
    this.setInfo.bind(this);
    this.setExtend.bind(this);
  }

  setInfo(deviceInfo, tester) {
    this._tester = tester;
    this._deviceInfo = deviceInfo;
  }

  getInfo() {
    return this._deviceInfo;
  }

  setRunnerConnected(connected) {
    this._runnerIsConnected = connected;
    if(connected && this._resolveRunnerConnect) {
      setTimeout(() => {
        this._resolveRunnerConnect();
      }, 1000); // wait for component register;
    }
  }

  setExtend(funcName) {
    this[funcName] = async function(){
      const args = [];
      for (var i = 0; i < arguments.length; i++) {
        args.push(arguments[i]);
      }
      return await this._tester.exec('device', {command: 'extended', funcName, args})
    };
    this[funcName].bind(this);
  }

  runnerConnect() {
    if(this._runnerIsConnected) {
      return true;
    }
    return new Promise((resolve, reject) => {
      this._resolveRunnerConnect = resolve;
      setTimeout(() => {
        this._resolveRunnerConnect = null;
        reject(new Error('Runner connection timeout'));
      }, 10000);
    });
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
