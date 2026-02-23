import api from './api';

const PATH = '/api/students';

export const fetchStudents = async () => {
    const res = await api.get(PATH);
    return res.data;
};

export const createStudent = async (studentData: any) => {
    const res = await api.post(PATH, studentData);
    return res.data;
};

export const deleteStudent = async (id: number) => {
    const res = await api.delete(`${PATH}/${id}`);
    return res.data;
};

export const updateStudent = async (id: number, studentData: any) => {
    const res = await api.put(`${PATH}/${id}`, studentData);
    return res.data;
};