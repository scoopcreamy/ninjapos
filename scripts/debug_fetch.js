const PocketBase = require('pocketbase/cjs');

async function debugFetch() {
    const pb = new PocketBase('http://127.0.0.1:8090');
    try {
        console.log("1. Fetching first record NO SORT...");
        const list1 = await pb.collection('products').getList(1, 1);
        console.log("Success! Record:", JSON.stringify(list1.items[0], null, 2));

        console.log("\n2. Fetching with sort: '-created'...");
        const list2 = await pb.collection('products').getList(1, 1, { sort: '-created' });
        console.log("Success!");

        console.log("\n3. Fetching with sort: 'name'...");
        const list3 = await pb.collection('products').getList(1, 1, { sort: 'name' });
        console.log("Success!");

    } catch (e) {
        console.error("Failed!");
        console.error("Message:", e.message);
        console.error("Data:", JSON.stringify(e.data, null, 2));
    }
}

debugFetch();
