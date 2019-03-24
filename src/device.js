const exec = require('child_process').exec;

class Device {

  constructor() {
    this._resolveRunnerConnect = null;
    this._runnerIsConnected = false;
    this.setRunnerConnected.bind(this);
    this.launchApp.bind(this);
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

  async launchApp(options = {}) {
    let cmd = ""
    return new Promise((resolve, reject) => {
      if(options.url) {
        if(options.platform == 'android') {
          cmd = `adb shell am start -a android.intent.action.VIEW -d "${options.url}" com.embrace_2redbeans.debug`
        } else {
          cmd = `xcrun simctl openurl booted "${options.url}"`;
        }
      } else {
        if(options.platform == 'android') {
          cmd = "xcrun simctl launch booted com.2redbeans.dating";
        } else {
          cmd = `adb shell am start -n com.embrace_2redbeans.debug/.ActivityName`
        }
      }
      if(options.newInstance) {
        let termCmd = options.platform == 'android' ? "adb shell am force-stop com.embrace_2redbeans.debug" : "xcrun simctl terminate booted com.2redbeans.dating";
        exec(termCmd, (error, stdout, stderr) => {
          exec(cmd, (error, stdout, stderr) => {
            if (error !== null) {
              console.log(`exec error: ${error}`);
              reject(error)
            }
            resolve();
          });
        });
      } else {
        let otherAppCmd = "";
        if(options.platform == 'android') {
          otherAppCmd = "adb shell am start -a android.intent.action.VIEW -d https://www.apple.com"
        } else {
          otherAppCmd =  "xcrun simctl openurl booted https://www.apple.com";
        }
        exec(otherAppCmd, (error, stdout, stderr) => {
          if (error !== null) {
              console.log(`exec error: ${error}`);
              reject(error)
          }
          exec(cmd, (error, stdout, stderr) => {
            if (error !== null) {
              console.log(`exec error: ${error}`);
              reject(error)
            }
            resolve();
          });
        });
      }
    })
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
      return Promise.resolve(true);
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
