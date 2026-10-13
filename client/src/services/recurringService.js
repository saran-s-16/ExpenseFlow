import api from "./api";

export async function getRecurringPayments() {
    const res = await api.get("/recurring-payments");
    return res.data;
}

export async function createRecurringPayment(data) {
    const res = await api.post("/recurring-payments", data);
    return res.data;
}

export async function updateRecurringPayment(id, data) {
    const res = await api.put(`/recurring-payments/${id}`, data);
    return res.data;
}

export async function deleteRecurringPayment(id) {
    const res = await api.delete(`/recurring-payments/${id}`);
    return res.data;
}
