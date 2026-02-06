import PocketBase from 'pocketbase';

// Use environment variable or default to localhost
const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090');

export default pb;
