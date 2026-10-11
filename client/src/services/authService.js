import api from "./api";

export async function loginUser(email, password) {
    const res = await api.post("/auth/login", { email, password });
    return res.data;
}

export async function registerUser(userData) {
    const res = await api.post("/auth/register", userData);
    return res.data;
}

export async function getCurrentUser() {
    const res = await api.get("/auth/me");
    return res.data;
}

export async function updateUserProfile(name) {
    const res = await api.put("/auth/profile", { name });
    return res.data;
}

export async function changeUserPassword(passwords) {
    const res = await api.put("/auth/change-password", passwords);
    return res.data;
}

export async function logoutUser() {
    try {
        const res = await api.post("/auth/logout");
        return res.data;
    } catch {
        return { success: true };
    }
}
