/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const collection = app.findCollectionByNameOrId("categories");

    // Add 'name' field
    const nameField = new TextField({
        name: "name",
        required: true,
        options: {
            min: 1
        }
    });
    collection.fields.add(nameField);

    // Add 'slug' field
    const slugField = new TextField({
        name: "slug",
        required: false,
        options: {
            pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$"
        }
    });
    collection.fields.add(slugField);

    app.save(collection);
}, (app) => {
    const collection = app.findCollectionByNameOrId("categories");

    // Reverting is tricky if fields don't exist, but we try to remove
    try {
        collection.fields.removeByName("name");
        collection.fields.removeByName("slug");
        app.save(collection);
    } catch (e) { /* ignore */ }
})
