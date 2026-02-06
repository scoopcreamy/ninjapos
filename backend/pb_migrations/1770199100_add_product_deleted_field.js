/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const collection = app.findCollectionByNameOrId("products");

    // Add 'deleted' field for soft deletion
    const field = new BoolField({
        name: "deleted",
        present: false,
    });

    collection.fields.add(field);
    app.save(collection);
}, (app) => {
    const collection = app.findCollectionByNameOrId("products");
    collection.fields.removeByName("deleted");
    app.save(collection);
})
