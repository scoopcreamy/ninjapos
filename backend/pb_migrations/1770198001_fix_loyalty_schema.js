/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    // 1. Ensure LOYALTY SETTINGS exists
    try {
        const existing = app.findCollectionByNameOrId("loyalty_settings");
    } catch (e) {
        // Determine it doesn't exist, so create it
        const loyaltySettings = new Collection({
            name: "loyalty_settings",
            type: "base",
            listRule: "",
            viewRule: "",
            updateRule: "",
        });
        loyaltySettings.fields.add(new NumberField({ name: "points_ratio", required: true }));
        loyaltySettings.fields.add(new NumberField({ name: "punch_target", required: true }));
        loyaltySettings.fields.add(new TextField({ name: "punch_reward_name" }));
        app.save(loyaltySettings);

        // Seed
        const defaultSettings = new Record(loyaltySettings);
        defaultSettings.load({
            points_ratio: 1,
            punch_target: 10,
            punch_reward_name: "Free Drink"
        });
        app.save(defaultSettings);
    }

    // 2. Ensure CUSTOMER PUNCH CARDS exists
    try {
        const existing = app.findCollectionByNameOrId("customer_punch_cards");
    } catch (e) {
        const customers = app.findCollectionByNameOrId("customers");
        const punchCards = new Collection({
            name: "customer_punch_cards",
            type: "base",
            listRule: "",
            viewRule: "",
            createRule: "",
            updateRule: "",
        });
        punchCards.fields.add(new RelationField({
            name: "customer_id",
            collectionId: customers.id,
            maxSelect: 1,
            required: true,
            cascadeDelete: true
        }));
        punchCards.fields.add(new NumberField({ name: "current_punches" }));
        punchCards.fields.add(new NumberField({ name: "total_completed" }));
        app.save(punchCards);
    }

    // 3. Ensure CUSTOMERS has loyalty_points
    try {
        const customers = app.findCollectionByNameOrId("customers");
        if (!customers.fields.getByName("loyalty_points")) {
            customers.fields.add(new NumberField({ name: "loyalty_points" }));
            app.save(customers);
        }
    } catch (e) { /* ignore */ }

}, (app) => {
    // down
})
