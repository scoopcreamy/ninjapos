/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    const collection = app.findCollectionByNameOrId("users");

    // Check if user exists and delete it to reset
    try {
        const record = app.findFirstRecordByData("users", "email", "admin@ninjapos.com");
        app.delete(record);
    } catch (e) {
        // User doesn't exist, which is fine
    }

    const record = new Record(collection);

    record.set("email", "admin@ninjapos.com");
    record.setPassword("password123");
    record.set("name", "Admin User");
    record.set("role", "admin");
    record.set("verified", true);

    app.save(record);
}, (app) => {
    // down
    try {
        const record = app.findFirstRecordByData("users", "email", "admin@ninjapos.com");
        app.delete(record);
    } catch (e) { }
})
