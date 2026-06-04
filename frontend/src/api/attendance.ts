import api from "./api";
import { PageResponse } from "./grades";

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
    PRESENT: "Присутствовал",
    ABSENT:  "Отсутствовал",
    LATE:    "Опоздал",
    EXCUSED: "Уважительная причина",
};

export const ATTENDANCE_STATUS_COLORS: Record<AttendanceStatus, string> = {
    PRESENT: "green",
    ABSENT:  "red",
    LATE:    "orange",
    EXCUSED: "blue",
};

export interface AttendanceRequest {
    studentId: number;
    subjectId: number;
    teacherId?: number;
    attendanceDate: string;
    status: AttendanceStatus;
    note?: string;
}

export interface AttendanceResponse {
    id: number;
    studentId: number;
    studentName?: string;
    subjectId: number;
    subjectName?: string;
    teacherId?: number;
    teacherName?: string;
    attendanceDate: string;
    status: AttendanceStatus;
    note?: string;
}

export interface FetchAttendanceParams {
    studentId?: number;
    subjectId?: number;
    groupId?: number;
    date?: string;
    from?: string;
    to?: string;
    page?: number;
    size?: number;
}

/** Возвращает PageResponse когда нет специфических фильтров, иначе массив */
export const fetchAttendance = async (
    params?: FetchAttendanceParams
): Promise<PageResponse<AttendanceResponse> | AttendanceResponse[]> => {
    const res = await api.get("/api/attendance", { params: { page: 0, size: 50, ...params } });
    return res.data;
};

export const createAttendance = async (data: AttendanceRequest): Promise<AttendanceResponse> => {
    const res = await api.post("/api/attendance", data);
    return res.data;
};

export const updateAttendance = async (id: number, data: AttendanceRequest): Promise<AttendanceResponse> => {
    const res = await api.put(`/api/attendance/${id}`, data);
    return res.data;
};

export const deleteAttendance = async (id: number): Promise<void> => {
    await api.delete(`/api/attendance/${id}`);
};

export const isPageResponse = (data: any): data is PageResponse<AttendanceResponse> =>
    data && typeof data === "object" && "content" in data && "totalElements" in data;