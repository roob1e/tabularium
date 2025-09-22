const BASE_URL = "http://localhost:8080/api/students";

export const fetchStudents = async () => {
    const res = await fetch(BASE_URL);
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to fetch students\n${res.statusText}\n${text}`);
    }
    return res.json();
}

export const createStudent = async (studentData: any) => {
    const res = await fetch(BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(studentData),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to create student\n${res.statusText}\n${text}`);
    }
    return res.json();
}

export const deleteStudent = async (id: number) => {
    const res = await fetch(`${BASE_URL}/${id}`, { method: "DELETE" });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to delete student\n${res.statusText}\n${text}`);
    }
    return res.json();
}

export const updateStudent = async (id: number, studentData: any) => {
    const res = await fetch(`${BASE_URL}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(studentData),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to update student\n${res.statusText}\n${text}`);
    }
    return res.json();
}