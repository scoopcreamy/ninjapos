/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const collection = app.findCollectionByNameOrId("users");

    // Clean up if exists
    try {
        const record = app.findFirstRecordByData("users", "email", "owner@ninjapos.com");
        app.delete(record);
    } catch (e) { }

    const record = new Record(collection);

    record.set("email", "owner@ninjapos.com");
    record.setPassword("password123");
    record.set("name", "POS Owner");
    record.set("role", "admin");
    record.set("verified", true);

    app.save(record);
}, (app) => {
    try {
        const record = app.findFirstRecordByData("users", "email", "owner@ninjapos.com");
        app.delete(record);
    } catch (e) { }
})
