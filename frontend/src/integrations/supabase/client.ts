// This client is deprecated and replaced by Django API
// We keep a dummy implementation to prevent runtime crashes if any legacy code remains

const dummySupabase = {
    from: (table: string) => {
        console.warn(`Supabase client usage detected for table: ${table}. This should be migrated to Django API.`);
        return {
            select: () => Promise.resolve({ data: [], error: null }),
            insert: () => Promise.resolve({ data: null, error: null }),
            update: () => Promise.resolve({ data: null, error: null }),
            delete: () => Promise.resolve({ data: null, error: null }),
            upsert: () => Promise.resolve({ data: null, error: null }),
            eq: function() { return this; },
            single: function() { return Promise.resolve({ data: null, error: null }); },
            order: function() { return this; },
            limit: function() { return this; },
            maybeSingle: function() { return Promise.resolve({ data: null, error: null }); }
        };
    },
    auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signUp: () => Promise.resolve({ data: null, error: 'Auth migrated to Django' }),
        signInWithPassword: () => Promise.resolve({ data: null, error: 'Auth migrated to Django' }),
        signOut: () => Promise.resolve({ error: null }),
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    },
    storage: {
        from: (bucket: string) => ({
            upload: () => Promise.resolve({ data: null, error: 'Storage migrated to Django' }),
            getPublicUrl: (path: string) => ({ data: { publicUrl: `http://localhost:8000/media/${bucket}/${path}` } }),
            createSignedUrl: (path: string) => Promise.resolve({ data: { signedUrl: `http://localhost:8000/media/${bucket}/${path}` }, error: null }),
            list: () => Promise.resolve({ data: [], error: null }),
        })
    },
    functions: {
        invoke: (funcName: string) => {
            console.warn(`Supabase function invocation detected: ${funcName}. This should be migrated.`);
            return Promise.resolve({ data: null, error: 'Functions migrated to Django' });
        }
    },
    channel: (name: string) => ({
        on: function() { return this; },
        subscribe: function() { return this; },
        unsubscribe: () => {},
        removeChannel: () => {},
        removeAllChannels: () => {}
    }),
    removeChannel: () => {},
    removeAllChannels: () => {}
};

export const supabase = dummySupabase;
export const SUPABASE_URL = "http://localhost:8000";
export const SUPABASE_PUBLISHABLE_KEY = "mock-key";
