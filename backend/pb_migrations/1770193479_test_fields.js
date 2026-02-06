/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  try {
    const col = new Collection({
      name: "test_col",
      type: "base",
    });
    col.fields.add(new TextField({ name: "title", required: true }));
    app.save(col);
  } catch (e) {
    const col = app.findCollectionByNameOrId("test_col");
    // throw e; 
    // Ignore if exists
  }
}, (app) => {
  try {
    const col = app.findCollectionByNameOrId("test_col");
    app.delete(col);
  } catch (_) { }
})
