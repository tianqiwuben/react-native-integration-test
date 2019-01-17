import React, { Component } from 'react';
import { 
  View, 
  Animated,
  PanResponder,
} from 'react-native';
import TestHook from './TestHook';
import PressTrack from './PressTrack';

const pressSize = 25;

class TestOverlay extends Component {
  constructor(props) {
    super(props);
    this.state = {
      pressCount: 0,
    }
    this.pressPoints = [];
  }
  componentDidMount() {
    TestHook.hook('IntegrationTestOverlay')(this);
  }
  componentWillUnmount(){
    TestHook.hook('IntegrationTestOverlay')();
  }

  pressAt = (x,y) => {
    this.pressPoints.push({
      key: this.state.pressCount,
      x: x,
      y: y
    })
    this.setState({
      pressCount: this.state.pressCount + 1,
    })
  }

  pressFinished = (key) => {
    this.pressPoints.shift();
    this.forceUpdate();
  }

  render() {
    return(
      <View style={{position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'transparent'}} pointerEvents={'none'}>
        {
          this.pressPoints.map((point) => 
            <PressTrack
              key={point.key}
              x={point.x}
              y={point.y}
              pressFinished={this.pressFinished}
            />
          )
        }
      </View>
    )
  }
}

export default TestOverlay;