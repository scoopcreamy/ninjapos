/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2838379934")

  // add field
  collection.fields.addAt(2, new Field({
    "hidden": false,
    "id": "number286003935",
    "max": null,
    "min": null,
    "name": "redemption_ratio",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "number503525242",
    "max": null,
    "min": null,
    "name": "punch_min_purchase",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2838379934")

  // remove field
  collection.fields.removeById("number286003935")

  // remove field
  collection.fields.removeById("number503525242")

  return app.save(collection)
})
