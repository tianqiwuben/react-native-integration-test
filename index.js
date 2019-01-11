import TestHook from './src/TestHook';
import TestOverlay from './src/TestOverlay';
import Tester from './src/Tester';

const IntegrationTest = {
  TestOverlay,
  Tester,
  refHook: TestHook.hook,
};

module.exports = IntegrationTest;
