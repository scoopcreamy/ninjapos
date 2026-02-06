/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // 1. DELETE BROKEN COLLECTIONS
  try { app.delete(app.findCollectionByNameOrId("order_items")); } catch (e) { }
  try { app.delete(app.findCollectionByNameOrId("orders")); } catch (e) { }
  try { app.delete(app.findCollectionByNameOrId("products")); } catch (e) { }

  // 2. CREATE PRODUCTS
  const products = new Collection({
    name: "products",
    type: "base",
    listRule: "", // Public
    viewRule: "", // Public
  });
  products.fields.add(new TextField({ name: "name", required: true }));
  products.fields.add(new NumberField({ name: "price", required: true }));
  products.fields.add(new TextField({ name: "category" })); // Use text for simple category for now
  products.fields.add(new FileField({ name: "image", mimeTypes: ["image/jpeg", "image/png", "image/webp"] }));
  products.fields.add(new BoolField({ name: "is_available" }));

  app.save(products);

  // 3. CREATE ORDERS
  const orders = new Collection({
    name: "orders",
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: "", // Public create
    updateRule: "",
  });
  orders.fields.add(new NumberField({ name: "total_amount" }));
  orders.fields.add(new TextField({ name: "status" })); // new, cooking, ready
  orders.fields.add(new TextField({ name: "payment_method" }));
  orders.fields.add(new TextField({ name: "order_type" }));
  // Relation to Staff?
  // orders.fields.add(new RelationField({name: "staff_id", collectionId: "_pb_users_auth_", maxSelect: 1}));

  app.save(orders);

  // 4. CREATE ORDER_ITEMS
  const orderItems = new Collection({
    name: "order_items",
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: "",
  });
  // Note: For RelationField, assuming we can pass collection NAME or we need ID.
  // Safest is to fetch the collection we just saved to get its ID.
  const productsCol = app.findCollectionByNameOrId("products");
  const ordersCol = app.findCollectionByNameOrId("orders");

  orderItems.fields.add(new RelationField({
    name: "order_id",
    collectionId: ordersCol.id,
    required: true,
    maxSelect: 1,
    cascadeDelete: true
  }));
  orderItems.fields.add(new RelationField({
    name: "product_id",
    collectionId: productsCol.id,
    required: true,
    maxSelect: 1
  }));
  orderItems.fields.add(new NumberField({ name: "quantity", required: true }));
  orderItems.fields.add(new NumberField({ name: "price_at_time", required: true }));

  app.save(orderItems);

  // 5. SEED PRODUCTS
  const data = [
    { name: "Ninja Beef Burger", price: 15.90, category: "burgers", is_available: true },
    { name: "Samurai Chicken", price: 12.50, category: "burgers", is_available: true },
    { name: "Shuriken Fries", price: 6.00, category: "sides", is_available: true },
    { name: "Matcha Latte", price: 9.00, category: "drinks", is_available: true },
    { name: "Cola Zero", price: 3.50, category: "drinks", is_available: true },
    { name: "Mochi Ice Cream", price: 8.00, category: "desserts", is_available: true }
  ];

  data.forEach((item) => {
    const record = new Record(products);
    record.load(item);
    app.save(record);
  });

}, (app) => {
  // down
})
