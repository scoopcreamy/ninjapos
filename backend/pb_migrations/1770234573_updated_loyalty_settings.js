/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2838379934")

  // add field
  collection.fields.addAt(6, new Field({
    "hidden": false,
    "id": "number1218228450",
    "max": 100,
    "min": 0,
    "name": "tax_percentage",
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
  collection.fields.removeById("number1218228450")

  return app.save(collection)
})
