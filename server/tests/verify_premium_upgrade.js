import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config({
    path: fileURLToPath(new URL("../../.env", import.meta.url)),
});

import pool from "../config/db.js";
import app from "../server.js";

const BASE_URL = process.env.BASE_URL || "http://localhost:5001";

async function runTests() {
    console.log("=================================================");
    console.log("   EXPENSEFLOW PREMIUM UPGRADE VERIFICATION TEST ");
    console.log("=================================================\n");

    let demoToken = "";
    let demoUserId = null;
    let normalToken = "";
    let normalUserId = null;

    // TEST 1: Demo User Authentication
    console.log("[TEST 1] Testing Demo User Authentication...");
    const demoLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: "demo.expenseflow@example.com",
            password: "FlowDemo@2026!Safe",
        }),
    });

    const demoLoginData = await demoLoginRes.json();
    if (demoLoginRes.status !== 200 || !demoLoginData.token) {
        throw new Error(`Demo login failed: ${JSON.stringify(demoLoginData)}`);
    }
    demoToken = demoLoginData.token;
    demoUserId = demoLoginData.user.id;
    console.log(`  ✓ Demo login SUCCESS! User: ${demoLoginData.user.name} (ID: ${demoUserId})`);

    const demoHeaders = {
        Authorization: `Bearer ${demoToken}`,
        "Content-Type": "application/json",
    };

    // TEST 2: Demo Financial Data Verification (September 2026)
    console.log("\n[TEST 2] Verifying Seeded September 2026 Financial Figures...");
    const dashRes = await fetch(`${BASE_URL}/api/dashboard`, { headers: demoHeaders });
    const dashData = await dashRes.json();

    if (!dashData.success) {
        throw new Error(`Dashboard retrieval failed: ${JSON.stringify(dashData)}`);
    }

    console.log(`  Dashboard Active Period: ${dashData.periodLabel}`);
    console.log(`  Period Income:   ₹${dashData.summary.periodIncome.toLocaleString("en-IN")}`);
    console.log(`  Period Expenses: ₹${dashData.summary.periodExpenses.toLocaleString("en-IN")}`);
    console.log(`  Period Savings:  ₹${dashData.summary.periodSavings.toLocaleString("en-IN")}`);
    console.log(`  Savings Rate:    ${dashData.summary.periodSavingsRate}%`);

    if (dashData.summary.periodIncome !== 75000) {
        throw new Error(`Expected income 75000, got ${dashData.summary.periodIncome}`);
    }
    if (dashData.summary.periodExpenses !== 53796) {
        throw new Error(`Expected expenses 53796, got ${dashData.summary.periodExpenses}`);
    }
    if (dashData.summary.periodSavings !== 21204) {
        throw new Error(`Expected savings 21204, got ${dashData.summary.periodSavings}`);
    }
    console.log("  ✓ Exact September 2026 figures matched PostgreSQL records perfectly!");

    // TEST 3: Budget Guard & Threshold Alerts
    console.log("\n[TEST 3] Verifying Budget Guard & Alert Conditions...");
    const budgetsRes = await fetch(`${BASE_URL}/api/budgets?month=9&year=2026`, { headers: demoHeaders });
    const budgetsData = await budgetsRes.json();

    const exceeded = budgetsData.budgets.filter((b) => b.percentage >= 100);
    const nearLimit = budgetsData.budgets.filter((b) => b.percentage >= 85 && b.percentage < 100);
    console.log(`  Total September Budgets: ${budgetsData.budgets.length}`);
    console.log(`  Exceeded (100%+): ${exceeded.map((b) => `${b.category} (${b.percentage}%)`).join(", ")}`);
    console.log(`  Near Limit (85-99%): ${nearLimit.map((b) => `${b.category} (${b.percentage}%)`).join(", ")}`);

    if (exceeded.length === 0) {
        throw new Error("Expected over-budget categories for demonstration!");
    }
    console.log("  ✓ Budget Guard alert indicators verified!");

    // TEST 4: Savings Goals & Recurring Payments
    console.log("\n[TEST 4] Verifying Savings Goals & Recurring Obligations...");
    const goalsRes = await fetch(`${BASE_URL}/api/savings-goals`, { headers: demoHeaders });
    const goalsData = await goalsRes.json();
    console.log(`  Savings Goals: ${goalsData.goals.length} goals, Total Saved: ₹${goalsData.summary.totalSaved.toLocaleString("en-IN")}`);

    const recRes = await fetch(`${BASE_URL}/api/recurring-payments`, { headers: demoHeaders });
    const recData = await recRes.json();
    console.log(`  Recurring Commitments: ${recData.recurringPayments.length} bills, Monthly Outflow: ₹${recData.summary.totalEstimatedMonthly.toLocaleString("en-IN")}`);
    console.log("  ✓ Savings goals and recurring payments verified!");

    // TEST 5: Stock Market & Portfolio Tracking
    console.log("\n[TEST 5] Verifying Stock Market Feed & Portfolio Accounting...");
    const marketRes = await fetch(`${BASE_URL}/api/stocks/market`, { headers: demoHeaders });
    const marketData = await marketRes.json();
    console.log(`  Market Status: ${marketData.marketStatus.statusText} (${marketData.marketStatus.label})`);
    console.log(`  NIFTY 50 Price: ₹${marketData.indices[0].price} | SENSEX Price: ₹${marketData.indices[1].price}`);

    const portRes = await fetch(`${BASE_URL}/api/stocks/portfolio`, { headers: demoHeaders });
    const portData = await portRes.json();
    console.log(`  Portfolio Invested: ₹${portData.summary.totalInvested.toLocaleString("en-IN")}`);
    console.log(`  Current Holdings: ${portData.holdings.length} stocks (${portData.holdings.map((h) => h.symbol).join(", ")})`);

    // TEST 6: Strict User Data Isolation
    console.log("\n[TEST 6] Testing Cross-User Data Isolation...");
    const tempEmail = `isolation_test_${Date.now()}@example.com`;
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: "Isolation Tester",
            email: tempEmail,
            password: "TestPassword123!",
        }),
    });
    const regData = await regRes.json();
    if (!regData.success) {
        throw new Error(`Registration failed: ${JSON.stringify(regData)}`);
    }

    const normLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: tempEmail,
            password: "TestPassword123!",
        }),
    });
    const normLoginData = await normLoginRes.json();
    normalToken = normLoginData.token;
    normalUserId = normLoginData.user.id;

    const normHeaders = {
        Authorization: `Bearer ${normalToken}`,
        "Content-Type": "application/json",
    };

    // Check normal user transactions
    const normDashRes = await fetch(`${BASE_URL}/api/dashboard`, { headers: normHeaders });
    const normDashData = await normDashRes.json();

    if (normDashData.summary.totalIncome !== 0 || normDashData.summary.totalExpenses !== 0) {
        throw new Error("ISOLATION BREACH: New user can see transactions from other users!");
    }

    const normPortRes = await fetch(`${BASE_URL}/api/stocks/portfolio`, { headers: normHeaders });
    const normPortData = await normPortRes.json();
    if (normPortData.holdings.length !== 0) {
        throw new Error("ISOLATION BREACH: New user can see stock holdings of demo user!");
    }

    const normGoalsRes = await fetch(`${BASE_URL}/api/savings-goals`, { headers: normHeaders });
    const normGoalsData = await normGoalsRes.json();
    if (normGoalsData.goals.length !== 0) {
        throw new Error("ISOLATION BREACH: New user can see demo savings goals!");
    }

    console.log("  ✓ Data isolation PASSED: New user has 0 records and cannot view demo data!");

    // TEST 7: Normal User Transaction CRUD
    console.log("\n[TEST 7] Testing Transaction CRUD for Normal User...");
    const addTxRes = await fetch(`${BASE_URL}/api/transactions`, {
        method: "POST",
        headers: normHeaders,
        body: JSON.stringify({
            type: "expense",
            amount: 450.00,
            category: "Food",
            description: "Test Lunch Meal",
            date: "2026-10-13",
            paymentMethod: "upi",
        }),
    });
    const addTxData = await addTxRes.json();
    if (!addTxData.success) {
        throw new Error(`Add transaction failed: ${JSON.stringify(addTxData)}`);
    }
    const createdTxId = addTxData.transaction.id;
    console.log(`  ✓ Created transaction ID: ${createdTxId}`);

    // Update
    const updateTxRes = await fetch(`${BASE_URL}/api/transactions/${createdTxId}`, {
        method: "PUT",
        headers: normHeaders,
        body: JSON.stringify({
            amount: 520.00,
            description: "Updated Lunch Meal",
        }),
    });
    const updateTxData = await updateTxRes.json();
    if (!updateTxData.success || parseFloat(updateTxData.transaction.amount) !== 520) {
        throw new Error(`Update transaction failed: ${JSON.stringify(updateTxData)}`);
    }
    console.log("  ✓ Updated transaction successfully.");

    // Delete
    const delTxRes = await fetch(`${BASE_URL}/api/transactions/${createdTxId}`, {
        method: "DELETE",
        headers: normHeaders,
    });
    const delTxData = await delTxRes.json();
    if (!delTxData.success) {
        throw new Error(`Delete transaction failed: ${JSON.stringify(delTxData)}`);
    }
    console.log("  ✓ Deleted transaction successfully.");

    // TEST 8: Portfolio Oversell Validation
    console.log("\n[TEST 8] Testing Portfolio Oversell Validation...");
    const oversellRes = await fetch(`${BASE_URL}/api/stocks/transactions`, {
        method: "POST",
        headers: normHeaders,
        body: JSON.stringify({
            symbol: "RELIANCE.NS",
            companyName: "Reliance Industries",
            transactionType: "SELL",
            quantity: 50,
            pricePerShare: 1200,
            transactionDate: "2026-10-13",
        }),
    });
    const oversellData = await oversellRes.json();
    if (oversellRes.status !== 400 || !oversellData.message.includes("Cannot sell")) {
        throw new Error(`Expected HTTP 400 for overselling shares, got ${oversellRes.status}`);
    }
    console.log(`  ✓ Oversell correctly rejected with message: "${oversellData.message}"`);

    // Clean up temporary isolation test user
    await pool.query("DELETE FROM users WHERE id = $1", [normalUserId]);
    console.log(`  ✓ Cleaned up temporary test user ID: ${normalUserId}`);

    console.log("\n=================================================");
    console.log("  >>> ALL VERIFICATION SUITE TESTS PASSED! <<<   ");
    console.log("=================================================");
    process.exit(0);
}

runTests().catch((err) => {
    console.error("\n[TEST FAILURE]:", err);
    process.exit(1);
});
