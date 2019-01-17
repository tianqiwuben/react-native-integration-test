import TestHook from './src/TestHook';
import Tester from './src/Tester';

const IntegrationTest = {
  refHook: TestHook.hook,
  testExtend: Tester.extend,
};

module.exports = IntegrationTest;
