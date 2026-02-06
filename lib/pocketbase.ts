import PocketBase from 'pocketbase';

// Use environment variable or default to localhost
let url = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090';

// Ensure the URL has a protocol to prevent relative path malformation
if (url && !url.startsWith('http')) {
    url = `https://${url}`;
}

const pb = new PocketBase(url);

export default pb;
