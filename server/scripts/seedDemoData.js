/**
 * ==============================================================================
 * ExpenseFlow - Demo Account & Sample Data Seeder
 * ==============================================================================
 *
 * Prepares the production database with exactly one clean demo account:
 *   Name:     saran@tester
 *   Email:    saran@tester.com
 *   Password: saran@tester (hashed via bcryptjs)
 *
 * Profile:
 *   Monthly Salary: ₹70,000 (+ ₹3,500 freelance)
 *   Currency:       INR (₹)
 *   Period:         September 2026 (most recent complete calendar month)
 *                   and October 2026 active budgets
 *
 * Safety:
 *   - Atomic transaction (BEGIN ... COMMIT / ROLLBACK)
 *   - Requires --confirm flag to execute destructive reset
 *   - Fully idempotent: checks existing constraints
 * ==============================================================================
 */

import pg from "pg";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
    path: path.resolve(__dirname, "../../.env"),
});

const { Pool } = pg;

// Standard default categories
const DEFAULT_CATEGORIES = [
    { name: "Salary", type: "income" },
    { name: "Freelance", type: "income" },
    { name: "Investments", type: "income" },
    { name: "Other Income", type: "income" },
    { name: "Food", type: "expense" },
    { name: "Transport", type: "expense" },
    { name: "Shopping", type: "expense" },
    { name: "Bills", type: "expense" },
    { name: "Rent", type: "expense" },
    { name: "Entertainment", type: "expense" },
    { name: "Health", type: "expense" },
    { name: "Education", type: "expense" },
    { name: "Subscriptions", type: "expense" },
    { name: "Other", type: "expense" },
];

// Sample Transactions for September 2026
const SAMPLE_TRANSACTIONS = [
    // Income
    {
        type: "income",
        category: "Salary",
        amount: 70000.00,
        description: "Monthly Tech Corp Salary (September)",
        date: "2026-09-01",
        payment_method: "bank_transfer",
        notes: "Direct payroll deposit for September 2026",
    },
    {
        type: "income",
        category: "Freelance",
        amount: 3500.00,
        description: "Freelance Web UI Consultation",
        date: "2026-09-15",
        payment_method: "bank_transfer",
        notes: "Client project design audit payment",
    },

    // Housing
    {
        type: "expense",
        category: "Rent",
        amount: 18000.00,
        description: "Apartment Rent - September",
        date: "2026-09-02",
        payment_method: "bank_transfer",
        notes: "Paid via NEFT to landlord",
    },

    // Utilities / Bills
    {
        type: "expense",
        category: "Bills",
        amount: 2400.00,
        description: "Electricity Bill (BESCOM)",
        date: "2026-09-05",
        payment_method: "upi",
        notes: "Monthly home electricity payment",
    },
    {
        type: "expense",
        category: "Bills",
        amount: 800.00,
        description: "Society Water & Maintenance Charges",
        date: "2026-09-06",
        payment_method: "upi",
        notes: "Monthly apartment society fee",
    },
    {
        type: "expense",
        category: "Bills",
        amount: 1199.00,
        description: "High-Speed Fiber Broadband",
        date: "2026-09-08",
        payment_method: "upi",
        notes: "300 Mbps fiber plan",
    },
    {
        type: "expense",
        category: "Bills",
        amount: 719.00,
        description: "Mobile Prepaid Unlimited Recharge",
        date: "2026-09-10",
        payment_method: "upi",
        notes: "84-day data and calling plan",
    },

    // Food & Dining
    {
        type: "expense",
        category: "Food",
        amount: 6500.00,
        description: "Monthly Supermarket Groceries",
        date: "2026-09-04",
        payment_method: "card",
        notes: "Monthly pantry staples, oils, and grains",
    },
    {
        type: "expense",
        category: "Food",
        amount: 1850.00,
        description: "Fresh Vegetables & Farm Fruits",
        date: "2026-09-12",
        payment_method: "upi",
        notes: "Weekly fresh market produce",
    },
    {
        type: "expense",
        category: "Food",
        amount: 1200.00,
        description: "Daily Milk & Dairy Delivery",
        date: "2026-09-18",
        payment_method: "upi",
        notes: "Monthly country milk subscription",
    },
    {
        type: "expense",
        category: "Food",
        amount: 2450.00,
        description: "Weekend Dining & Cafe Bistro",
        date: "2026-09-20",
        payment_method: "card",
        notes: "Dinner with team colleagues",
    },

    // Transport
    {
        type: "expense",
        category: "Transport",
        amount: 3200.00,
        description: "Vehicle Fuel (Petrol Refill)",
        date: "2026-09-07",
        payment_method: "card",
        notes: "Full tank fuel refill",
    },
    {
        type: "expense",
        category: "Transport",
        amount: 1150.00,
        description: "Metro Commute & Cab Rides",
        date: "2026-09-16",
        payment_method: "upi",
        notes: "Metro smart card recharge & Uber rides",
    },

    // Health
    {
        type: "expense",
        category: "Health",
        amount: 1350.00,
        description: "Pharmacy Medicines & Wellness Vitamins",
        date: "2026-09-11",
        payment_method: "upi",
        notes: "Prescription refills and supplements",
    },

    // Subscriptions
    {
        type: "expense",
        category: "Subscriptions",
        amount: 1049.00,
        description: "Streaming & Cloud Subscriptions",
        date: "2026-09-09",
        payment_method: "card",
        notes: "Netflix 4K & Spotify Premium",
    },

    // Personal & Other
    {
        type: "expense",
        category: "Other",
        amount: 850.00,
        description: "Personal Grooming & Hair Care",
        date: "2026-09-14",
        payment_method: "upi",
        notes: "Monthly grooming appointment",
    },
    {
        type: "expense",
        category: "Other",
        amount: 4000.00,
        description: "Family Contribution & Support",
        date: "2026-09-15",
        payment_method: "bank_transfer",
        notes: "Monthly contribution to parents household",
    },

    // Education
    {
        type: "expense",
        category: "Education",
        amount: 1499.00,
        description: "Full-Stack System Design Course",
        date: "2026-09-22",
        payment_method: "card",
        notes: "Professional software engineering course",
    },

    // Entertainment & Shopping
    {
        type: "expense",
        category: "Entertainment",
        amount: 850.00,
        description: "Weekend Movie & Snacks",
        date: "2026-09-24",
        payment_method: "card",
        notes: "PVR Cinemas IMAX tickets",
    },
    {
        type: "expense",
        category: "Shopping",
        amount: 1950.00,
        description: "Casual Apparel & Cotton Shirts",
        date: "2026-09-26",
        payment_method: "card",
        notes: "Weekend clothing shopping",
    },
];

