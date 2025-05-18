use HeavyMachineryDB;

db.Users.insertMany([
    { id: 1, name: "أحمد محمد", email: "ahmed@example.com", phone: "966500000000", role: "customer", createdAt: new Date() },
    { id: 2, name: "سالم الدوسري", email: "salem@example.com", phone: "966511111111", role: "admin", createdAt: new Date() }
]);

db.Products.insertOne({
    id: 1,
    name: "فلتر زيت كاتربيلر",
    description: "فلتر عالي الجودة لمحركات المعدات الثقيلة",
    price: 250,
    category: "فلاتر",
    brand: "كاتربيلر",
    stock: 20,
    status: "متوفر",
    createdAt: new Date()
});
