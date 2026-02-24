import api from "./api";
import { Subject } from "../types/types.ts";

export const fetchSubjects = async (): Promise<Subject[]> => {
    const response = await api.get("/api/subjects");
    return response.data;
};

export const createSubject = async (data: any): Promise<Subject> => {
    const response = await api.post("/api/subjects", data);
    return response.data;
};

export const updateSubject = async (id: number, data: any): Promise<Subject> => {
    const response = await api.put(`/api/subjects/${id}`, data);
    return response.data;
};

export const deleteSubject = async (id: number): Promise<boolean> => {
    await api.delete(`/api/subjects/${id}`);
    return true;
};