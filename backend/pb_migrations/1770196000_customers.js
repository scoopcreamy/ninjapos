/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    // 1. CREATE CUSTOMERS
    const customers = new Collection({
        name: "customers",
        type: "base",
        listRule: "", // Public for POS access
        viewRule: "",
        createRule: "",
        updateRule: "",
    });
    customers.fields.add(new TextField({ name: "phone", required: true }));
    customers.fields.add(new TextField({ name: "name", required: true }));
    customers.fields.add(new NumberField({ name: "loyalty_points" }));

    // Add unique index on phone manually if needed, or via API rules later. 
    // For migration JS, unique constraint on field is not direct in v0.23 syntax helper 
    // without raw SQL, but we can assume application logic handles uniqueness or we add proper constraint later.
    // Actually, Set 'required' is good. Uniqueness is usually a schema option.

    app.save(customers);

    // 2. UPDATE ORDERS TO LINK CUSTOMER
    const orders = app.findCollectionByNameOrId("orders");
    orders.fields.add(new RelationField({
        name: "customer_id",
        collectionId: customers.id,
        maxSelect: 1
    }));
    app.save(orders);

}, (app) => {
    // down
})
