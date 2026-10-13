import api from "./api";

export async function getSavingsGoals() {
    const res = await api.get("/savings-goals");
    return res.data;
}

export async function createSavingsGoal(data) {
    const res = await api.post("/savings-goals", data);
    return res.data;
}

export async function updateSavingsGoal(id, data) {
    const res = await api.put(`/savings-goals/${id}`, data);
    return res.data;
}

export async function contributeToGoal(id, amount) {
    const res = await api.post(`/savings-goals/${id}/contribute`, { amount });
    return res.data;
}

export async function deleteSavingsGoal(id) {
    const res = await api.delete(`/savings-goals/${id}`);
    return res.data;
}
