import api from "./api";

export async function getAnalytics(params = {}) {
    const res = await api.get("/analytics", { params });
    return res.data;
}

export async function downloadCsvExport(params = {}) {
    const query = new URLSearchParams(params).toString();
    const token = localStorage.getItem("expenseflow_token");

    const response = await fetch(`http://localhost:5000/api/analytics/export?${query}`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error("Failed to download CSV export");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenseflow_transactions_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}
