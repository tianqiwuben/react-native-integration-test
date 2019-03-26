import { 
  View,
  findNodeHandle,
} from 'react-native';
import BatchedBridge from 'react-native/Libraries/BatchedBridge/BatchedBridge';

import Gesture from './gesture';
import TextInput from './textInput';
import TextStore from './testStore';

let gesturesInst = null;

class Gestures {

  constructor(testRunner, testOverlay) {
    this._testRunnerNode = findNodeHandle(testRunner);
    this._testOverlay = testOverlay;
    this._gestureID = 0;
    this._gestureList = {}
    this._hasLiveAction = false;
    this._actionResolves = {}
    this._textInput = null;
    this._receiveTouches = BatchedBridge.getCallableModule('RCTEventEmitter').receiveTouches;
    this._receiveEvent = BatchedBridge.getCallableModule('RCTEventEmitter').receiveEvent;
    this._pressList = [];
  }

  action = async (actions) => {
    const runnerNode = findNodeHandle(TextStore.getRoot());
    this._gestureID += 1;
    const gesID = this._gestureID;
    const gesture = new Gesture(actions, gesID, this._testRunnerNode, this._testOverlay);
    this._gestureList[gesID] = gesture;
    await gesture.start();

    return new Promise((resolve, reject) => {
      this._actionResolves[gesID] = resolve;
      if(this._hasLiveAction == false) {
        this._hasLiveAction = true;
        this.animateFrame();
      }
    });
  }

  press = async (x, y) => {
    const trackID = this._testOverlay.startTrack(x, y);
    this._pressList.push(trackID);
    if(this._hasLiveAction == false) {
      this._hasLiveAction = true;
      this.animateFrame();
    }
  }

  textInput = async (actions) => {
    if(this._textInput) {
      throw new Error('Only one text input at a time.');
    }
    this._gestureID += 1;
    const gesID = this._gestureID;
    this._textInput = new TextInput(actions, gesID, this._testRunnerNode);
    return new Promise((resolve, reject) => {
      this._textResolve = resolve;
      if(this._hasLiveAction == false) {
        this._hasLiveAction = true;
        this.animateFrame();
      }
    });
  }

  animateFrame = () => {
    const curTime = global.nativePerformanceNow();
    const startEvents = [];
    const endEvents = [];
    const endGestures = [];
    const moveEvents = [];
    const touchList = [];
    let idx = 0;
    if(this._pressList.length > 0) {
      const trackID = this._pressList.shift();
      this._testOverlay.pressFinished(trackID);
    }
    for(let gesID in this._gestureList) {
      const gesEvent = this._gestureList[gesID].getEvent(curTime);
      touchList.push(gesEvent.touch);
      switch(gesEvent.eventType) {
        case 'topTouchStart':
          startEvents.push(idx);
          break;
        case 'topTouchEnd':
          endEvents.push(idx);
          endGestures.push(gesID);
          break;
        default:
          if(gesEvent.changed) {
            moveEvents.push(idx);
          }
          break;
      }
      idx += 1;
    }
    if(startEvents.length > 0) {
      this._receiveTouches('topTouchStart', touchList, startEvents);
    }
    if(endEvents.length > 0) {
      this._receiveTouches('topTouchEnd', touchList, endEvents);
    }
    if(moveEvents.length > 0) {
      this._receiveTouches('topTouchMove', touchList, moveEvents);
    }
    if(endGestures.length > 0) {
      endGestures.forEach(gesID => {
        this._actionResolves[gesID]();
        delete this._gestureList[gesID];
        delete this._actionResolves[gesID];
      })
    }

    if(this._textInput) {
      const gesEvent = this._textInput.getEvent();
      this._receiveEvent(gesEvent.params.target, gesEvent.eventType, gesEvent.params);
      if(gesEvent.finished) {
        this._textInput = null;
        this._textResolve();
      }
    }


    if(Object.keys(this._gestureList).length == 0 && !this._textInput) {
      this._gestureID = 0;
      this._hasLiveAction = false;
      return;   // no need requestAnimationFrame;
    }

    requestAnimationFrame(this.animateFrame);
  } 

}

const gestures = {
  init: (testRunner, testOverlay) => {
    gesturesInst = new Gestures(testRunner, testOverlay);
    return gesturesInst;
  },
  action: (actions) => {
    return gesturesInst.action(actions);
  },
  textInput: (actions) => {
    return gesturesInst.textInput(actions);
  },
  press: (x, y) => {
    return gesturesInst.press(x, y);
  },
};

export default gestures;
