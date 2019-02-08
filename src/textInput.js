const UIManager = require('react-native').NativeModules.UIManager;

class TextInput {
  constructor(actions, identifier, testRunnerNode){
    this._identifier = identifier;
    this._actions = actions;
    this._state = 0;
    this._charIdx = 0;
    this._currentTxt = '';
    this._eventCount = 0;
    this._targetID = actions.targetID;
  }

  generateEvent = () => {
    const key = this._actions.content.substring(this._charIdx, this._charIdx + 1);
    switch(this._state) {
      case 0: {
        this._state = 1;
        return {eventType: 'topKeyPress', params: {target: this._targetID, key: key, eventCount: this._eventCount}};
        break;
      }
      case 1: {
        this._state = 2;
        return {eventType: 'topTextInput', params: {
          target: this._targetID, 
          previousText: this._currentTxt,
          range: {start: this._charIdx, end: this._charIdx},
          text: key, 
          eventCount: this._eventCount,
        }};
        break;
      }
      case 2: {
        let finished = false;
        this._state = 0;
        this._currentTxt = this._currentTxt + key;
        this._eventCount += 1;
        this._charIdx += 1;
        if(this._charIdx >= this._actions.content.length) {
          finished = true;
        }
        return {eventType: 'topChange', finished, params: {
          target: this._targetID, 
          text: this._currentTxt,
          eventCount: this._eventCount,
        }};
      }
    }
  }

  getEvent = () => {
    switch(this._actions.action) {
      case 'fillIn': {
        return this.generateEvent();
        break;
      }
      default: {
        throw new Error(`Unknown text input action ${this._actions.action}`);
      }
    }
  }


}

export default TextInput;