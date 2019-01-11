import TestHook from './src/TestHook';
import TestOverlay from './src/TestOverlay';
import Tester from './src/Tester';
import Device from './src/Device';

const IntegrationTest = {
  TestOverlay,
  Tester,
  refHook: TestHook.hook,
  Device,
};

module.exports = IntegrationTest;
