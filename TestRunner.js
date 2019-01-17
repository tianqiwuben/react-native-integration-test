import React, { Component } from 'react';
import { 
  View, 
} from 'react-native';
import TestHook from './src/TestHook';
import TestOverlay from './src/TestOverlay';
import Tester from './src/Tester';

class TestRunner extends Component {
  constructor(props) {
    super(props);
  }
  componentDidMount() {
    this.tester = Tester.init(this.props.config);
    TestHook.hook('IntegrationTestRunner')(this);
  }
  componentWillUnmount(){
    TestHook.hook('IntegrationTestRunner')();
  }

  render() {
    return(
      <View style={{position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'transparent'}}>
        {this.props.children}
        <TestOverlay />
      </View>
    )
  }
}

module.exports = TestRunner;

