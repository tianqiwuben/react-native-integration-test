const TestStore = require('./src/testStore');

const testExtends = {}


const IntegrationTest = {
  refHook: function(id, f=function(){}){
    return function(ref){f(ref)}
  },
  testExtend: TestStore.testExtend,
};

module.exports = IntegrationTest;
