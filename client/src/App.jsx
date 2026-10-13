import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";

import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Budgets from "./pages/Budgets";
import Categories from "./pages/Categories";
import Analytics from "./pages/Analytics";
import AiAssistant from "./pages/AiAssistant";
import Settings from "./pages/Settings";
import SavingsGoals from "./pages/SavingsGoals";
import RecurringPayments from "./pages/RecurringPayments";
import StockMarket from "./pages/StockMarket";
import NotFound from "./pages/NotFound";


function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    {/* Public Landing & Auth Routes */}
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Register />} />
                    <Route path="/register" element={<Register />} />

                    {/* Protected Application Routes */}
                    <Route element={<ProtectedRoute />}>
                        <Route element={<DashboardLayout />}>
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/transactions" element={<Transactions />} />
                            <Route path="/expenses" element={<Transactions />} />
                            <Route path="/income" element={<Transactions />} />
                            <Route path="/budgets" element={<Budgets />} />
                            <Route path="/savings-goals" element={<SavingsGoals />} />
                            <Route path="/recurring" element={<RecurringPayments />} />
                            <Route path="/stocks" element={<StockMarket />} />
                            <Route path="/stock-market" element={<StockMarket />} />
                            <Route path="/categories" element={<Categories />} />
                            <Route path="/analytics" element={<Analytics />} />
                            <Route path="/ai-assistant" element={<AiAssistant />} />
                            <Route path="/ai" element={<AiAssistant />} />
                            <Route path="/settings" element={<Settings />} />

                        </Route>
                    </Route>

                    {/* Catch-all 404 Route */}
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;