export type Unsubscribe = () => void;

export const Realtime = {
  presenceChannel(name: string) {
    console.warn('Realtime.presenceChannel is mocked in Django migration');
    return {
      on: () => ({ subscribe: () => {} }),
      subscribe: () => {}
    };
  },

  subscribeToTable<T = any>(table: string, filter: string, cb: (payload: T) => void): Unsubscribe {
    console.warn(`Realtime.subscribeToTable (${table}) is mocked in Django migration`);
    // No-op
    return () => {};
  },

  cleanupAll() {
    // No-op
  }
};
