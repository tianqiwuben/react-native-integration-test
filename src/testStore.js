/* eslint-disable no-underscore-dangle */
class TestStore {
  constructor() {
    this._testExtends = {};
    this._nodes = {};
    this._waitTime = 2000;
  }

  testExtend = (funcName, r) => {
    this._testExtends[funcName] = r;
  }

  getTestExtend = funcName => this._testExtends[funcName]

  setWaitTime = (waitTime = 2000) => {
    this._waitTime = waitTime;
  }

  refHook = (ref, nodeID) => {
    console.log('wtq nodeID', nodeID, !!ref);
    if (__DEV__) {
      if (ref) {
        if (this._nodes[nodeID]) {
          console.warn('refHook: duplicated', nodeID);
          this._nodes[nodeID].push(ref);
        } else {
          this._nodes[nodeID] = [ref];
        }
      } else {
        if (this._nodes[nodeID]) {
          this._nodes[nodeID].shift();
          if (this._nodes[nodeID].length === 0) {
            delete this._nodes[nodeID];
          }
        }
      }
    }
  }

  findComponent = (matcher, checkExist = false) => {
    const waitTime = typeof matcher.waitTime === 'number' ? matcher.waitTime : this._waitTime;
    let component = this._findInStore(matcher, checkExist);
    if (component) {
      return Promise.resolve(component);
    }
    const notFound = new Error(`Can't find component with matcher ${JSON.stringify(matcher)}.`);
    if (waitTime == 0) {
      if (checkExist) {
        return 0;
      }
      throw notFound;
    }
    const promise = new Promise((resolve, reject) => {
      const startTime = Date.now();
      const loop = setInterval(() => {
        try {
          component = this._findInStore(matcher, checkExist);
        } catch (e) {
          clearInterval(loop);
          return reject(e);
        }
        if (component) {
          clearInterval(loop);
          return resolve(component);
        }
        if (Date.now() - startTime >= waitTime) {
          clearInterval(loop);
          if (checkExist) {
            return resolve(0);
          }
          return reject(notFound);
        }
      }, 25);
    });

    return promise;
  }


  _findInStore = (matcher, checkExist) => {
    if (this._nodes[matcher.byId]) {
      if (checkExist) {
        return this._nodes[matcher.byId].length;
      }
      return this._nodes[matcher.byId][this._nodes[matcher.byId].length - 1];
    }
    return null;
  }
}

const testStore = new TestStore();

module.exports = testStore;
