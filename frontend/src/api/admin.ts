import api from "./api.ts";

export interface UserResponse {
    id: number;
    username: string;
    fullname: string;
    role: "ADMIN" | "TEACHER";
    approved: boolean;
}

export const fetchAllUsers = async (): Promise<UserResponse[]> => {
    const res = await api.get("/api/admin/users");
    return res.data;
};

export const approveUser = async (id: number): Promise<UserResponse> => {
    const res = await api.patch(`/api/admin/users/${id}/approve`);
    return res.data;
}

export const setUserRole = async (id: number, role: "ADMIN" | "TEACHER"): Promise<UserResponse> => {
    const res = await api.patch(`api/admin/users/${id}/role}`, null, {params: {role}});
    return res.data;
}

export const deleteUser = async (id: number): Promise<void> => {
    await api.delete(`/api/admin/users/${id}`);
}