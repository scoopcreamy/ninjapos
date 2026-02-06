/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("products");

  const existing = app.findAllRecords(collection);
  if (existing.length > 0) {
    return; // already seeded
  }

  const data = [
    { name: "Ninja Beef Burger", price: 15.90, category: "burgers", is_available: true },
    { name: "Samurai Chicken", price: 12.50, category: "burgers", is_available: true },
    { name: "Shuriken Fries", price: 6.00, category: "sides", is_available: true },
    { name: "Matcha Latte", price: 9.00, category: "drinks", is_available: true },
    { name: "Cola Zero", price: 3.50, category: "drinks", is_available: true },
    { name: "Mochi Ice Cream", price: 8.00, category: "desserts", is_available: true }
  ];

  data.forEach((item) => {
    const record = new Record(collection);
    record.load(item);
    app.save(record);
  });

}, (app) => {
  // down logic...
})
