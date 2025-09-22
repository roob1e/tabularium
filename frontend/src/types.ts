// src/types.ts
export interface Student {
    id: number;
    fullname: string;
    age: number;
    phone: string;
    birthdate: string;
    groupName: string;
}

export interface Group {
    name: string;
    amount: number;
}
