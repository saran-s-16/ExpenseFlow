import api from "./api";

export async function getCategories(type) {
    const params = type ? { type } : {};
    const res = await api.get("/categories", { params });
    return res.data;
}

export async function createCategory(data) {
    const res = await api.post("/categories", data);
    return res.data;
}

export async function updateCategory(id, data) {
    const res = await api.put(`/categories/${id}`, data);
    return res.data;
}

export async function deleteCategory(id) {
    const res = await api.delete(`/categories/${id}`);
    return res.data;
}
