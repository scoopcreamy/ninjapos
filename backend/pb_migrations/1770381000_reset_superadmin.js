/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    try {
        // Try to update existing
        const record = app.findFirstRecordByData("_superusers", "email", "scoopcreamy@gmail.com");
        record.setPassword("password123");
        app.save(record);
    } catch (e) {
        // Create new if missing
        const collection = app.findCollectionByNameOrId("_superusers");
        const record = new Record(collection);
        record.set("email", "scoopcreamy@gmail.com");
        record.setPassword("password123");
        app.save(record);
    }
}, (app) => {
    // down logic (optional)
})
