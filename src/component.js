/* eslint-disable no-underscore-dangle */
let tester = null;


class Component {
  constructor() {
    this._matcher = {};
    this._options = {};
    this.byId.bind(this);
    this.waitForExist.bind(this);
    this.waitForVisible.bind(this);
    this.requireVisibility.bind(this);
    this.press.bind(this);
    this.propCallback.bind(this);
    this.scrollTo.bind(this);
    this.scrollToEnd.bind(this);
    this.scrollToSee.bind(this);
  }

  byId(id) {
    if (!id || id === '') {
      throw new Error('Empty component byId');
    }
    if (this._matcher.byId) {
      throw new Error("Can't set multiple byId");
    }
    this._matcher.byId = id;
    return this;
  }


  waitForExist(ms) {
    this._matcher.waitTime = ms;
    return this;
  }

  waitForVisible(ms) {
    this._options.waitVisibility = ms;
    return this;
  }

  waitInteraction(ms) {
    this._options.interactionWait = ms;
    return this;
  }

  requireVisibility(percentage) {
    this._options.visibility = percentage;
    return this;
  }

  hasProps(propName) {
    this._matcher.hasProps = propName;
    return this;
  }

  checkMatcher() {
    if (!this._matcher.byId && !this._matcher.byType) {
      throw new Error('Component matcher not defined');
    }
  }

  getMatcher() {
    this.checkMatcher();
    return this._matcher;
  }

  async scrollTo(params = {}) {
    this.checkMatcher();
    const data = {
      matcher: this._matcher,
      command: 'scrollTo',
      params,
    };
    return tester.exec('component', data);
  }

  async scrollToSee(component, options = {}) {
    this.checkMatcher();
    const data = {
      matcher: this._matcher,
      command: 'scrollToSee',
      childMatcher: component.getMatcher(),
      options,
    };
    return tester.exec('component', data);
  }

  async scrollToEnd(params = {}) {
    this.checkMatcher();
    const data = {
      matcher: this._matcher,
      command: 'scrollToEnd',
      params,
    };
    return tester.exec('component', data);
  }

  async propCallback(funcName, params = []) {
    this.checkMatcher();
    this._matcher.hasProps = funcName;
    const data = {
      matcher: this._matcher,
      command: 'propCallback',
      funcName,
      params,
    };
    return tester.exec('component', data);
  }

  async fillIn(content, options = {}) {
    this.checkMatcher();
    this._matcher.hasProps = 'onChangeText';
    if (!this._matcher.byType) {
      this._matcher.byType = 'TextInput';
    }
    const data = {
      matcher: this._matcher,
      options: Object.assign(this._options, options),
      command: 'fillIn',
      content,
    };
    return tester.exec('component', data);
  }

  async press(options = {}) {
    this.checkMatcher();
    this._matcher.hasProps = 'onPress';
    const data = {
      matcher: this._matcher,
      options: Object.assign(this._options, options),
      command: 'press',
    };
    return tester.exec('component', data);
  }

  async exists() {
    this.checkMatcher();
    if (typeof this._matcher.waitTime !== 'number') {
      this._matcher.waitTime = 0;
    }
    const data = {
      matcher: this._matcher,
      options: this._options,
      command: 'exists',
    };
    return tester.exec('component', data);
  }

  async visible() {
    this.checkMatcher();
    const data = {
      matcher: this._matcher,
      options: this._options,
      command: 'visible',
    };
    return tester.exec('component', data);
  }
}


const componentConstructor = {
  init(_tester) {
    tester = _tester;
    return componentConstructor;
  },
  byId(id) {
    return (new Component()).byId(id);
  },
  byType(typeName) {
    return (new Component()).byType(typeName);
  },
  atIndex(idx) {
    return (new Component()).atIndex(idx);
  }
};


module.exports = componentConstructor;
