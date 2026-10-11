import api from "./api";

export async function getDashboardData(period = "month") {
    const res = await api.get(`/dashboard?period=${period}`);
    return res.data;
}
