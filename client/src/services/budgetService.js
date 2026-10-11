import api from "./api";

export async function getBudgets(month, year) {
    const params = {};
    if (month) params.month = month;
    if (year) params.year = year;
    const res = await api.get("/budgets", { params });
    return res.data;
}

export async function createBudget(data) {
    const res = await api.post("/budgets", data);
    return res.data;
}

export async function updateBudget(id, data) {
    const res = await api.put(`/budgets/${id}`, data);
    return res.data;
}

export async function deleteBudget(id) {
    const res = await api.delete(`/budgets/${id}`);
    return res.data;
}
