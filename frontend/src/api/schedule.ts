import api from "./api";

export type DayOfWeek = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY";

export const DAY_LABELS: Record<DayOfWeek, string> = {
    MONDAY: "Понедельник",
    TUESDAY: "Вторник",
    WEDNESDAY: "Среда",
    THURSDAY: "Четверг",
    FRIDAY: "Пятница",
    SATURDAY: "Суббота",
};

export interface ScheduleRequest {
    groupId: number;
    subjectId: number;
    teacherId?: number;
    dayOfWeek: DayOfWeek;
    lessonNumber: number;
    classroom?: string;
}

export interface ScheduleResponse {
    id: number;
    groupId: number;
    groupName?: string;
    subjectId: number;
    subjectName?: string;
    teacherId?: number;
    teacherName?: string;
    dayOfWeek: DayOfWeek;
    lessonNumber: number;
    classroom?: string;
}

export const fetchSchedule = async (params?: {
    groupId?: number;
    day?: DayOfWeek;
    teacherId?: number;
}): Promise<ScheduleResponse[]> => {
    try {
        const res = await api.get("/api/schedule", { params });
        return Array.isArray(res.data) ? res.data : [];
    } catch {
        return [];
    }
};

export const createScheduleEntry = async (data: ScheduleRequest): Promise<ScheduleResponse> => {
    const res = await api.post("/api/schedule", data);
    return res.data;
};

export const updateScheduleEntry = async (id: number, data: ScheduleRequest): Promise<ScheduleResponse> => {
    const res = await api.put(`/api/schedule/${id}`, data);
    return res.data;
};

export const deleteScheduleEntry = async (id: number): Promise<void> => {
    await api.delete(`/api/schedule/${id}`);
};