// Sample Budgets for September 2026
const SAMPLE_BUDGETS_SEPT = [
    { category: "Rent", amount: 18000.00, month: 9, year: 2026 },
    { category: "Food", amount: 14000.00, month: 9, year: 2026 },
    { category: "Bills", amount: 6000.00, month: 9, year: 2026 },
    { category: "Transport", amount: 5500.00, month: 9, year: 2026 },
    { category: "Health", amount: 3000.00, month: 9, year: 2026 },
    { category: "Subscriptions", amount: 1500.00, month: 9, year: 2026 },
    { category: "Entertainment", amount: 2500.00, month: 9, year: 2026 },
    { category: "Shopping", amount: 4000.00, month: 9, year: 2026 },
    { category: "Education", amount: 2000.00, month: 9, year: 2026 },
];

// Active Budgets for October 2026 (so live dashboard & budgets pages are active)
const SAMPLE_BUDGETS_OCT = [
    { category: "Rent", amount: 18000.00, month: 10, year: 2026 },
    { category: "Food", amount: 14000.00, month: 10, year: 2026 },
    { category: "Bills", amount: 6000.00, month: 10, year: 2026 },
    { category: "Transport", amount: 5500.00, month: 10, year: 2026 },
    { category: "Health", amount: 3000.00, month: 10, year: 2026 },
    { category: "Subscriptions", amount: 1500.00, month: 10, year: 2026 },
    { category: "Entertainment", amount: 2500.00, month: 10, year: 2026 },
    { category: "Shopping", amount: 4000.00, month: 10, year: 2026 },
    { category: "Education", amount: 2000.00, month: 10, year: 2026 },
];

