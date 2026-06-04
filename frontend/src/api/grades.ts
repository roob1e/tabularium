import api from "./api";

export type WorkType = "CURRENT" | "CONTROL" | "INDEPENDENT" | "TEST" | "EXAM" | "FINAL";

export const WORK_TYPE_LABELS: Record<WorkType, string> = {
    CURRENT:     "Текущая",
    CONTROL:     "Контрольная",
    INDEPENDENT: "Самостоятельная",
    TEST:        "Зачёт",
    EXAM:        "Экзамен",
    FINAL:       "Итоговая",
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

export interface PageResponse<T> {
    content: T[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    last: boolean;
}

export interface FetchGradesParams {
    studentId?: number;
    subjectId?: number;
    page?: number;
    size?: number;
}

export const fetchGrades = async (params?: FetchGradesParams): Promise<PageResponse<GradeResponse>> => {
    const response = await api.get("/api/grades", { params: { page: 0, size: 50, ...params } });
    return response.data;
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