/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3527180448")

  // add field
  collection.fields.addAt(6, new Field({
    "hidden": false,
    "id": "number4149776703",
    "max": null,
    "min": null,
    "name": "tendered_amount",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(7, new Field({
    "hidden": false,
    "id": "number2257624530",
    "max": null,
    "min": null,
    "name": "change_amount",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(8, new Field({
    "hidden": false,
    "id": "number3262847721",
    "max": null,
    "min": null,
    "name": "tax_amount",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(9, new Field({
    "hidden": false,
    "id": "number3278057665",
    "max": null,
    "min": null,
    "name": "tax_rate",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(10, new Field({
    "hidden": false,
    "id": "number3772865661",
    "max": null,
    "min": null,
    "name": "discount_amount",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(11, new Field({
    "hidden": false,
    "id": "number1447246150",
    "max": null,
    "min": null,
    "name": "points_redeemed",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3527180448")

  // remove field
  collection.fields.removeById("number4149776703")

  // remove field
  collection.fields.removeById("number2257624530")

  // remove field
  collection.fields.removeById("number3262847721")

  // remove field
  collection.fields.removeById("number3278057665")

  // remove field
  collection.fields.removeById("number3772865661")

  // remove field
  collection.fields.removeById("number1447246150")

  return app.save(collection)
})
