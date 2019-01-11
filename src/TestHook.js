// Public: TeskHook stores component references.


class TestHook {

  constructor() {
    this.hooks = {};
  }

  // Internal: Add a new component into the store. If there is an existing
  // component with that identifier, replace it.
  //
  // identifier - String, a unique identifier for this component. To help
  //              separate out hooked components, use dot namespaces e.g.
  //              'MyScene.mycomponent'.
  // component  - Component returned by React `ref` function.
  //
  // Returns undefined.
  add = (identifier, component) => {
    this.hooks[identifier] = component;
  }

  // Internal: Remove a component from the store.
  //
  // Returns undefined.
  remove = (identifier) => {
    delete this.hooks[identifier];
  }

  // Internal: Fetch a component from the store.
  //
  // Returns the component corresponding to the provided identifier, or
  // undefined if it has not been added.
  get = (identifier) => {
    return this.hooks[identifier];
  }

  // Internal: Returns the hooks store.
  // 
  // This one should only be used by tester for reading.
  getHooks = () => {
    return this.hooks;
  }


  // Exported: Construct call backfunction for React ref.
  //
  // identifier - String
  //
  // f          - callback function for exisiting ref function.
  //
  // Returns a function that passed to React ref props, expecting React to
  // callback with ref.
  //
  // Since the ref prop is occupied by this hook function, it uses second 
  // parameter to accept user defined ref callback function.
  // 
  // Do nothing if packaged as production except for calling user defined 
  // callback function

  hook = (identifier, f = () => {}) => {
    return (component) => {
      if(process.env.NODE_ENV !== 'production') {
        if (component) {
          this.add(identifier, component);
        } else {
          this.remove(identifier);
        }
      }
      f(component);
    }
  }
}

const store = new TestHook();

export default store;