export async function runSeeder(isConfirmed = false) {
    const poolConfig = {};

    if (process.env.DATABASE_URL) {
        poolConfig.connectionString = process.env.DATABASE_URL;
        if (
            process.env.NODE_ENV === "production" ||
            process.env.DATABASE_URL.includes("render.com") ||
            process.env.DB_SSL === "true"
        ) {
            poolConfig.ssl = { rejectUnauthorized: false };
        }
    } else {
        poolConfig.host = process.env.DB_HOST;
        poolConfig.port = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432;
        poolConfig.database = process.env.DB_NAME;
        poolConfig.user = process.env.DB_USER;
        poolConfig.password = process.env.DB_PASSWORD;

        if (
            process.env.NODE_ENV === "production" ||
            process.env.DB_SSL === "true" ||
            (process.env.DB_HOST && process.env.DB_HOST.includes("render.com"))
        ) {
            poolConfig.ssl = { rejectUnauthorized: false };
        }
    }

    const pool = new Pool(poolConfig);
    const client = await pool.connect();

    try {
        console.log("=== EXPENSEFLOW DEMO SEEDER ===");

        // 1. Current State Inspection
        const userCountRes = await client.query("SELECT COUNT(*) FROM users");
        const txCountRes = await client.query("SELECT COUNT(*) FROM transactions");
        const catCountRes = await client.query("SELECT COUNT(*) FROM categories");
        const bgCountRes = await client.query("SELECT COUNT(*) FROM budgets");

        console.log("\nCurrent Database Counts:");
        console.log(`  Users:        ${userCountRes.rows[0].count}`);
        console.log(`  Categories:   ${catCountRes.rows[0].count}`);
        console.log(`  Transactions: ${txCountRes.rows[0].count}`);
        console.log(`  Budgets:      ${bgCountRes.rows[0].count}`);

        if (!isConfirmed) {
            console.log("\n[PREVIEW MODE ONLY] Destructive reset was NOT executed.");
            console.log("Run with --confirm flag after explicit user authorization.");
            return;
        }

        // 2. Execute Reset & Seed inside a single atomic transaction
        console.log("\nExecuting atomic reset and demo data seeding...");
        await client.query("BEGIN");

        // Delete all users (cascades to all dependent records via FK CASCADE)
        await client.query("DELETE FROM users");
        console.log("  ✓ Cleared existing users and cascaded records.");

        // Hash demo password using existing bcrypt logic
        const passwordHash = await bcrypt.hash("saran@tester", 10);

        // Insert exactly one demo user
        const userRes = await client.query(
            `INSERT INTO users (name, email, password_hash)
             VALUES ($1, $2, $3)
             RETURNING id, name, email, created_at`,
            ["saran@tester", "saran@tester.com", passwordHash]
        );
        const demoUser = userRes.rows[0];
        console.log(`  ✓ Created demo user: ${demoUser.email} (ID: ${demoUser.id})`);

        // Seed default categories for this user
        for (const cat of DEFAULT_CATEGORIES) {
            await client.query(
                `INSERT INTO categories (user_id, name, type)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (user_id, name, type) DO NOTHING`,
                [demoUser.id, cat.name, cat.type]
            );
        }
        console.log(`  ✓ Seeded ${DEFAULT_CATEGORIES.length} default categories.`);

        // Seed transactions
        let totalIncome = 0;
        let totalExpenses = 0;

        for (const tx of SAMPLE_TRANSACTIONS) {
            await client.query(
                `INSERT INTO transactions 
                 (user_id, type, amount, category, description, date, payment_method, notes)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                    demoUser.id,
                    tx.type,
                    tx.amount,
                    tx.category,
                    tx.description,
                    tx.date,
                    tx.payment_method,
                    tx.notes,
                ]
            );

            if (tx.type === "income") totalIncome += tx.amount;
            if (tx.type === "expense") totalExpenses += tx.amount;
        }
        console.log(`  ✓ Inserted ${SAMPLE_TRANSACTIONS.length} transactions.`);
        console.log(`    Total Income:   ₹${totalIncome.toLocaleString("en-IN")}`);
        console.log(`    Total Expenses: ₹${totalExpenses.toLocaleString("en-IN")}`);
        console.log(`    Net Balance:    ₹${(totalIncome - totalExpenses).toLocaleString("en-IN")}`);

        // Seed September Budgets
        for (const bg of SAMPLE_BUDGETS_SEPT) {
            await client.query(
                `INSERT INTO budgets (user_id, category, amount, month, year)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (user_id, category, month, year) DO UPDATE SET amount = EXCLUDED.amount`,
                [demoUser.id, bg.category, bg.amount, bg.month, bg.year]
            );
        }

        // Seed October Budgets
        for (const bg of SAMPLE_BUDGETS_OCT) {
            await client.query(
                `INSERT INTO budgets (user_id, category, amount, month, year)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (user_id, category, month, year) DO UPDATE SET amount = EXCLUDED.amount`,
                [demoUser.id, bg.category, bg.amount, bg.month, bg.year]
            );
        }
        console.log(`  ✓ Seeded ${SAMPLE_BUDGETS_SEPT.length + SAMPLE_BUDGETS_OCT.length} monthly budgets (Sep & Oct 2026).`);

        // Initialize AI token allowance record for demo user
        await client.query(
            `INSERT INTO user_ai_usage (user_id, total_tokens_used, reserved_tokens)
             VALUES ($1, 0, 0)
             ON CONFLICT (user_id) DO NOTHING`,
            [demoUser.id]
        );
        console.log("  ✓ Initialized fresh AI token allowance (50,000 daily tokens).");

        await client.query("COMMIT");
        console.log("\n✓ Transaction committed successfully! Seeding complete.");
    } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        console.error("\n[ERROR] Seeding failed and was safely rolled back:", err.message);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith("seedDemoData.js")) {
    const isConfirmed = process.argv.includes("--confirm");
    runSeeder(isConfirmed)
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}
