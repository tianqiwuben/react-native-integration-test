import React, { Component } from 'react';
import { 
  View, 
  Animated,
  PanResponder,
} from 'react-native';
import PressTrack from './PressTrack';

const pressSize = 25;

class TestOverlay extends Component {
  constructor(props) {
    super(props);
    this.state = {
      pressCount: 0,
    }
    this._pressPoints = {};
  }
  componentDidMount() {
    if(this.props.setRef) {
      this.props.setRef(this);
    }
  }

  componentWillUnmount() {
    if(this.props.setRef){
      this.props.setRef();
    }
  }

  setTrackRef = (key, ref) => {
    if(this._pressPoints[key]) {
      this._pressPoints[key].ref = ref
    }
  }

  pressAt = (x,y) => {
    const pressID = this.state.pressCount;
    this._pressPoints[pressID] = {
      id: pressID,
      x: x,
      y: y,
    };
    this.setState({
      pressCount: pressID + 1,
    })
  }

  pressFinished = async (trackID) => {
    if(this._pressPoints[trackID].ref) {
      await this._pressPoints[trackID].ref.release();
    }
    delete this._pressPoints[trackID];
    this.forceUpdate();
  }

  startTrack = (x, y) => {
    const trackID = this.state.pressCount;
    this._pressPoints[trackID] = {
      key: trackID,
      x: x,
      y: y,
    };
    this.setState({
      pressCount: trackID + 1,
    })
    return trackID;
  }

  moveTrack = (trackID, x, y) => {
    this._pressPoints[trackID].x = x;
    this._pressPoints[trackID].y = y;
    this.forceUpdate();
  }

  render() {
    return(
      <View style={{position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'transparent'}} pointerEvents={'none'}>
        {
          Object.keys(this._pressPoints).map((key) => 
            <PressTrack
              key={key}
              pressID={this._pressPoints[key].id}
              x={this._pressPoints[key].x}
              y={this._pressPoints[key].y}
              ref={(ref) => this.setTrackRef(key, ref)}

            />
          )
        }
      </View>
    )
  }
}

export default TestOverlay;