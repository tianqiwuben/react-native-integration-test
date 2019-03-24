const defaultConfig = require('./config.default');
const WebSocket = require('ws');
const Device = require('./src/device');
const Tester = require('./src/tester');
const Component = require('./src/component')
let tester = null;

const RNIT = {
  init: async (config = {}) => {
    global.device = new Device();
    tester = new Tester(Object.assign(defaultConfig, config));
    global.component = Component.init(tester);
  },
}



module.exports = RNIT;
