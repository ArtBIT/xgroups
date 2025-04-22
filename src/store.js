// Store: Global state management
/**
 * A reactive state management system.
 * @returns {Object} Store API with state access and subscription
 */
export const Store = (initialState) => {
  let state = { ...initialState };
  const subscribers = new Set();

  return {
    /**
     * Gets the current state.
     * @returns {Object} Current state
     */
    getState: () => state,
    /**
     * Updates the state and notifies subscribers.
     * @param {Object} newState - Partial state to merge
     */
    setState: (newState) => {
      state = { ...state, ...newState };
      subscribers.forEach((cb) => cb(state));
    },
    /**
     * Subscribes a callback to state changes.
     * @param {Function} callback - Function to call on state change
     */
    subscribe: (callback) => {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },
  };
};

export default Store;
