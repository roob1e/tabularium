import api from "./api";

export interface GradeRequest {
    studentId: number;
    subjectId: number;
    teacherId: number;
    grade: number;
}

export interface GradeResponse {
    id: number;
    studentId: number;
    subjectId: number;
    teacherId: number;
    grade: number;
}

export const fetchGrades = async (): Promise<GradeResponse[]> => {
    try {
        const response = await api.get("/api/grades");
        const data = response.data;
        return Array.isArray(data) ? data : [];
    } catch (error) {
        return [];
    }
};

export const createGrade = async (data: GradeRequest): Promise<GradeResponse> => {
    const response = await api.post("/api/grades", data);
    return response.data;
};

export const updateGrade = async (id: number, data: GradeRequest): Promise<GradeResponse> => {
    const response = await api.put(`/api/grades/${id}`, data);
    return response.data;
};

export const deleteGrade = async (id: number): Promise<void> => {
    await api.delete(`/api/grades/${id}`);
};