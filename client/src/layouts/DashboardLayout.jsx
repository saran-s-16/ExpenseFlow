import React, { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
    LayoutDashboard,
    ReceiptText,
    Target,
    FolderTree,
    BarChart3,
    Sparkles,
    Settings,
    PiggyBank,
    Repeat,
    TrendingUp,
    LogOut,
    Sun,
    Moon,
    Menu,
    X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import SignOutModal from "../components/SignOutModal";
import "../styles/layout.css";

export default function DashboardLayout() {
    const { user, logout, theme, toggleTheme } = useAuth();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [showSignOutModal, setShowSignOutModal] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleConfirmLogout = async () => {
        if (isLoggingOut) return;
        try {
            setIsLoggingOut(true);
            await logout();
        } finally {
            setIsLoggingOut(false);
            setShowSignOutModal(false);
            navigate("/", { replace: true, state: { signedOut: true } });
        }
    };

    // Calculate time-based greeting
    const hour = new Date().getHours();
    let greeting = "Good morning";
    if (hour >= 12 && hour < 17) greeting = "Good afternoon";
    else if (hour >= 17) greeting = "Good evening";

    const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : "U";

    return (
        <div className="dashboard-layout">
            {/* Mobile Header / Hamburger Toggle */}
            <div className="mobile-topbar">
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">₹</div>
                    <span>ExpenseFlow</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <button
                        className="icon-button"
                        onClick={toggleTheme}
                        aria-label="Toggle dark/light theme"
                    >
                        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                    <button
                        className="icon-button"
                        onClick={() => setMobileOpen(!mobileOpen)}
                        aria-label="Toggle mobile menu"
                    >
                        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>
            </div>

            {/* Sidebar Overlay on Mobile */}
            {mobileOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Main Sidebar */}
            <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">₹</div>
                    <span>ExpenseFlow</span>
                </div>

                <nav className="sidebar-nav">
                    <NavLink
                        to="/dashboard"
                        className={({ isActive }) =>
                            `nav-item ${isActive ? "active" : ""}`
                        }
                        onClick={() => setMobileOpen(false)}
                    >
                        <LayoutDashboard size={19} />
                        <span>Dashboard</span>
                    </NavLink>

                    <NavLink
                        to="/transactions"
                        className={({ isActive }) =>
                            `nav-item ${isActive ? "active" : ""}`
                        }
                        onClick={() => setMobileOpen(false)}
                    >
                        <ReceiptText size={19} />
                        <span>Transactions</span>
                    </NavLink>

                    <NavLink
                        to="/budgets"
                        className={({ isActive }) =>
                            `nav-item ${isActive ? "active" : ""}`
                        }
                        onClick={() => setMobileOpen(false)}
                    >
                        <Target size={19} />
                        <span>Budgets</span>
                    </NavLink>

                    <NavLink
                        to="/savings-goals"
                        className={({ isActive }) =>
                            `nav-item ${isActive ? "active" : ""}`
                        }
                        onClick={() => setMobileOpen(false)}
                    >
                        <PiggyBank size={19} />
                        <span>Savings Goals</span>
                    </NavLink>

                    <NavLink
                        to="/recurring"
                        className={({ isActive }) =>
                            `nav-item ${isActive ? "active" : ""}`
                        }
                        onClick={() => setMobileOpen(false)}
                    >
                        <Repeat size={19} />
                        <span>Recurring Bills</span>
                    </NavLink>

                    <NavLink
                        to="/stocks"
                        className={({ isActive }) =>
                            `nav-item ${isActive ? "active" : ""}`
                        }
                        onClick={() => setMobileOpen(false)}
                    >
                        <TrendingUp size={19} />
                        <span>Stock Market</span>
                    </NavLink>

                    <NavLink
                        to="/categories"
                        className={({ isActive }) =>
                            `nav-item ${isActive ? "active" : ""}`
                        }
                        onClick={() => setMobileOpen(false)}
                    >
                        <FolderTree size={19} />
                        <span>Categories</span>
                    </NavLink>

                    <NavLink
                        to="/analytics"
                        className={({ isActive }) =>
                            `nav-item ${isActive ? "active" : ""}`
                        }
                        onClick={() => setMobileOpen(false)}
                    >
                        <BarChart3 size={19} />
                        <span>Analytics</span>
                    </NavLink>

                    <NavLink
                        to="/ai-assistant"
                        className={({ isActive }) =>
                            `nav-item ${isActive ? "active" : ""}`
                        }
                        onClick={() => setMobileOpen(false)}
                    >
                        <Sparkles size={19} />
                        <span>AI Assistant</span>
                    </NavLink>

                    <NavLink
                        to="/settings"

                        className={({ isActive }) =>
                            `nav-item ${isActive ? "active" : ""}`
                        }
                        onClick={() => setMobileOpen(false)}
                    >
                        <Settings size={19} />
                        <span>Settings</span>
                    </NavLink>
                </nav>

                <div className="sidebar-bottom">
                    <button
                        className="nav-item logout-btn"
                        onClick={() => {
                            setMobileOpen(false);
                            setShowSignOutModal(true);
                        }}
                        title="Sign Out"
                    >
                        <LogOut size={18} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Page Area */}
            <section className="dashboard-content">
                <header className="dashboard-header">
                    <div>
                        <p className="header-small-text">Financial Overview</p>
                        <h1>
                            {greeting}, {user?.name || "User"} 👋
                        </h1>
                    </div>

                    <div className="header-actions">
                        <button
                            className="icon-button"
                            onClick={toggleTheme}
                            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                            aria-label="Toggle theme"
                        >
                            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                        </button>

                        <div className="profile" title={user?.email || ""}>
                            <div className="profile-avatar">{userInitial}</div>
                            <div>
                                <strong>{user?.name || "My Account"}</strong>
                                <span>{user?.email || "Personal"}</span>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="dashboard-main">
                    <Outlet />
                </main>
            </section>

            {/* Polished Animated Sign-Out Confirmation Modal */}
            <SignOutModal
                isOpen={showSignOutModal}
                onClose={() => setShowSignOutModal(false)}
                onConfirm={handleConfirmLogout}
                isLoggingOut={isLoggingOut}
            />
        </div>
    );
}