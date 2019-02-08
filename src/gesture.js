import BatchedBridge from 'react-native/Libraries/BatchedBridge/BatchedBridge';
const UIManager = require('react-native').NativeModules.UIManager;

let gestureID = 0;

class Gesture {

  constructor(actions, identifier, testRunnerNode, testOverlay) {
    this._testOverlay = testOverlay;
    this._actions = actions;
    this._testRunnerNode = testRunnerNode;
    this._identifier = identifier;
  }

  generateEvent = (curTime) => {

    const touch = {
      target: this._targetID,
      pageX: this._curX,
      timestamp: curTime,
      locationX: this._curX - this._targetLeft,
      pageY: this._curY - this._targetRight,
      locationY: this._curY,
      identifier: this._identifier,
    }

    switch(this._curAction.action) {
      case 'touch':
        return {eventType: 'topTouchStart', touch, changed: true};
        break;
      case 'release':
        return {eventType: 'topTouchEnd', touch, changed: true};
        break;
      case 'hold':
        return {eventType: 'topTouchMove', touch, changed: false};
        break;
      default:
        return {eventType: 'topTouchMove', touch, changed: true};
        break;
    }
  }

  getEvent = (curTime) => {
    let touchEvent = null;
    this.getLatestPosition();
    if(this._curAction.action == 'touch') {
      touchEvent = this.generateEvent(curTime);
      this.nextAction();
    } else if (this._curAction.action == 'move') {
      const timeDiff = Math.min(curTime, this._endAction) - this._lastTime;
      this._preX = this._curX;
      this._preY = this._curY;
      this._curX += this.vX * timeDiff;
      this._curY += this.vY * timeDiff;
      touchEvent = this.generateEvent(curTime);
      this._testOverlay.moveTrack(this._trackID, this._curX, this._curY);
      if(curTime > this._endAction) {
        this.nextAction();
      }
    } else if (this._curAction.action == 'release') {
      touchEvent = this.generateEvent(curTime);
      this._testOverlay.pressFinished(this._trackID);
    } else if  (this._curAction.action == 'hold') {
      touchEvent = this.generateEvent(curTime);
      if(curTime > this._endAction) {
        this.nextAction();
      }
    }
    this._lastTime = curTime;
    return touchEvent;
  } 

  start = async () => {
    this._startTime = global.nativePerformanceNow();
    this._lastTime = this._startTime;
    let promise = new Promise((resolve, reject) => {
      this.nextAction();
      UIManager.findSubviewIn(
        this._testRunnerNode,
        [this._curX, this._curY],
        (nativeViewTag, left, top, width, height) => {
          this._targetID = nativeViewTag;
          this._targetLeft = left;
          this._targetTop = top;
          resolve(nativeViewTag);
        },
      );
    });
    return promise;
  }

  nextAction = () => {
    this._curAction = this._actions.shift();
    if(this._curAction.action == 'touch') {
      this._curX = this._curAction.x;
      this._curY = this._curAction.y;
      this._startX = this._curX;
      this._startY = this._curY;
      this._preX = this._curX;
      this._preY = this._curY;
      this._trackID = this._testOverlay.startTrack(this._curX, this._curY)
    } else if (this._curAction.action == 'move') {
      this.vX = (this._curAction.x - this._curX) / this._curAction.ms;
      this.vY = (this._curAction.y - this._curY) / this._curAction.ms;
      this._endAction = global.nativePerformanceNow() + this._curAction.ms;
    } else if (this._curAction.action == 'hold') {
      this._endAction = global.nativePerformanceNow() + this._curAction.ms;
    } else if (this._curAction.action == 'release') {
    }
  }

  getLatestPosition = () => {
    if(!this._targetID) {
      return;
    }
    UIManager.measure(this._targetID, (x, y, width, height, pageX, pageY) => {
      this._targetLeft = pageX;
      this._targeTop = pageY;
    })
  }

}


export default Gesture;
