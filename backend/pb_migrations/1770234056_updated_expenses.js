/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1691921218")

  // update field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "file564506735",
    "maxSelect": 1,
    "maxSize": 5242880,
    "mimeTypes": null,
    "name": "receipt_image",
    "presentable": false,
    "protected": false,
    "required": false,
    "system": false,
    "thumbs": null,
    "type": "file"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1691921218")

  // update field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "file564506735",
    "maxSelect": 1,
    "maxSize": 104857600,
    "mimeTypes": null,
    "name": "receipt_image",
    "presentable": false,
    "protected": false,
    "required": false,
    "system": false,
    "thumbs": null,
    "type": "file"
  }))

  return app.save(collection)
})
