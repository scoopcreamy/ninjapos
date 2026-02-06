const PocketBase = require('pocketbase/cjs');

async function check() {
    const pb = new PocketBase('http://127.0.0.1:8090');
    try {
        // Authenticate (public read is enabled so strictly strictly correct for list, but admin better for debug)
        // But we allowed public read, so list should work without auth
        const records = await pb.collection('products').getFullList();
        console.log("Total products found:", records.length);
        console.log(records);
    } catch (e) {
        console.error("Error fetching products:", e);
    }
}

check();
