// src/types.ts
export interface Student {
    id: number;
    fullname: string;
    age: number;
    phone: string;
    birthdate: string;
    group: { name: string };
}

export interface Group {
    name: string;
    amount: number;
}
