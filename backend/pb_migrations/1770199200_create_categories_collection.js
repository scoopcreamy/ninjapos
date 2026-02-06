/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const collection = new Collection({
        name: "categories",
        type: "base",
        listRule: "", // public read
        viewRule: "",
        createRule: "", // public create (dev mode)
        updateRule: "",
        deleteRule: "",
        schema: [
            {
                name: "name",
                type: "text",
                required: true,
                options: {
                    min: 1,
                }
            },
            {
                name: "slug",
                type: "text",
                options: {
                    pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$"
                }
            }
        ]
    });

    app.save(collection);
}, (app) => {
    const collection = app.findCollectionByNameOrId("categories");
    app.delete(collection);
})
