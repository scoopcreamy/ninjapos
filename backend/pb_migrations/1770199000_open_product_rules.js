/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const products = app.findCollectionByNameOrId("products");

    // Allow everyone to create, update, and delete products
    // In production, you'd want to restrict this to admins or staff!
    products.createRule = "";
    products.updateRule = "";
    products.deleteRule = "";

    app.save(products);
}, (app) => {
    const products = app.findCollectionByNameOrId("products");
    products.createRule = null;
    products.updateRule = null;
    products.deleteRule = null;
    app.save(products);
})
