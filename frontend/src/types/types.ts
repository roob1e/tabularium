export interface Student {
    id: number;
    fullname: string;
    age: number;
    phone: string;
    birthdate: string;
    groupName: string;
    groupId: number;
}

export interface Group {
    id: number;
    name: string;
    amount: number;
}

export interface Subject {
    id: number;
    name: string;
    teacherIds?: number[];
}

export interface Teacher {
    id: number;
    fullname: string;
    phone: string;
    subjectIds?: number[];
    subjects?: Subject[];
}

export interface TeacherRequest {
    fullname: string;
    phone: string;
    subjectIds: number[];
}

export interface SubjectRequest {
    name: string;
    teacherIds?: number[];
}

export type WorkType = "CURRENT" | "CONTROL" | "INDEPENDENT" | "TEST" | "EXAM" | "FINAL";

export interface Grade {
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

export interface GradeRequest {
    studentId: number;
    subjectId: number;
    teacherId: number;
    grade: number;
    workType?: WorkType;
    gradeDate?: string;
    comment?: string;
}

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

export interface Attendance {
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

export type DayOfWeek = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY";

export interface Schedule {
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