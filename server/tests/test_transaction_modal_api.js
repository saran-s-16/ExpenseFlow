import pool from "../config/db.js";

async function testTransactionApi() {
    console.log("=== EXPENSEFLOW TRANSACTION API VERIFICATION ===");
    let passed = 0;
    let failed = 0;

    function assert(cond, desc) {
        if (cond) {
            console.log(`[PASS] ${desc}`);
            passed++;
        } else {
            console.error(`[FAIL] ${desc}`);
            failed++;
        }
    }

    const timestamp = Date.now();
    const testEmail = `modaltester_${timestamp}@example.com`;
    let token = "";
    let userId = null;
    let expenseTxId = null;
    let incomeTxId = null;

    try {
        // 1. Register test user
        const regRes = await fetch("http://localhost:5000/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: "Modal Tester",
                email: testEmail,
                password: "Password123!",
            }),
        });
        const regData = await regRes.json();
        assert(regData.success === true, "User registered successfully");
        token = regData.token;
        userId = regData.user.id;

        const authHeaders = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        };

        // 2. Fetch categories (used by TransactionModal)
        const catRes = await fetch("http://localhost:5000/api/categories", {
            headers: authHeaders,
        });
        const catData = await catRes.json();
        assert(catData.success === true, "Categories loaded successfully");
        assert(Array.isArray(catData.categories) && catData.categories.length > 0, "Default categories exist");

        const expenseCat = catData.categories.find((c) => c.type === "expense")?.name || "Food";
        const incomeCat = catData.categories.find((c) => c.type === "income")?.name || "Salary";

        // 3. Test Create Expense Transaction (Modal Save from Dashboard/Transactions)
        const createExpenseRes = await fetch("http://localhost:5000/api/transactions", {
            method: "POST",
            headers: authHeaders,
            body: JSON.stringify({
                type: "expense",
                amount: 750.5,
                category: expenseCat,
                description: "Team lunch at bistro",
                date: "2026-10-11",
                payment_method: "upi",
                notes: "Quick expense from dashboard modal",
            }),
        });
        const expData = await createExpenseRes.json();
        assert(expData.success === true, "Created expense transaction successfully");
        assert(Number(expData.transaction.amount) === 750.5, "Expense amount is 750.50");
        expenseTxId = expData.transaction.id;

        // 4. Test Create Income Transaction (Modal Save from Dashboard/Transactions)
        const createIncomeRes = await fetch("http://localhost:5000/api/transactions", {
            method: "POST",
            headers: authHeaders,
            body: JSON.stringify({
                type: "income",
                amount: 15000,
                category: incomeCat,
                description: "Freelance consulting payment",
                date: "2026-10-11",
                payment_method: "bank_transfer",
                notes: "Consulting milestone 1",
            }),
        });
        const incData = await createIncomeRes.json();
        assert(incData.success === true, "Created income transaction successfully");
        assert(Number(incData.transaction.amount) === 15000, "Income amount is 15000.00");
        incomeTxId = incData.transaction.id;

        // 5. Test Update Transaction (Modal Edit from Transactions page)
        const updateRes = await fetch(`http://localhost:5000/api/transactions/${expenseTxId}`, {
            method: "PUT",
            headers: authHeaders,
            body: JSON.stringify({
                type: "expense",
                amount: 820.0,
                category: expenseCat,
                description: "Team lunch at bistro (updated with tip)",
                date: "2026-10-11",
                payment_method: "card",
                notes: "Updated via TransactionModal edit mode",
            }),
        });
        const updateData = await updateRes.json();
        assert(updateData.success === true, "Updated transaction successfully");
        assert(Number(updateData.transaction.amount) === 820, "Updated amount is 820.00");

        // 6. Test Dashboard endpoint reflects the created/updated transactions
        const dashRes = await fetch("http://localhost:5000/api/dashboard?period=month", {
            headers: authHeaders,
        });
        const dashData = await dashRes.json();
        assert(dashData.success === true, "Dashboard data loaded successfully");
        assert(Number(dashData.summary.periodIncome) === 15000, "Dashboard totals reflect 15,000 income");
        assert(Number(dashData.summary.periodExpenses) === 820, "Dashboard totals reflect 820 expense");
        assert(Array.isArray(dashData.recentTransactions) && dashData.recentTransactions.length === 2, "Recent transactions contains both items");

        // 7. Cleanup test data
        await pool.query("DELETE FROM users WHERE id = $1", [userId]);
        console.log(`\n========================================`);
        console.log(`ALL TESTS FINISHED: Passed: ${passed}, Failed: ${failed}`);
        console.log(`========================================\n`);
    } catch (e) {
        console.error("Test error:", e);
        failed++;
    } finally {
        await pool.end();
        process.exit(failed > 0 ? 1 : 0);
    }
}

testTransactionApi();
