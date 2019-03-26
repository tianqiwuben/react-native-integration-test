const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;

class TestStore {
  
  constructor() {

    this._testExtends = {};
    this._nodesByName = {};
    this._nodesByTestId = {};
    this._nodes = {};
    this._waitTime = 2000;
    if(hook) {
      hook.on('react-devtools', this.attachToDevtools);
      // if devtools is already started
      if (hook.reactDevtoolsAgent) {
        this.attachToDevtools(hook.reactDevtoolsAgent);
      }
    }
  }

  attachToDevtools = (agent) => {
    this._agent = agent;
    agent.sub('mount', this.onMountData);
    agent.sub('unmount', this.onUnmountData);
  }

  testExtend = (funcName, r) => {
    this._testExtends[funcName] = r;
  }

  getTestExtend = (funcName) => {
    return this._testExtends[funcName];
  }

  setWaitTime = (waitTime = 2000) => {
    this._waitTime = waitTime;
  }

  onMountData = (data) => {
    this._nodes[data.id] = data;
    if(data.name) {
      this._nodesByName[data.name] = this._nodesByName[data.name] || {};
      this._nodesByName[data.name][data.id] = data;
    }
    if(data.props && data.props.testID) {
      this._nodesByTestId[data.props.testID] = this._nodesByTestId[data.props.testID] || {};
      this._nodesByTestId[data.props.testID][data.id] = data;
    }
  }

  getRoot = () => {
    return this._nodes[this._rootID];
  }

  onUnmountData = (nodeID) => {
    const data = this._nodes[nodeID];
    if(!data) {
      return;
    }
    if(data.name && this._nodesByName[data.name]) {
      delete this._nodesByName[data.name][data.id];
    }
    if(data.props && data.props.testID && this._nodesByTestId[data.props.testID]) {
      delete this._nodesByTestId[data.props.testID][data.id];
    }
    delete this._nodes[nodeID];
  }

  findComponent = (matcher, checkExist = false) => {
    const waitTime = typeof matcher.waitTime === 'number' ? matcher.waitTime : this._waitTime;
    let component = this._findInStore(matcher, checkExist);
    if(component) {
      return Promise.resolve(component);
    }
    const notFound = new Error(`Can't find component with matcher ${JSON.stringify(matcher)}.`)
    if(waitTime == 0) {
      if(checkExist) {
        return 0;
      }
      throw notFound;
    }
    let promise = new Promise((resolve, reject) => {
      let startTime = Date.now();
      let loop = setInterval(() => {
        try {
          component = this._findInStore(matcher, checkExist);
        } catch(e) {
          clearInterval(loop);
          return reject(e);
        }
        if (component) {
          clearInterval(loop);
          return resolve(component);
        } else {
          if (Date.now() - startTime >= waitTime) {
            clearInterval(loop);
            if(checkExist) {
              return resolve(0);
            }
            return reject(notFound);
          }
        }
      }, 25);
    });

    return promise;
  }



  _findInStore = (matcher, checkExist) => {
    const byId = matcher.byId;
    const byType = matcher.byType;
    const atIndex = matcher.atIndex;
    const hasProps = matcher.hasProps;
    let nodeList = [];

    if(byId) {
      const curNodes = this._nodesByTestId[byId];
      if(!curNodes) {
        return null;
      }
      for(let nodeId in curNodes) {
        const component = curNodes[nodeId];
        if(byType) {
          if(component.name === byType) {
            nodeList.push(component);
          }
        } else {
          nodeList.push(component);
        }
      }
    } else if(byType) {
      const curNodes = this._nodesByName[byType];
      if(!curNodes) {
        return null;
      }
      for(let nodeId in curNodes) {
        nodeList.push(curNodes[nodeId]);
      }
    }

    const childrenList = [];
    for(let i in nodeList) {
      if(nodeList[i].children && nodeList[i].children.length > 0) {
        for(let j in nodeList[i].children){
          childrenList.push(nodeList[i].children[j]);
        }
      }
    }
    nodeList = nodeList.filter((node) => {
      if(!node.publicInstance) {
        return false;
      }
      if(hasProps && !(node.props && node.props.hasOwnProperty(hasProps))) {
        return false;
      }
      return true;
    });

    if(nodeList.length == 0) {
      return null;
    } else {
      if(checkExist){
        return nodeList.length;
      }
      if(atIndex) {
        if(nodeList.length < atIndex + 1) {
          throw new Error(`No matching component found at index ${atIndex} out of number found ${nodeList.length}. Matcher: ${JSON.stringify(matcher)}`);
        }
        return nodeList[atIndex];
      } 
      if(nodeList.length > 1) {
        const rescueComponent = nodeList[0];
        if(childrenList.length > 0) {
          nodeList = nodeList.filter((node) => {
            return childrenList.indexOf(node.id) != -1;
          })
        }
        if(nodeList.length == 0) {
          nodeList.push(rescueComponent);
        }

        if(nodeList.length > 1) {
          let errInfo = [];
          nodeList.forEach((node) => {
            errInfo.push({name: node.name, type: node.nodeType});
          })
          throw new Error(`There're ${nodeList.length} components found. Matcher: ${JSON.stringify(matcher)} ${JSON.stringify(errInfo)}`);
        }
      }
      return nodeList[0];
    }
  }

  noRecursiveStringify = (obj, options={}) => {
    if(!obj) {
      return obj;
    }
    let cache = [];
    let reg = null;
    if(options.ignoreKey) {
      reg = new RegExp("/"+options.ignoreKey+"/i");
    }

    let pt = JSON.stringify(obj, function(key, value) {
      if(reg && key.test(reg)) {
        return
      }
      if (typeof value === 'object' && value !== null) {
        let dupIdx = cache.indexOf(value);
        if (dupIdx !== -1) {
          // Duplicate reference found
          try {
              // If this value does not reference a parent it can be deduped
            return JSON.parse(JSON.stringify(value));
          } catch (error) {
              // discard key if value cannot be deduped
            return {[key]: dupIdx};
          }
        }
        // Store value in our collection
        cache.push(value);
      }
      return value;
    });
    return JSON.parse(pt);
  }
    

}

const testStore = new TestStore();

module.exports = testStore;