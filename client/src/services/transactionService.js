import api from "./api";

export async function getTransactions(params = {}) {
    const res = await api.get("/transactions", { params });
    return res.data;
}

export async function getTransaction(id) {
    const res = await api.get(`/transactions/${id}`);
    return res.data;
}

export async function createTransaction(data) {
    const res = await api.post("/transactions", data);
    return res.data;
}

export async function updateTransaction(id, data) {
    const res = await api.put(`/transactions/${id}`, data);
    return res.data;
}

export async function deleteTransaction(id) {
    const res = await api.delete(`/transactions/${id}`);
    return res.data;
}
