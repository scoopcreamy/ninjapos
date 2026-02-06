import PocketBase from 'pocketbase';

// Since this is a standalone script, we need 'cross-fetch' or similar if node < 18, 
// but modern node has fetch.
// We'll assume the user runs this with a recent node or we install dependency if needed.
// However, to keep it simple, we'll try to use the same lib/pocketbase.ts if possible? 
// No, that's strictly frontend/Next.js environment usually (process.env).

// Let's make a standalone script.
const pb = new PocketBase('http://127.0.0.1:8090');

const products = [
    {
        name: "Ninja Beef Burger",
        price: 15.90,
        category: "burgers",
        is_available: true,
        // we can skip image upload for now or use URL if schema supported it. 
        // Schema was 'file', so we can't easily put a URL. 
        // We will just put the data without images for now, or assume placeholder.
    },
    {
        name: "Samurai Chicken",
        price: 12.50,
        category: "burgers",
        is_available: true,
    },
    {
        name: "Shuriken Fries",
        price: 6.00,
        category: "sides",
        is_available: true,
    },
    {
        name: "Matcha Latte",
        price: 9.00,
        category: "drinks",
        is_available: true,
    },
    {
        name: "Cola Zero",
        price: 3.50,
        category: "drinks",
        is_available: true,
    },
    {
        name: "Mochi Ice Cream",
        price: 8.00,
        category: "desserts",
        is_available: true,
    }
];

async function seed() {
    try {
        // Authenticate as admin first to write data
        // In a real script we'd ask for env vars.
        // For this dev environment, let's try to create an admin or assume one exists?
        // Or we can just enable public create rules.
        // The best way for dev is to use the superuser we might have printed in logs? 
        // Wait, we didn't save the random password.

        // Alternative: we can use a migration (JS) to seed data! 
        // That is cleaner and runs on server start.
        console.log("Use migration to seed data instead.");
    } catch (e) {
        console.error(e);
    }
}

seed();
