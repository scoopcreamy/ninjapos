/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const collection = app.findCollectionByNameOrId("expenses");

    collection.fields.add(new Field({
        "name": "description",
        "type": "text",
        "required": false,
        "presentable": false,
        "system": false,
        "unique": false,
        "options": {
            "min": null,
            "max": null,
            "pattern": ""
        }
    }));

    return app.save(collection);
}, (app) => {
    const collection = app.findCollectionByNameOrId("expenses");

    collection.fields.removeByName("description");

    return app.save(collection);
})
