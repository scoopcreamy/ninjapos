/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    // 1. Branches Collection
    try {
        app.findCollectionByNameOrId("branches");
    } catch (e) {
        const branches = new Collection({
            name: "branches",
            type: "base",
            schema: [
                { name: "name", type: "text", required: true },
                { name: "address", type: "text" },
                { name: "settings", type: "json" },
            ],
        });
        app.save(branches);
    }

    // 3. Products
    try {
        app.findCollectionByNameOrId("products");
    } catch (e) {
        const products = new Collection({
            name: "products",
            type: "base",
            schema: [
                { name: "name", type: "text", required: true },
                { name: "price", type: "number", required: true },
                { name: "category", type: "select", options: { values: ["burgers", "drinks", "sides", "desserts", "other"] } },
                { name: "image", type: "file", options: { mimeTypes: ["image/jpeg", "image/png", "image/webp"] } },
                { name: "is_available", type: "bool", options: {} },
            ],
        });
        app.save(products); // app.saveCollection was renamed to app.save() for collections in some contexts? or app.save(collection) works.
        // actually typically app.save(collection)
    }

    // 4. Orders
    try {
        app.findCollectionByNameOrId("orders");
    } catch (e) {
        const orders = new Collection({
            name: "orders",
            type: "base",
            schema: [
                { name: "total_amount", type: "number" },
                { name: "status", type: "select", options: { values: ["new", "cooking", "ready", "completed", "cancelled"] } },
                { name: "payment_method", type: "select", options: { values: ["cash", "qr", "credit"] } },
                { name: "order_type", type: "select", options: { values: ["dine_in", "takeaway", "delivery"] } },
                // relations
                { name: "staff_id", type: "relation", options: { collectionId: "_pb_users_auth_", cascadeDelete: false } },
            ],
        });
        app.save(orders);
    }

    // 5. Order Items
    // We need orders and products IDs to set relation options properly, 
    // but if we use name "orders" and "products" in collectionId, PocketBase resolves it? 
    // No, usually requires ID.
    // However, we can use the name if we fetch it first.

    const ordersCol = app.findCollectionByNameOrId("orders");
    const productsCol = app.findCollectionByNameOrId("products");

    try {
        app.findCollectionByNameOrId("order_items");
    } catch (e) {
        const orderItems = new Collection({
            name: "order_items",
            type: "base",
            schema: [
                { name: "order_id", type: "relation", required: true, options: { collectionId: ordersCol.id, cascadeDelete: true } },
                { name: "product_id", type: "relation", required: true, options: { collectionId: productsCol.id, cascadeDelete: false } },
                { name: "quantity", type: "number", required: true },
                { name: "price_at_time", type: "number", required: true },
                { name: "modifiers", type: "json" },
            ],
        });
        app.save(orderItems);
    }

    // 6. Expenses
    try {
        app.findCollectionByNameOrId("expenses");
    } catch (e) {
        const expenses = new Collection({
            name: "expenses",
            type: "base",
            schema: [
                { name: "amount", type: "number", required: true },
                { name: "description", type: "text" },
                { name: "category", type: "text" },
                { name: "receipt_image", type: "file", options: { mimeTypes: ["image/*"] } },
                { name: "date", type: "date" },
            ],
        });
        app.save(expenses);
    }

}, (app) => {
    try {
        const expenses = app.findCollectionByNameOrId("expenses");
        app.delete(expenses);
    } catch (_) { }
    try {
        const orderItems = app.findCollectionByNameOrId("order_items");
        app.delete(orderItems);
    } catch (_) { }
    try {
        const orders = app.findCollectionByNameOrId("orders");
        app.delete(orders);
    } catch (_) { }
    try {
        const products = app.findCollectionByNameOrId("products");
        app.delete(products);
    } catch (_) { }
    try {
        const branches = app.findCollectionByNameOrId("branches");
        app.delete(branches);
    } catch (_) { }
});
