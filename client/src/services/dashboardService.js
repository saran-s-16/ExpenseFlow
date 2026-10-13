import api from "./api";

export async function getDashboardData(params = "month") {
    let query = "";
    if (typeof params === "string") {
        query = `?period=${params}`;
    } else if (params && typeof params === "object") {
        const searchParams = new URLSearchParams();
        if (params.period) searchParams.set("period", params.period);
        if (params.month) searchParams.set("month", params.month);
        if (params.year) searchParams.set("year", params.year);
        query = `?${searchParams.toString()}`;
    }
    const res = await api.get(`/dashboard${query}`);
    return res.data;
}
