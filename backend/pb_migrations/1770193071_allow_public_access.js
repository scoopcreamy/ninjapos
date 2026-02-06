/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const products = app.findCollectionByNameOrId("products");
  products.listRule = "";
  products.viewRule = "";
  app.save(products);

  const orders = app.findCollectionByNameOrId("orders");
  orders.listRule = ""; // View all orders for now (Kitchen need to see)
  orders.viewRule = "";
  orders.createRule = ""; // Public create
  orders.updateRule = "";
  app.save(orders);

  const orderItems = app.findCollectionByNameOrId("order_items");
  orderItems.listRule = "";
  orderItems.viewRule = "";
  orderItems.createRule = "";
  app.save(orderItems);

  // Expenses also?
  try {
    const expenses = app.findCollectionByNameOrId("expenses");
    expenses.listRule = "";
    expenses.viewRule = "";
    expenses.createRule = "";
    app.save(expenses);
  } catch (e) { }

}, (app) => {
  // down logic... revert to null
})
