/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const collection = app.findCollectionByNameOrId("orders")

    // add field
    collection.fields.add(new Field({
        "hidden": false,
        "id": "date_order_new_123", /* random ID */
        "name": "order_date",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "date"
    }))

    return app.save(collection)
}, (app) => {
    const collection = app.findCollectionByNameOrId("orders")

    // remove field
    collection.fields.removeByName("order_date")

    return app.save(collection)
})
