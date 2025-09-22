import React, { useEffect, useState, useRef } from "react";
import { Table, Button, Modal, Form, Input, message, AutoComplete } from "antd";
import { Student, Group } from "../types.ts";
import { fetchStudents, createStudent, deleteStudent, updateStudent } from "../api/studentsApi.ts";
import { getAllGroups } from "../api/groupApi.ts";
import {SortOrder} from "antd/es/table/interface";

interface TableProps {
    tableHeight: number;
}

const StudentsTable: React.FC<TableProps> = ({ tableHeight }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);

    const [form] = Form.useForm();
    const [editForm] = Form.useForm();

    const containerRef = useRef<HTMLDivElement>(null);

    // Горячие клавиши
    useEffect(() => {
        const handleShortcut = (event: KeyboardEvent) => {
            if (event.shiftKey && ["n", "т"].includes(event.key.toLowerCase())) {
                event.preventDefault();
                setIsModalOpen(true);
            }
        };
        window.addEventListener("keydown", handleShortcut);
        return () => window.removeEventListener("keydown", handleShortcut);
    }, []);

    // Загрузка студентов
    const loadStudents = async () => {
        setLoading(true);
        try {
            const data = await fetchStudents();
            const formatted: Student[] = data.map((s: any) => ({
                ...s,
                groupName: s.groupName || s.group?.name || "",
            }));
            setStudents(formatted);
        } catch (err: any) {
            message.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Загрузка групп
    const loadGroups = async () => {
        try {
            const data = await getAllGroups();
            setGroups(data);
        } catch (err: any) {
            message.error(err.message || "Ошибка при загрузке групп");
        }
    };

    useEffect(() => {
        loadStudents();
        loadGroups();
    }, []);

    // Добавление
    const onFinish = async (values: any) => {
        try {
            await createStudent(values);
            message.success("Ученик добавлен!");
            setIsModalOpen(false);
            form.resetFields();
            await loadStudents();
        } catch (err: any) {
            message.error(err.message || "Ошибка при добавлении ученика");
        }
    };

    // Редактирование
    const openEditModal = (student: Student) => {
        setEditingStudent(student);
        setIsEditModalOpen(true);
        editForm.setFieldsValue({
            fullname: student.fullname,
            age: student.age,
            phone: student.phone,
            birthdate: student.birthdate,
            groupName: student.groupName,
        });
    };

    const onEditFinish = async (values: any) => {
        if (!editingStudent) return;
        try {
            await updateStudent(editingStudent.id, values);
            message.success("Ученик обновлён!");
            setIsEditModalOpen(false);
            editForm.resetFields();
            setEditingStudent(null);
            await loadStudents();
        } catch (err: any) {
            message.error(err.message || "Ошибка при обновлении ученика");
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await deleteStudent(id);
            message.success("Ученик удалён!");
        } catch (err: any) {
            message.error(err.message || "Не удалось удалить студента");
        } finally {
            await loadStudents();
        }
    };

    const columns = [
        {
            title: "ID",
            dataIndex: "id",
            key: "id",
            sorter: (a: Student, b: Student) => a.id - b.id, // добавляем сортировщик
            defaultSortOrder: "ascend" as SortOrder,
        },
        { title: "ФИО", dataIndex: "fullname", key: "fullname" },
        { title: "Возраст", dataIndex: "age", key: "age" },
        { title: "Телефон", dataIndex: "phone", key: "phone" },
        { title: "Дата рождения", dataIndex: "birthdate", key: "birthdate" },
        { title: "Класс", dataIndex: "groupName", key: "groupName" },
        {
            title: "Действия",
            key: "actions",
            render: (_: any, record: Student) => (
                <>
                    <Button type="link" onClick={() => openEditModal(record)} style={{ marginRight: 8 }}>
                        Изменить
                    </Button>
                    <Button danger onClick={() => handleDelete(record.id)}>
                        Удалить
                    </Button>
                </>
            ),
        },
    ];

    return (
        <div ref={containerRef} style={{ padding: 20, height: tableHeight, display: "flex", flexDirection: "column" }}>
            <div style={{ marginBottom: 8 }}>
                <Button type="primary" onClick={() => setIsModalOpen(true)}>
                    Добавить ученика (Shift + N)
                </Button>
            </div>

            <div style={{ flex: 1, overflowY: "auto" }}>
                <Table dataSource={students} columns={columns} rowKey="id" loading={loading} pagination={false} />
            </div>

            {/* Модалка добавить */}
            <Modal title="Добавить ученика" open={isModalOpen} onCancel={() => setIsModalOpen(false)} footer={null}>
                <Form form={form} onFinish={onFinish} layout="vertical">
                    <Form.Item name="fullname" label="ФИО" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="age" label="Возраст" rules={[{ required: true }]}>
                        <Input type="number" />
                    </Form.Item>
                    <Form.Item name="phone" label="Телефон" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="birthdate" label="Дата рождения" rules={[{ required: true }]}>
                        <Input type="date" />
                    </Form.Item>
                    <Form.Item name="groupName" label="Класс" rules={[{ required: true }]}>
                        <AutoComplete
                            options={groups.map((g) => ({ value: g.name }))}
                            onChange={(value) => form.setFieldsValue({ groupName: value })}
                            filterOption={(inputValue, option) =>
                                option!.value.toLowerCase().includes(inputValue.toLowerCase())
                            }
                        >
                            <Input placeholder="Выберите или введите группу" />
                        </AutoComplete>
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" block>
                            Сохранить
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Модалка редактировать */}
            <Modal title="Изменить ученика" open={isEditModalOpen} onCancel={() => setIsEditModalOpen(false)} footer={null}>
                <Form form={editForm} onFinish={onEditFinish} layout="vertical">
                    <Form.Item name="fullname" label="ФИО" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="age" label="Возраст" rules={[{ required: true }]}>
                        <Input type="number" />
                    </Form.Item>
                    <Form.Item name="phone" label="Телефон" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="birthdate" label="Дата рождения" rules={[{ required: true }]}>
                        <Input type="date" />
                    </Form.Item>
                    <Form.Item name="groupName" label="Класс" rules={[{ required: true }]}>
                        <AutoComplete
                            options={groups.map((g) => ({ value: g.name }))}
                            onChange={(value) => editForm.setFieldsValue({ groupName: value })}
                            filterOption={(inputValue, option) =>
                                option!.value.toLowerCase().includes(inputValue.toLowerCase())
                            }
                        >
                            <Input placeholder="Выберите или введите группу" />
                        </AutoComplete>
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" block>
                            Сохранить изменения
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default StudentsTable;
