/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
    // 1. BRANCHES
    let branches;
    try {
        branches = app.findCollectionByNameOrId("branches");
        // Update rules if exists
        branches.listRule = "";
        branches.viewRule = "";
        app.save(branches);
    } catch (e) {
        branches = new Collection({
            name: "branches",
            type: "base",
            listRule: "",
            viewRule: "",
        });
        branches.fields.add(new TextField({ name: "name", required: true }));
        branches.fields.add(new TextField({ name: "address" }));
        app.save(branches);
    }

    // 2. EXPENSES
    try {
        const expenses = app.findCollectionByNameOrId("expenses");
        expenses.listRule = "";
        expenses.viewRule = "";
        expenses.createRule = "";
        // Check for branch_id field
        try {
            expenses.fields.add(new RelationField({ name: "branch_id", collectionId: branches.id, maxSelect: 1 }));
        } catch (e) { }
        app.save(expenses);
    } catch (e) {
        const expenses = new Collection({
            name: "expenses",
            type: "base",
            listRule: "",
            viewRule: "",
            createRule: "",
        });
        expenses.fields.add(new NumberField({ name: "amount", required: true }));
        expenses.fields.add(new TextField({ name: "category", required: true }));
        expenses.fields.add(new TextField({ name: "description" }));
        expenses.fields.add(new DateTimeField({ name: "date" }));
        expenses.fields.add(new FileField({ name: "receipt_image" }));
        expenses.fields.add(new RelationField({ name: "branch_id", collectionId: branches.id, maxSelect: 1 }));
        app.save(expenses);
    }

    // 3. USERS
    const users = app.findCollectionByNameOrId("users");
    // Defensive add fields
    try { users.fields.add(new TextField({ name: "role" })); } catch (e) { }
    try { users.fields.add(new RelationField({ name: "branch_id", collectionId: branches.id, maxSelect: 1 })); } catch (e) { }
    app.save(users);

}, (app) => {
    // down
})
