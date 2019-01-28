import React, { Component } from 'react';
import { 
  View, 
  Animated,
} from 'react-native';

const animDuration = 500;
const minCircle = 20;
const maxCircle = 30;

class PressTrack extends Component {
  constructor(props) {
    super(props);
    this.state = {
      fadeAnim: new Animated.Value(1),
      circleSize: new Animated.Value(minCircle),
      margin: new Animated.Value(maxCircle - minCircle),
    }
  }

  componentDidMount() {
    if(this.props.ref) {
      this.props.ref(this);
    }
  }

  componentWillUnmount() {
    if(this.props.ref) {
      this.props.ref();
    }
  }

  release = () => {
    Animated.parallel([
      Animated.timing(
        this.state.fadeAnim,
        {
          toValue: 0,
          duration: animDuration,
        }
      ),
      Animated.timing(
        this.state.circleSize,
        {
          toValue: maxCircle,
          duration: animDuration,
        }
      ),
      Animated.timing(
        this.state.margin,
        {
          toValue: 0,
          duration: animDuration,
        }
      )
    ]).start();
    return new Promise((resolve, reject) => {
      setTimeout(() => resolve(), animDuration);
    })
  }


  render() {
    return(
      <View
        style={{
          position: 'absolute',
          left: this.props.x - maxCircle,
          top: this.props.y - maxCircle,
          width: maxCircle * 2,
          height: maxCircle * 2,
        }}
      >

        <Animated.View style={{
            position: 'absolute',
            borderRadius: this.state.circleSize,
            borderWidth: 2,
            borderColor: 'rgb(66, 134, 244)',
            backgroundColor: 'rgba(165, 199, 255, 0.5)',
            left: this.state.margin,
            right: this.state.margin,
            top: this.state.margin,
            bottom: this.state.margin,
            opacity: this.state.fadeAnim,
          }}
        />
      </View>
    )
  }
}

export default PressTrack;