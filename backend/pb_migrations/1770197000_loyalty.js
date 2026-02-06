/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    // 1. LOYALTY SETTINGS (Singleton-ish)
    const loyaltySettings = new Collection({
        name: "loyalty_settings",
        type: "base",
        listRule: "", // Public read
        viewRule: "",
        updateRule: "", // Admin only or auth
    });
    loyaltySettings.fields.add(new NumberField({ name: "points_ratio", required: true })); // e.g., 1 (RM1 = 1 point)
    loyaltySettings.fields.add(new NumberField({ name: "punch_target", required: true })); // e.g., 10
    loyaltySettings.fields.add(new TextField({ name: "punch_reward_name" })); // e.g., "Free Coffee"
    app.save(loyaltySettings);

    // Seed default settings
    const defaultSettings = new Record(loyaltySettings);
    defaultSettings.load({
        points_ratio: 1,
        punch_target: 10,
        punch_reward_name: "Free Drink"
    });
    app.save(defaultSettings);

    // 2. CUSTOMER PUNCH CARDS
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

}, (app) => {
    // down
})
