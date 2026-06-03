import api from "./api";

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
    PRESENT: "Присутствовал",
    ABSENT: "Отсутствовал",
    LATE: "Опоздал",
    EXCUSED: "Уважительная причина",
};

export const ATTENDANCE_STATUS_COLORS: Record<AttendanceStatus, string> = {
    PRESENT: "green",
    ABSENT: "red",
    LATE: "orange",
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

export const fetchAttendance = async (params?: {
    studentId?: number;
    subjectId?: number;
    groupId?: number;
    date?: string;
    from?: string;
    to?: string;
}): Promise<AttendanceResponse[]> => {
    try {
        const res = await api.get("/api/attendance", { params });
        return Array.isArray(res.data) ? res.data : [];
    } catch {
        return [];
    }
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