import React, { Component } from 'react';
import { 
  View, 
} from 'react-native';
import TestOverlay from './src/TestOverlay';
import Runner from './src/runner';
import Gestures from './src/gestures';

class TestRunner extends Component {
  constructor(props) {
    super(props);
  }

  setTestOverlay = (ref) => {
    this._gestures = Gestures.init(this, ref);
  }

  componentDidMount() {
    this._runner = new Runner();
  }

  render() {
    return(
      <View style={{position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'transparent'}}>
        {this.props.children}
        <TestOverlay setRef={(ref) => this.setTestOverlay(ref)}/>
      </View>
    )
  }
}

module.exports = TestRunner;

