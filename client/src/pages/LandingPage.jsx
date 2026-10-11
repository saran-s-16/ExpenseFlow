import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
    LayoutDashboard,
    ReceiptText,
    BarChart3,
    Target,
    ArrowRight,
    Sun,
    Moon,
    Menu,
    X,
    Github,
    Linkedin,
    Phone,
    Mail,
    Sparkles,
    CheckCircle2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "../styles/landing.css";

export default function LandingPage() {
    const { theme, toggleTheme } = useAuth();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [signedOutNotice, setSignedOutNotice] = useState(false);

    useEffect(() => {
        if (location.state?.signedOut) {
            setSignedOutNotice(true);
            const timer = setTimeout(() => {
                setSignedOutNotice(false);
                window.history.replaceState({}, document.title);
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [location.state]);

    // Subtle fade-and-rise entrance observer
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("active");
                    }
                });
            },
            {
                threshold: 0.08,
                rootMargin: "0px 0px -30px 0px",
            }
        );

        const elements = document.querySelectorAll(".fade-in-up");
        elements.forEach((el) => observer.observe(el));

        return () => observer.disconnect();
    }, []);

    // Smooth scroll navigation helper
    const scrollToSection = (id) => {
        setMobileMenuOpen(false);
        const element = document.getElementById(id);
        if (element) {
            const navbarOffset = 70;
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - navbarOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: "smooth",
            });
        }
    };

    const currentYear = new Date().getFullYear();

    return (
        <div className="apple-landing" id="hero">
            {/* Elegant Sign-out Toast Notification */}
            {signedOutNotice && (
                <div className="signout-toast-banner" role="status" aria-live="polite">
                    <CheckCircle2 size={16} />
                    <span>Signed out successfully</span>
                    <button
                        type="button"
                        className="toast-close-btn"
                        onClick={() => setSignedOutNotice(false)}
                        aria-label="Dismiss notification"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}
            {/* =================================================================
                FULL-WIDTH STICKY TRANSLUCENT NAVBAR
                Minimal & Aligned: Home · Features · About | Log In · Sign Up
            ================================================================= */}
            <header className="apple-navbar">
                <div className="landing-container navbar-inner">
                    <a
                        href="#hero"
                        className="apple-brand"
                        onClick={(e) => {
                            e.preventDefault();
                            scrollToSection("hero");
                        }}
                    >
                        <div className="brand-glyph">₹</div>
                        <span className="brand-text">ExpenseFlow</span>
                    </a>

                    {/* Navigation limited strictly to: Home · Features */}
                    <nav className="nav-links-center">
                        <a
                            href="#hero"
                            className="nav-link-item"
                            onClick={(e) => {
                                e.preventDefault();
                                scrollToSection("hero");
                            }}
                        >
                            Home
                        </a>
                        <a
                            href="#features"
                            className="nav-link-item"
                            onClick={(e) => {
                                e.preventDefault();
                                scrollToSection("features");
                            }}
                        >
                            Features
                        </a>
                    </nav>

                    {/* Actions: Theme toggle · Log In · Sign Up (No Open Dashboard) */}
                    <div className="nav-actions-right">
                        <button
                            className="nav-theme-btn"
                            onClick={toggleTheme}
                            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                            aria-label="Toggle theme"
                        >
                            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
                        </button>

                        <Link to="/login" className="btn-nav-login">
                            Log In
                        </Link>

                        <Link to="/signup" className="btn-nav-pill-cta">
                            Sign Up
                        </Link>

                        <button
                            className="mobile-toggle"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            aria-label="Toggle navigation menu"
                        >
                            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile Navigation Drawer */}
            <div className={`apple-mobile-menu ${mobileMenuOpen ? "open" : ""}`}>
                <a
                    href="#hero"
                    className="mobile-menu-link"
                    onClick={(e) => {
                        e.preventDefault();
                        scrollToSection("hero");
                    }}
                >
                    Home
                </a>
                <a
                    href="#features"
                    className="mobile-menu-link"
                    onClick={(e) => {
                        e.preventDefault();
                        scrollToSection("features");
                    }}
                >
                    Features
                </a>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px" }}>
                    <Link
                        to="/login"
                        className="btn-nav-login"
                        style={{ textAlign: "center", padding: "10px 0" }}
                        onClick={() => setMobileMenuOpen(false)}
                    >
                        Log In
                    </Link>
                    <Link
                        to="/signup"
                        className="btn-nav-pill-cta"
                        style={{ textAlign: "center", justifyContent: "center", padding: "10px 0" }}
                        onClick={() => setMobileMenuOpen(false)}
                    >
                        Sign Up
                    </Link>
                </div>
            </div>

            {/* =================================================================
                HERO SECTION — BALANCED TWO-COLUMN RESPONSIVE COMPOSITION
                One primary button: "Get Started"
            ================================================================= */}
            <section className="apple-hero">
                <div className="landing-container hero-two-column-grid">
                    {/* Left Column: Headlines & Get Started Button */}
                    <div className="hero-left-column fade-in-up">
                        <div className="hero-badge-pill">
                            <Sparkles size={13} />
                            <span>Emerald Clarity • Financial Flow</span>
                        </div>

                        <h1 className="hero-headline">
                            Your Money. <br />
                            <span className="hero-gradient-text">Your Clarity.</span> <br />
                            Your Flow.
                        </h1>

                        <p className="hero-subtitle">
                            Track spending, manage budgets, and understand your finances — all in one place.
                        </p>

                        <div className="hero-cta-buttons">
                            <Link to="/signup" className="btn-apple-primary">
                                <span>Get Started</span>
                                <ArrowRight size={16} />
                            </Link>
                        </div>

                        <div className="hero-highlights-strip">
                            <div className="highlight-item">
                                <span className="highlight-dot"></span>
                                <span>Direct PostgreSQL Storage</span>
                            </div>
                            <div className="highlight-item">
                                <span className="highlight-dot"></span>
                                <span>Strict Data Isolation</span>
                            </div>
                            <div className="highlight-item">
                                <span className="highlight-dot"></span>
                                <span>Zero Clutter</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Substantial, Crisp Dashboard Preview */}
                    <div className="hero-right-column fade-in-up">
                        <div className="dashboard-window-preview">
                            {/* Window Header */}
                            <div className="window-top-bar">
                                <div className="window-dots">
                                    <span className="window-dot dot-red"></span>
                                    <span className="window-dot dot-yellow"></span>
                                    <span className="window-dot dot-green"></span>
                                </div>
                                <span className="window-title-pill">ExpenseFlow Live Workspace</span>
                                <span className="window-status-badge">
                                    <span>●</span> Live View (INR ₹)
                                </span>
                            </div>

                            {/* Stat Metrics Strip (3 Cards) */}
                            <div className="preview-stat-grid">
                                <div className="preview-stat-card">
                                    <div className="stat-label-wrap">
                                        <span className="stat-label">Net Balance</span>
                                        <span className="stat-trend-tag">+18.4%</span>
                                    </div>
                                    <div className="stat-value stat-balance">₹1,42,850.00</div>
                                </div>

                                <div className="preview-stat-card">
                                    <div className="stat-label-wrap">
                                        <span className="stat-label">Income</span>
                                    </div>
                                    <div className="stat-value stat-income">+₹75,000.00</div>
                                </div>

                                <div className="preview-stat-card">
                                    <div className="stat-label-wrap">
                                        <span className="stat-label">Expenses</span>
                                    </div>
                                    <div className="stat-value stat-expense">-₹32,150.00</div>
                                </div>
                            </div>

                            {/* Monthly Spending Breakdown Bar */}
                            <div className="preview-bars-card">
                                <div className="bars-header">
                                    <span className="bars-title">Monthly Spending Distribution</span>
                                    <span className="bars-subtitle">Top Categories</span>
                                </div>

                                <div className="category-distribution-bar">
                                    <div className="bar-segment seg-rent" title="Housing: 44%"></div>
                                    <div className="bar-segment seg-food" title="Food: 26%"></div>
                                    <div className="bar-segment seg-bills" title="Bills: 18%"></div>
                                    <div className="bar-segment seg-other" title="Leisure: 12%"></div>
                                </div>

                                <div className="category-legend-row">
                                    <span className="legend-item">
                                        <span className="legend-color-dot" style={{ background: "#2e7d32" }}></span>
                                        Rent (44%)
                                    </span>
                                    <span className="legend-item">
                                        <span className="legend-color-dot" style={{ background: "#66bb6a" }}></span>
                                        Food (26%)
                                    </span>
                                    <span className="legend-item">
                                        <span className="legend-color-dot" style={{ background: "#a5d6a7" }}></span>
                                        Bills (18%)
                                    </span>
                                    <span className="legend-item">
                                        <span className="legend-color-dot" style={{ background: "#81c784" }}></span>
                                        Other (12%)
                                    </span>
                                </div>
                            </div>

                            {/* Mini Activity Feed */}
                            <div className="preview-feed-card">
                                <div className="feed-row-item">
                                    <div className="feed-left-info">
                                        <div className="feed-icon-circle">💼</div>
                                        <div>
                                            <span className="feed-title-text">Consulting Retainer</span>
                                            <span className="feed-meta-sub">Income • Bank</span>
                                        </div>
                                    </div>
                                    <span className="feed-amount-badge stat-income">+₹45,000.00</span>
                                </div>

                                <div className="feed-row-item">
                                    <div className="feed-left-info">
                                        <div className="feed-icon-circle">🛒</div>
                                        <div>
                                            <span className="feed-title-text">Fresh Market Groceries</span>
                                            <span className="feed-meta-sub">Food • UPI</span>
                                        </div>
                                    </div>
                                    <span className="feed-amount-badge stat-expense">-₹3,840.00</span>
                                </div>

                                <div className="feed-row-item">
                                    <div className="feed-left-info">
                                        <div className="feed-icon-circle">⚡</div>
                                        <div>
                                            <span className="feed-title-text">Fiber Broadband Bill</span>
                                            <span className="feed-meta-sub">Bills • Card</span>
                                        </div>
                                    </div>
                                    <span className="feed-amount-badge stat-expense">-₹1,299.00</span>
                                </div>
                            </div>

                            <span className="preview-disclaimer-note">
                                * Illustrative preview interface — authentic records loaded upon authentication
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* =================================================================
                FEATURES SECTION — FULL-WIDTH 4 CONCISE CARDS
            ================================================================= */}
            <section className="apple-features" id="features">
                <div className="landing-container">
                    <div className="features-header-wrap fade-in-up">
                        <span className="section-eyebrow-pill">Core Capabilities</span>
                        <h2 className="section-headline-title">Everything Built for Financial Clarity</h2>
                        <p className="section-lead-text">
                            Four core tools engineered with precision to keep your personal finances organized and effortless.
                        </p>
                    </div>

                    <div className="features-four-grid">
                        {/* 1. Smart Dashboard */}
                        <div className="feature-apple-card fade-in-up">
                            <div className="feature-apple-icon">
                                <LayoutDashboard size={22} />
                            </div>
                            <h3>Smart Dashboard</h3>
                            <p>
                                View real-time net balance, monthly income, and expense summaries with dynamic date-range filters.
                            </p>
                        </div>

                        {/* 2. Transaction Tracking */}
                        <div className="feature-apple-card fade-in-up">
                            <div className="feature-apple-icon">
                                <ReceiptText size={22} />
                            </div>
                            <h3>Transaction Tracking</h3>
                            <p>
                                Log, categorize, search, and manage your income and expenses with complete history and filters.
                            </p>
                        </div>

                        {/* 3. Spending Analytics */}
                        <div className="feature-apple-card fade-in-up">
                            <div className="feature-apple-icon">
                                <BarChart3 size={22} />
                            </div>
                            <h3>Spending Analytics</h3>
                            <p>
                                Visualize monthly cashflow trends and category breakdowns with clear, interactive charts.
                            </p>
                        </div>

                        {/* 4. Budget Planning */}
                        <div className="feature-apple-card fade-in-up">
                            <div className="feature-apple-icon">
                                <Target size={22} />
                            </div>
                            <h3>Budget Planning</h3>
                            <p>
                                Set category spending limits and monitor progress bars to stay in complete control of your financial goals.
                            </p>
                        </div>
                    </div>
                </div>
            </section>


            {/* =================================================================
                FOOTER — PROPER FULL-WIDTH BALANCED ALIGNMENT
            ================================================================= */}
            <footer className="apple-footer">
                <div className="landing-container">
                    <div className="footer-top-row">
                        <div className="footer-brand-side">
                            <div className="apple-brand">
                                <div className="brand-glyph">₹</div>
                                <span className="brand-text">ExpenseFlow</span>
                            </div>
                            <span className="footer-tagline-text">
                                Track spending, manage budgets, and understand your finances.
                            </span>
                        </div>

                        {/* Working Contact Links with Compact Icons */}
                        <div className="footer-contact-pills">
                            <a
                                href="https://github.com/saran-s-16"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="contact-pill-link"
                            >
                                <Github size={15} />
                                <span>GitHub</span>
                            </a>

                            <a
                                href="https://www.linkedin.com/in/saran16"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="contact-pill-link"
                            >
                                <Linkedin size={15} />
                                <span>LinkedIn</span>
                            </a>

                            <a
                                href="tel:9597428933"
                                className="contact-pill-link"
                            >
                                <Phone size={15} />
                                <span>9597428933</span>
                            </a>

                            <a
                                href="mailto:saran16062007@gmail.com"
                                className="contact-pill-link"
                            >
                                <Mail size={15} />
                                <span>saran16062007@gmail.com</span>
                            </a>
                        </div>
                    </div>

                    <div className="footer-bottom-row">
                        <span>© {currentYear} ExpenseFlow. All rights reserved.</span>

                        <div className="footer-nav-anchors">
                            <a
                                href="#hero"
                                onClick={(e) => {
                                    e.preventDefault();
                                    scrollToSection("hero");
                                }}
                            >
                                Home
                            </a>
                            <a
                                href="#features"
                                onClick={(e) => {
                                    e.preventDefault();
                                    scrollToSection("features");
                                }}
                            >
                                Features
                            </a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
