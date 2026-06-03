import api from "./api";

export type WorkType = "CURRENT" | "CONTROL" | "INDEPENDENT" | "TEST" | "EXAM" | "FINAL";

export const WORK_TYPE_LABELS: Record<WorkType, string> = {
    CURRENT: "Текущая",
    CONTROL: "Контрольная",
    INDEPENDENT: "Самостоятельная",
    TEST: "Зачёт",
    EXAM: "Экзамен",
    FINAL: "Итоговая",
};

export interface GradeRequest {
    studentId: number;
    subjectId: number;
    teacherId: number;
    grade: number;
    workType?: WorkType;
    gradeDate?: string;
    comment?: string;
}

export interface GradeResponse {
    id: number;
    studentId: number;
    studentName?: string;
    subjectId: number;
    subjectName?: string;
    teacherId: number;
    teacherName?: string;
    grade: number;
    workType?: WorkType;
    gradeDate?: string;
    comment?: string;
}

export const fetchGrades = async (params?: { studentId?: number; subjectId?: number }): Promise<GradeResponse[]> => {
    try {
        const response = await api.get("/api/grades", { params });
        return Array.isArray(response.data) ? response.data : [];
    } catch {
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