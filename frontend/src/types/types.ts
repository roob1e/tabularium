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

export interface Grade {
    id: number;
    studentId: number;
    subjectId: number;
    teacherId: number;
    grade: number;
}

export interface GradeRequest {
    studentId: number;
    subjectId: number;
    teacherId: number;
    grade: number;
}