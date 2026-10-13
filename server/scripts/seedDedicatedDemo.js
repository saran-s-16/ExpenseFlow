/**
 * ==============================================================================
 * ExpenseFlow - Dedicated Demonstration Account & Sample Data Seeder
 * ==============================================================================
 *
 * Dedicated Demonstration Account:
 *   Name:     Saran Demo
 *   Email:    demo.expenseflow@example.com
 *   Password: FlowDemo@2026!Safe (Hashed via bcryptjs, salt rounds 10)
 *
 * Financial Persona:
 *   Indian salaried professional earning ₹70,000/month (+ ₹5,000 freelance)
 *   Demonstration Month: September 1–30, 2026
 *
 * Safety & Non-Destructive Guarantees:
 *   - NEVER drops tables or truncates the database.
 *   - NEVER touches, alters, or deletes ANY other user's account or data.
 *   - Strictly idempotent: checks for existing 'demo.expenseflow@example.com'.
 *   - If exists, updates only that demo user's records.
 *   - Atomic transaction (BEGIN ... COMMIT / ROLLBACK).
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

export const DEMO_CREDENTIALS = {
    name: "Saran Demo",
    email: "demo.expenseflow@example.com",
    plainPassword: "FlowDemo@2026!Safe",
};

// Standard categories
const DEFAULT_CATEGORIES = [
    { name: "Salary", type: "income" },
    { name: "Freelance", type: "income" },
    { name: "Investments", type: "income" },
    { name: "Other Income", type: "income" },
    { name: "Rent", type: "expense" },
    { name: "Groceries", type: "expense" },
    { name: "Bills", type: "expense" },
    { name: "Transport", type: "expense" },
    { name: "Food", type: "expense" },
    { name: "Shopping", type: "expense" },
    { name: "Entertainment", type: "expense" },
    { name: "Subscriptions", type: "expense" },
    { name: "Health", type: "expense" },
    { name: "Education", type: "expense" },
    { name: "Other", type: "expense" },
];

// September 2026 Transactions (₹70,000 salary + ₹5,000 freelance = ₹75,000 income, 28 expenses = ₹53,796)
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
        amount: 5000.00,
        description: "Freelance UI Consultation & API Audit",
        date: "2026-09-15",
        payment_method: "bank_transfer",
        notes: "Supplementary client consulting payment",
    },

    // Expenses - Housing
    {
        type: "expense",
        category: "Rent",
        amount: 15000.00,
        description: "Apartment Rent - September",
        date: "2026-09-02",
        payment_method: "bank_transfer",
        notes: "Monthly apartment rent paid to landlord",
    },

    // Groceries
    {
        type: "expense",
        category: "Groceries",
        amount: 3500.00,
        description: "Supermarket Monthly Pantry Restock",
        date: "2026-09-03",
        payment_method: "card",
        notes: "Grains, pulses, cooking oils, and spices",
    },
    {
        type: "expense",
        category: "Groceries",
        amount: 2100.00,
        description: "Organic Farm Vegetables & Fruits",
        date: "2026-09-13",
        payment_method: "upi",
        notes: "Weekly fresh farm produce",
    },
    {
        type: "expense",
        category: "Groceries",
        amount: 1800.00,
        description: "Dairy, A2 Milk & Bakery Staples",
        date: "2026-09-17",
        payment_method: "upi",
        notes: "Weekly milk and pantry dairy staples",
    },
    {
        type: "expense",
        category: "Groceries",
        amount: 980.00,
        description: "Weekly Fresh Vegetables & Herbs",
        date: "2026-09-28",
        payment_method: "upi",
        notes: "Fresh kitchen greens and herbs",
    },

    // Utilities / Bills
    {
        type: "expense",
        category: "Bills",
        amount: 2200.00,
        description: "Electricity Bill (BESCOM / State Board)",
        date: "2026-09-05",
        payment_method: "upi",
        notes: "Monthly residential electricity charges",
    },
    {
        type: "expense",
        category: "Bills",
        amount: 650.00,
        description: "Society Water & Maintenance Charges",
        date: "2026-09-06",
        payment_method: "upi",
        notes: "Apartment society utility maintenance",
    },
    {
        type: "expense",
        category: "Bills",
        amount: 1199.00,
        description: "High-Speed Fiber Broadband (Airtel)",
        date: "2026-09-08",
        payment_method: "upi",
        notes: "300 Mbps unlimited home fiber connection",
    },
    {
        type: "expense",
        category: "Bills",
        amount: 719.00,
        description: "Mobile 5G Unlimited Recharge (Jio)",
        date: "2026-09-10",
        payment_method: "upi",
        notes: "84-day 5G data and calling pack",
    },

    // Transport & Fuel
    {
        type: "expense",
        category: "Transport",
        amount: 2400.00,
        description: "Vehicle Fuel (Full Petrol Refill)",
        date: "2026-09-07",
        payment_method: "card",
        notes: "Full tank fuel refill",
    },
    {
        type: "expense",
        category: "Transport",
        amount: 850.00,
        description: "Metro Smartcard Recharge & Cab Rides",
        date: "2026-09-16",
        payment_method: "upi",
        notes: "Namma Metro travel card top-up and auto rides",
    },
    {
        type: "expense",
        category: "Transport",
        amount: 1200.00,
        description: "Mid-month Commute Fuel Top-up",
        date: "2026-09-23",
        payment_method: "upi",
        notes: "Commute fuel refill",
    },

    // Subscriptions & Entertainment
    {
        type: "expense",
        category: "Subscriptions",
        amount: 1199.00,
        description: "Netflix 4K & Spotify Premium Subscriptions",
        date: "2026-09-09",
        payment_method: "card",
        notes: "Monthly streaming entertainment package",
    },
    {
        type: "expense",
        category: "Entertainment",
        amount: 750.00,
        description: "PVR Cinemas IMAX Movie & Popcorn",
        date: "2026-09-24",
        payment_method: "card",
        notes: "Weekend evening movie ticket",
    },

    // Food & Dining & Snacks
    {
        type: "expense",
        category: "Food",
        amount: 1450.00,
        description: "Swiggy Gourmet Dinner Delivery",
        date: "2026-09-11",
        payment_method: "upi",
        notes: "Weekend dinner delivery",
    },
    {
        type: "expense",
        category: "Food",
        amount: 420.00,
        description: "Blue Tokai Specialty Coffee & Croissant",
        date: "2026-09-18",
        payment_method: "upi",
        notes: "Afternoon cafe meeting",
    },
    {
        type: "expense",
        category: "Food",
        amount: 1250.00,
        description: "Weekend Restaurant Bistro Dinner",
        date: "2026-09-19",
        payment_method: "card",
        notes: "Dinner with team colleagues",
    },
    {
        type: "expense",
        category: "Food",
        amount: 360.00,
        description: "Artisan Bakery & Evening Pastries",
        date: "2026-09-22",
        payment_method: "upi",
        notes: "Evening bakery snacks",
    },
    {
        type: "expense",
        category: "Food",
        amount: 890.00,
        description: "Artisan Woodfired Pizza Takeout",
        date: "2026-09-26",
        payment_method: "upi",
        notes: "Saturday dinner takeout",
    },
    {
        type: "expense",
        category: "Food",
        amount: 280.00,
        description: "Evening Chai & Snacks with Colleagues",
        date: "2026-09-29",
        payment_method: "upi",
        notes: "Quick evening team refresh",
    },

    // Health
    {
        type: "expense",
        category: "Health",
        amount: 1450.00,
        description: "Pharmacy Medicines & Wellness Supplements",
        date: "2026-09-12",
        payment_method: "upi",
        notes: "Prescriptions and daily vitamins",
    },
    {
        type: "expense",
        category: "Health",
        amount: 800.00,
        description: "Routine Dental Scaling & Consultation",
        date: "2026-09-25",
        payment_method: "upi",
        notes: "Routine dental clinic visit",
    },

    // Personal & Family
    {
        type: "expense",
        category: "Other",
        amount: 850.00,
        description: "Personal Grooming & Salon Haircut",
        date: "2026-09-14",
        payment_method: "upi",
        notes: "Monthly grooming appointment",
    },
    {
        type: "expense",
        category: "Other",
        amount: 5000.00,
        description: "Family Support Contribution",
        date: "2026-09-15",
        payment_method: "bank_transfer",
        notes: "Monthly remittance to parents household",
    },
    {
        type: "expense",
        category: "Other",
        amount: 650.00,
        description: "Personal Skin & Hair Care Essentials",
        date: "2026-09-27",
        payment_method: "upi",
        notes: "Skin and personal care items",
    },
    {
        type: "expense",
        category: "Other",
        amount: 650.00,
        description: "Household Cleaners & Home Essentials",
        date: "2026-09-30",
        payment_method: "card",
        notes: "End-of-month domestic cleaning essentials",
    },

    // Education
    {
        type: "expense",
        category: "Education",
        amount: 1999.00,
        description: "Full-Stack System Design Course (Udemy)",
        date: "2026-09-20",
        payment_method: "card",
        notes: "Advanced distributed systems engineering course",
    },

    // Shopping
    {
        type: "expense",
        category: "Shopping",
        amount: 3200.00,
        description: "Festive Apparel & Cotton Shirts (Myntra)",
        date: "2026-09-21",
        payment_method: "card",
        notes: "Festival clothing and formal wear",
    },
];

// September 2026 Budgets demonstrating ALL alert conditions
const SAMPLE_BUDGETS_SEPT = [
    { category: "Rent", amount: 15000.00, month: 9, year: 2026 },          // Spent: 15,000 (100% - At Limit)
    { category: "Groceries", amount: 7500.00, month: 9, year: 2026 },     // Spent: 8,380 (111.7% - OVER BUDGET)
    { category: "Bills", amount: 5000.00, month: 9, year: 2026 },          // Spent: 4,768 (95.4% - Warning 90%+)
    { category: "Transport", amount: 5000.00, month: 9, year: 2026 },      // Spent: 4,450 (89.0% - Warning 80%+)
    { category: "Food", amount: 4500.00, month: 9, year: 2026 },           // Spent: 4,650 (103.3% - OVER BUDGET)
    { category: "Shopping", amount: 3000.00, month: 9, year: 2026 },       // Spent: 3,200 (106.7% - OVER BUDGET)
    { category: "Health", amount: 2500.00, month: 9, year: 2026 },         // Spent: 2,250 (90.0% - Warning 90%)
    { category: "Entertainment", amount: 2500.00, month: 9, year: 2026 },  // Spent: 750 (30.0% - Under Budget)
    { category: "Subscriptions", amount: 1500.00, month: 9, year: 2026 },  // Spent: 1,199 (79.9% - Caution ~80%)
    { category: "Education", amount: 2500.00, month: 9, year: 2026 },      // Spent: 1,999 (80.0% - Caution 80%)
    { category: "Other", amount: 8000.00, month: 9, year: 2026 },          // Spent: 7,150 (89.4% - On track)
];

// October 2026 Active Budgets (Current month)
const SAMPLE_BUDGETS_OCT = [
    { category: "Rent", amount: 15000.00, month: 10, year: 2026 },
    { category: "Groceries", amount: 8000.00, month: 10, year: 2026 },
    { category: "Bills", amount: 5000.00, month: 10, year: 2026 },
    { category: "Transport", amount: 5000.00, month: 10, year: 2026 },
    { category: "Food", amount: 4500.00, month: 10, year: 2026 },
    { category: "Shopping", amount: 3500.00, month: 10, year: 2026 },
    { category: "Health", amount: 2500.00, month: 10, year: 2026 },
    { category: "Entertainment", amount: 2500.00, month: 10, year: 2026 },
    { category: "Subscriptions", amount: 1500.00, month: 10, year: 2026 },
    { category: "Education", amount: 2500.00, month: 10, year: 2026 },
    { category: "Other", amount: 8000.00, month: 10, year: 2026 },
];

// Savings Goals
const SAMPLE_SAVINGS_GOALS = [
    {
        name: "Emergency Safety Reserve",
        target_amount: 150000.00,
        current_amount: 60000.00,
        target_date: "2027-03-31",
        category: "Emergency",
        notes: "Target of 3 months living expenses reserve in high-yield liquid FD",
    },
    {
        name: "MacBook Pro M4 Pro",
        target_amount: 180000.00,
        current_amount: 85000.00,
        target_date: "2026-12-31",
        category: "Tech",
        notes: "Primary development workstation upgrade",
    },
    {
        name: "Annual Vacation to Japan",
        target_amount: 200000.00,
        current_amount: 45000.00,
        target_date: "2027-06-30",
        category: "Travel",
        notes: "10-day Tokyo and Kyoto trip fund",
    },
];

// Recurring Payments
const SAMPLE_RECURRING = [
    {
        title: "Apartment Rent",
        amount: 15000.00,
        category: "Rent",
        frequency: "monthly",
        next_due_date: "2026-11-02",
        payment_method: "bank_transfer",
        notes: "Monthly NEFT transfer to landlord account",
    },
    {
        title: "Electricity Bill (BESCOM)",
        amount: 2200.00,
        category: "Bills",
        frequency: "monthly",
        next_due_date: "2026-11-05",
        payment_method: "upi",
        notes: "State power distribution company",
    },
    {
        title: "Airtel Xstream Fiber Broadband",
        amount: 1199.00,
        category: "Bills",
        frequency: "monthly",
        next_due_date: "2026-11-08",
        payment_method: "upi",
        notes: "300 Mbps unlimited home broadband",
    },
    {
        title: "Netflix & Spotify Subscriptions",
        amount: 1199.00,
        category: "Subscriptions",
        frequency: "monthly",
        next_due_date: "2026-11-09",
        payment_method: "card",
        notes: "Auto-debit recurring entertainment subscriptions",
    },
    {
        title: "Jio 5G Unlimited Plan",
        amount: 719.00,
        category: "Bills",
        frequency: "monthly",
        next_due_date: "2026-11-10",
        payment_method: "upi",
        notes: "Primary smartphone mobile plan",
    },
];

// Stock Watchlist
const SAMPLE_WATCHLIST = [
    { symbol: "RELIANCE.NS", company_name: "Reliance Industries Ltd", exchange: "NSE" },
    { symbol: "TCS.NS", company_name: "Tata Consultancy Services Ltd", exchange: "NSE" },
    { symbol: "INFY.NS", company_name: "Infosys Ltd", exchange: "NSE" },
    { symbol: "HDFCBANK.NS", company_name: "HDFC Bank Ltd", exchange: "NSE" },
    { symbol: "ICICIBANK.NS", company_name: "ICICI Bank Ltd", exchange: "NSE" },
    { symbol: "ITC.NS", company_name: "ITC Ltd", exchange: "NSE" },
];

// Stock Transactions (Sample investment portfolio)
const SAMPLE_STOCK_TRANSACTIONS = [
    {
        symbol: "RELIANCE.NS",
        company_name: "Reliance Industries Ltd",
        transaction_type: "BUY",
        quantity: 25,
        price_per_share: 1120.00,
        brokerage_charges: 50.00,
        transaction_date: "2026-08-10",
        notes: "Initial equity holding purchase",
    },
    {
        symbol: "TCS.NS",
        company_name: "Tata Consultancy Services Ltd",
        transaction_type: "BUY",
        quantity: 15,
        price_per_share: 2150.00,
        brokerage_charges: 45.00,
        transaction_date: "2026-08-15",
        notes: "Blue-chip IT services allocation",
    },
    {
        symbol: "INFY.NS",
        company_name: "Infosys Ltd",
        transaction_type: "BUY",
        quantity: 30,
        price_per_share: 980.00,
        brokerage_charges: 35.00,
        transaction_date: "2026-08-20",
        notes: "Tech portfolio position",
    },
    {
        symbol: "HDFCBANK.NS",
        company_name: "HDFC Bank Ltd",
        transaction_type: "BUY",
        quantity: 40,
        price_per_share: 680.00,
        brokerage_charges: 40.00,
        transaction_date: "2026-09-05",
        notes: "Private banking sector core holding",
    },
];

export async function runDedicatedSeeder() {
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
        poolConfig.host = process.env.DB_HOST || "localhost";
        poolConfig.port = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432;
        poolConfig.database = process.env.DB_NAME || "expense_tracker";
        poolConfig.user = process.env.DB_USER || "postgres";
        poolConfig.password = process.env.DB_PASSWORD;
    }

    const pool = new Pool(poolConfig);
    const client = await pool.connect();

    try {
        console.log("=================================================");
        console.log("  ExpenseFlow Dedicated Demo Account Seeder      ");
        console.log("=================================================");
        console.log(`Target Email: ${DEMO_CREDENTIALS.email}`);
        console.log("CRITICAL SAFETY RULE: Only demo account data will be modified.");
        console.log("All other users and records are strictly preserved.");

        await client.query("BEGIN");

        // 1. Hash password with bcryptjs (salt rounds 10)
        const passwordHash = await bcrypt.hash(DEMO_CREDENTIALS.plainPassword, 10);

        // 2. Find or create demo user
        const existingUserRes = await client.query(
            "SELECT id, email FROM users WHERE LOWER(email) = LOWER($1)",
            [DEMO_CREDENTIALS.email]
        );

        let demoUserId;
        if (existingUserRes.rowCount > 0) {
            demoUserId = existingUserRes.rows[0].id;
            console.log(`\nFound existing demo user ID: ${demoUserId}. Refreshing credentials and data...`);
            await client.query(
                "UPDATE users SET name = $1, password_hash = $2, updated_at = NOW() WHERE id = $3",
                [DEMO_CREDENTIALS.name, passwordHash, demoUserId]
            );
        } else {
            console.log("\nCreating new demo user record...");
            const insertUserRes = await client.query(
                `INSERT INTO users (name, email, password_hash)
                 VALUES ($1, $2, $3)
                 RETURNING id`,
                [DEMO_CREDENTIALS.name, DEMO_CREDENTIALS.email, passwordHash]
            );
            demoUserId = insertUserRes.rows[0].id;
            console.log(`✓ Created demo user ID: ${demoUserId}`);
        }

        // 3. Clear only this demo user's records (NEVER touching any other user)
        console.log(`\nClearing previous demo records for user ID ${demoUserId}...`);
        await client.query("DELETE FROM transactions WHERE user_id = $1", [demoUserId]);
        await client.query("DELETE FROM budgets WHERE user_id = $1", [demoUserId]);
        await client.query("DELETE FROM categories WHERE user_id = $1", [demoUserId]);
        await client.query("DELETE FROM savings_goals WHERE user_id = $1", [demoUserId]);
        await client.query("DELETE FROM recurring_payments WHERE user_id = $1", [demoUserId]);
        await client.query("DELETE FROM stock_watchlist WHERE user_id = $1", [demoUserId]);
        await client.query("DELETE FROM stock_transactions WHERE user_id = $1", [demoUserId]);
        await client.query("DELETE FROM ai_chat_messages WHERE user_id = $1", [demoUserId]);
        await client.query("DELETE FROM user_ai_daily_usage WHERE user_id = $1", [demoUserId]);
        await client.query("DELETE FROM user_ai_usage WHERE user_id = $1", [demoUserId]);
        console.log("✓ Cleared previous demo records.");

        // 4. Seed categories
        for (const cat of DEFAULT_CATEGORIES) {
            await client.query(
                `INSERT INTO categories (user_id, name, type)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (user_id, name, type) DO NOTHING`,
                [demoUserId, cat.name, cat.type]
            );
        }
        console.log(`✓ Seeded ${DEFAULT_CATEGORIES.length} categories.`);

        // 5. Seed transactions
        let totalIncome = 0;
        let totalExpenses = 0;

        for (const tx of SAMPLE_TRANSACTIONS) {
            await client.query(
                `INSERT INTO transactions
                 (user_id, type, amount, category, description, date, payment_method, notes)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                    demoUserId,
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

        const netSavings = totalIncome - totalExpenses;
        const savingsRate = Number(((netSavings / totalIncome) * 100).toFixed(1));

        console.log(`✓ Inserted ${SAMPLE_TRANSACTIONS.length} transactions for September 2026:`);
        console.log(`    Total Income:   ₹${totalIncome.toLocaleString("en-IN")}`);
        console.log(`    Total Expenses: ₹${totalExpenses.toLocaleString("en-IN")}`);
        console.log(`    Net Cash Flow:  ₹${netSavings.toLocaleString("en-IN")}`);
        console.log(`    Savings Rate:   ${savingsRate}%`);

        // 6. Seed budgets (September & October 2026)
        for (const bg of SAMPLE_BUDGETS_SEPT) {
            await client.query(
                `INSERT INTO budgets (user_id, category, amount, month, year)
                 VALUES ($1, $2, $3, $4, $5)`,
                [demoUserId, bg.category, bg.amount, bg.month, bg.year]
            );
        }
        for (const bg of SAMPLE_BUDGETS_OCT) {
            await client.query(
                `INSERT INTO budgets (user_id, category, amount, month, year)
                 VALUES ($1, $2, $3, $4, $5)`,
                [demoUserId, bg.category, bg.amount, bg.month, bg.year]
            );
        }
        console.log(`✓ Seeded ${SAMPLE_BUDGETS_SEPT.length} Sep budgets & ${SAMPLE_BUDGETS_OCT.length} Oct budgets.`);

        // 7. Seed savings goals
        for (const sg of SAMPLE_SAVINGS_GOALS) {
            await client.query(
                `INSERT INTO savings_goals (user_id, name, target_amount, current_amount, target_date, category, notes)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [demoUserId, sg.name, sg.target_amount, sg.current_amount, sg.target_date, sg.category, sg.notes]
            );
        }
        console.log(`✓ Seeded ${SAMPLE_SAVINGS_GOALS.length} savings goals.`);

        // 8. Seed recurring payments
        for (const rp of SAMPLE_RECURRING) {
            await client.query(
                `INSERT INTO recurring_payments (user_id, title, amount, category, frequency, next_due_date, payment_method, notes)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [demoUserId, rp.title, rp.amount, rp.category, rp.frequency, rp.next_due_date, rp.payment_method, rp.notes]
            );
        }
        console.log(`✓ Seeded ${SAMPLE_RECURRING.length} recurring payments.`);

        // 9. Seed stock watchlist
        for (const wl of SAMPLE_WATCHLIST) {
            await client.query(
                `INSERT INTO stock_watchlist (user_id, symbol, company_name, exchange)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (user_id, symbol) DO NOTHING`,
                [demoUserId, wl.symbol, wl.company_name, wl.exchange]
            );
        }
        console.log(`✓ Seeded ${SAMPLE_WATCHLIST.length} watchlist stocks.`);

        // 10. Seed stock transactions
        for (const st of SAMPLE_STOCK_TRANSACTIONS) {
            await client.query(
                `INSERT INTO stock_transactions (user_id, symbol, company_name, transaction_type, quantity, price_per_share, brokerage_charges, transaction_date, notes)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [demoUserId, st.symbol, st.company_name, st.transaction_type, st.quantity, st.price_per_share, st.brokerage_charges, st.transaction_date, st.notes]
            );
        }
        console.log(`✓ Seeded ${SAMPLE_STOCK_TRANSACTIONS.length} stock transactions.`);

        // 11. Initialize AI usage
        await client.query(
            `INSERT INTO user_ai_usage (user_id, total_tokens_used, reserved_tokens)
             VALUES ($1, 0, 0)
             ON CONFLICT (user_id) DO NOTHING`,
            [demoUserId]
        );
        console.log("✓ Initialized AI token allowance.");

        await client.query("COMMIT");
        console.log("\n=================================================");
        console.log("✓ DEMO SEEDING COMPLETED SUCCESSFULLY!");
        console.log("=================================================");
        console.log(`Demo Email:    ${DEMO_CREDENTIALS.email}`);
        console.log(`Demo Password: ${DEMO_CREDENTIALS.plainPassword}`);
        console.log(`Seeded Month:  September 2026 (2026-09-01 to 2026-09-30)`);
        console.log(`Total Income:  ₹${totalIncome.toLocaleString("en-IN")}`);
        console.log(`Total Expense: ₹${totalExpenses.toLocaleString("en-IN")}`);
        console.log(`Net Savings:   ₹${netSavings.toLocaleString("en-IN")}`);
        console.log(`Savings Rate:  ${savingsRate}%`);
        console.log("=================================================");

        return {
            success: true,
            demoUserId,
            totalIncome,
            totalExpenses,
            netSavings,
            savingsRate,
        };
    } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        console.error("\n[ERROR] Seeding failed and safely rolled back:", err);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith("seedDedicatedDemo.js")) {
    runDedicatedSeeder()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}
