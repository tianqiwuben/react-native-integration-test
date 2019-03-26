let tester = null;


class Component {

  constructor() {
    this._matcher = {};
    this._options = {};
    this.byId.bind(this);
    this.byType.bind(this);
    this.atIndex.bind(this);
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
    if(!id || id === '') {
      throw new Error('Empty component byId');
    }
    if(this._matcher.byId) {
      throw new Error("Can't set multiple byId");
    }
    this._matcher.byId = id;
    return this;
  }


  byType(typeName) {
    if(!typeName || typeName === '') {
      throw new Error('Empty component typeName');
    }
    if(this._matcher.typeName) {
      throw new Error("Can't set multiple typeName");
    }
    this._matcher.byType = typeName;
    return this;
  }

  atIndex(idx) {
    if(this._matcher.atIndex) {
      throw new Error("Can't set multiple atIndex");
    }
    this._matcher.atIndex = idx;
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
    if(!this._matcher.byId && !this._matcher.byType) {
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
    }
    return await tester.exec('component', data);
  }

  async scrollToSee(component, options = {}) {
    this.checkMatcher();
    const data = {
      matcher: this._matcher,
      command: 'scrollToSee',
      childMatcher: component.getMatcher(),
      options,
    }
    return await tester.exec('component', data);
  }

  async scrollToEnd(params = {}) {
    this.checkMatcher();
    const data = {
      matcher: this._matcher,
      command: 'scrollToEnd',
      params,
    }
    return await tester.exec('component', data);
  }

  async propCallback(funcName, params = []) {
    this.checkMatcher();
    this._matcher.hasProps = funcName;
    const data = {
      matcher: this._matcher,
      command: 'propCallback',
      funcName,
      params,
    }
    return await tester.exec('component', data);
  }

  async fillIn(content, options = {}){
    this.checkMatcher();
    this._matcher.hasProps = 'onChangeText';
    if(!this._matcher.byType) {
      this._matcher.byType = 'TextInput';
    }
    const data = {
      matcher: this._matcher,
      options: Object.assign(this._options, options),
      command: 'fillIn',
      content,
    }
    return await tester.exec('component', data);
  }

  async press(options = {}) {
    this.checkMatcher();
    this._matcher.hasProps = 'onPress';
    const data = {
      matcher: this._matcher,
      options: Object.assign(this._options, options),
      command: 'press',
    }
    return await tester.exec('component', data);
  }

  async exists() {
    this.checkMatcher();
    if(typeof this._matcher.waitTime !== 'number') {
      this._matcher.waitTime = 0;
    }
    const data = {
      matcher: this._matcher,
      options: this._options,
      command: 'exists',
    }
    return await tester.exec('component', data);
  }

  async visible() {
    this.checkMatcher();
    const data = {
      matcher: this._matcher,
      options: this._options,
      command: 'visible',
    }
    return await tester.exec('component', data);
  }
}


const componentConstructor = {
  init: function(_tester) {
    tester = _tester;
    return componentConstructor;
  },
  byId: function(id) {
    return (new Component()).byId(id);
  },
  byType: function(typeName) {
    return (new Component()).byType(typeName);
  },
  atIndex: function(idx) {
    return (new Component()).atIndex(idx);
  }
}


module.exports = componentConstructor;
