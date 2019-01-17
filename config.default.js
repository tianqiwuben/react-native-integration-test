const defaultConfig = {
  verbose: false, 

  allowDeviceDisconnet: false,

  port: 8083,

  waitTime: 2000,

  pauseAfterPress: 0,

  visibilityThreshold: 100,

  deviceTimeout: 5000,
  
  hostConfig: {
    testHost: 'localhost',

    port: 8083,

    options: {}
  },


}

module.exports = defaultConfig;