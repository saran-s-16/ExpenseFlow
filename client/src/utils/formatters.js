// Consistent INR Currency Formatter
export function formatCurrency(amount) {
    const num = Number(amount) || 0;
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(num);
}

// Consistent Date Formatter
export function formatDate(dateValue) {
    if (!dateValue) return "";
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

// Input date format YYYY-MM-DD
export function toInputDate(dateValue) {
    if (!dateValue) return new Date().toISOString().split("T")[0];
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return new Date().toISOString().split("T")[0];
    return date.toISOString().split("T")[0];
}

// Category icons map
export const CATEGORY_ICONS = {
    Food: "🍔",
    Travel: "🚗",
    Transport: "🚗",
    Shopping: "🛍️",
    Bills: "💡",
    Rent: "🏠",
    Salary: "💰",
    Freelance: "💻",
    Investments: "📈",
    "Other Income": "💵",
    Education: "📚",
    Entertainment: "🎬",
    Health: "❤️",
    Subscriptions: "📱",
    Other: "💳",
};

export function getCategoryIcon(category) {
    return CATEGORY_ICONS[category] || "🏷️";
}
