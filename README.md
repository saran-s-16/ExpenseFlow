# ExpenseFlow - Full-Stack Financial Dashboard & Expense Tracker

ExpenseFlow is a modern, responsive, and secure full-stack expense tracker and financial management dashboard built with React 19, Node.js (Express), and PostgreSQL.

---

## ✨ Features

- **Premium SaaS Landing Page**:
  - Sticky glassmorphism navbar with dynamic auth recognition and theme toggle.
  - Interactive hero section with live-styled financial mockup preview and floating badges.
  - 8 Feature cards with Lucide icons and scroll-triggered entrance reveals.
  - Interactive 3-step workflow timeline and product showcase preview.
  - Emerald glow CTA banner and verified developer contact footer.
- **Authentication & Security**:
  - Secure registration & login with bcrypt password hashing and JSON Web Tokens (JWT).
  - Scope-level user isolation preventing any cross-user data leakage.
  - Profile update and secure password change with current password verification.
- **Dynamic Financial Dashboard**:
  - Total Income, Total Expenses, Current Balance, and Net Savings calculations.
  - Date filtering (This Week, This Month, This Year, All Time).
  - Monthly spending overview with category breakdown and interactive visual charts.
  - Recent transactions list with type badges and quick "+ Add Transaction" modal.
- **Complete Transactions Management**:
  - Full CRUD: Add income/expense, Edit, and Delete with confirmation modal.
  - Multi-parameter filtering: Transaction Type (Income/Expense), Category, Payment Method (Cash, UPI, Card, Bank Transfer), and Custom Date Range.
  - Instant live search across descriptions, categories, and notes.
  - Sorting (by Date or Amount) and pagination with page controls.
  - Detailed modal view for individual transactions.
- **Budget Management**:
  - Set monthly category spending limits for any month/year.
  - Real-time spending progress bars against monthly limits.
  - Automatic status alerts (On Track, Near Limit >= 80%, Exceeded >= 100%).
  - Monthly overall planned vs actual budget summary.
- **Category Management**:
  - Income and Expense category tabs.
  - Category creation and editing.
  - Real spending totals and transaction counts computed per category.
  - Safe deletion safeguards preventing accidental deletion of categories currently in use.
- **Analytics & Financial Reports**:
  - Interactive Recharts charts: Income vs. Expenses over time, Category distribution donut chart, and Net Savings Trajectory.
  - Key financial metrics: Savings rate, average daily expense, largest single expense.
  - Data-driven financial observations and insights.
  - 1-click **Export to CSV** for filtered records.
- **Modern Design & User Experience**:
  - Light green and white glassmorphism theme with soft glow shadows and rounded frosted cards.
  - Complete dark mode with persistent toggle across page reloads.
  - Fully responsive on desktop, tablet, and mobile screens.

---

## 🛠️ Technology Stack

- **Frontend**:
  - React 19
  - React Router v7
  - Vite 6
  - Recharts 2.15
  - Lucide React (Icons)
  - Axios
  - Vanilla CSS design system with CSS custom properties
- **Backend**:
  - Node.js (ES Modules)
  - Express 5
  - PostgreSQL (`pg` connection pool)
  - `bcryptjs`
  - `jsonwebtoken`
  - `dotenv` & `cors`
- **Database**:
  - PostgreSQL `expense_tracker`

---

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [PostgreSQL](https://www.postgresql.org/) running locally on port 5432

### 2. Database & Environment Setup
Verify your `.env` file in the project root:

```env
PORT=5000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=expense_tracker
DB_USER=postgres
DB_PASSWORD=ExpenseDB@2026

JWT_SECRET=expenseflow_super_secret_jwt_key_2026_x98f2a
JWT_EXPIRES_IN=7d
```

### 3. Running the Backend Server
From the project root:

```bash
cd server
npm run dev
```
The Express backend starts on `http://localhost:5000`.

### 4. Running the Frontend Development Server
From the project root:

```bash
cd client
npm run dev
```
The React frontend starts on `http://localhost:5173`.

### 5. Building for Production
```bash
cd client
npm run build
```

---

## 📡 API Reference

### Health Checks
- `GET /` - Root health check
- `GET /api/health/database` - PostgreSQL connection status

### Authentication
- `POST /api/auth/register` - Create account (auto-seeds standard categories)
- `POST /api/auth/login` - Authenticate and obtain JWT token
- `GET /api/auth/me` - Get current authenticated user profile *(Protected)*
- `PUT /api/auth/profile` - Update user name *(Protected)*
- `PUT /api/auth/change-password` - Verify and update password *(Protected)*

### Dashboard
- `GET /api/dashboard?period=month` - Summary cards, categories, recent transactions, and trend data *(Protected)*

### Transactions
- `GET /api/transactions` - Filtered, sorted, and paginated transactions *(Protected)*
- `GET /api/transactions/:id` - Single transaction details *(Protected)*
- `POST /api/transactions` - Create transaction *(Protected)*
- `PUT /api/transactions/:id` - Update transaction *(Protected)*
- `DELETE /api/transactions/:id` - Delete transaction *(Protected)*

### Categories
- `GET /api/categories?type=expense` - List user categories with spending stats *(Protected)*
- `POST /api/categories` - Create new category *(Protected)*
- `PUT /api/categories/:id` - Update category *(Protected)*
- `DELETE /api/categories/:id` - Delete category *(Protected)*

### Budgets
- `GET /api/budgets?month=10&year=2026` - Monthly budgets with real spending and alert status *(Protected)*
- `POST /api/budgets` - Create monthly budget *(Protected)*
- `PUT /api/budgets/:id` - Update monthly budget *(Protected)*
- `DELETE /api/budgets/:id` - Delete monthly budget *(Protected)*

### Analytics & Reports
- `GET /api/analytics?range=last_6_months` - Report summary, charts data, and insights *(Protected)*
- `GET /api/analytics/export?range=all` - Download filtered transactions CSV *(Protected)*
