import api from "./api";
import { Teacher, TeacherRequest } from "../types/types";

export const fetchTeachers = async (): Promise<Teacher[]> => {
    try {
        const response = await api.get("/api/teachers");
        const data = response.data;
        return Array.isArray(data) ? data : [];
    } catch (error) {
        return [];
    }
};

export const createTeacher = async (data: TeacherRequest) => {
    const response = await api.post("/api/teachers", data);
    return response.data;
};

export const updateTeacher = async (id: number, data: TeacherRequest) => {
    const response = await api.put(`/api/teachers/${id}`, data);
    return response.data;
};

export const deleteTeacher = async (id: number) => {
    const response = await api.delete(`/api/teachers/${id}`);
    return response.data;
};