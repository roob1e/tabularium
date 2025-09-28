import React, { useEffect, useState, useRef } from "react";
import { Table, Button, Modal, Form, Input, message, AutoComplete } from "antd";
import { Student, Group } from "../types.ts";
import { fetchStudents, createStudent, deleteStudent, updateStudent } from "../api/studentsApi.ts";
import { getAllGroups } from "../api/groupApi.ts";
import { SortOrder } from "antd/es/table/interface";

const StudentsTable: React.FC = () => {
    const [students, setStudents] = useState<Student[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);

    const [tableScrollY, setTableScrollY] = useState<number>(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const [form] = Form.useForm();
    const [editForm] = Form.useForm();

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

    // Загрузка данных
    const loadStudents = async () => {
        setLoading(true);
        try {
            const data = await fetchStudents();
            setStudents(data.map((s: any) => ({ ...s, groupName: s.groupName || s.group?.name || "" })));
        } catch (err: any) {
            message.error(err.message);
        } finally {
            setLoading(false);
        }
    };

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

    // Вычисляем высоту таблицы
    useEffect(() => {
        const updateHeight = () => {
            if (containerRef.current) {
                const containerHeight = containerRef.current.clientHeight;
                const topBlock = containerRef.current.querySelector("div");
                const topBlockHeight = topBlock ? (topBlock as HTMLElement).clientHeight + 8 : 0;
                // +8 = нижний отступ под кнопкой

                const bottomOffset = Math.max(window.innerHeight * 0.05, 24);
                setTableScrollY(containerHeight - topBlockHeight - bottomOffset);
            }
        };

        updateHeight();
        window.addEventListener("resize", updateHeight);
        return () => window.removeEventListener("resize", updateHeight);
    }, []);

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
        { title: "ID", dataIndex: "id", key: "id", sorter: (a: Student, b: Student) => a.id - b.id, defaultSortOrder: "ascend" as SortOrder },
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
                    <Button className="edit-btn" onClick={() => openEditModal(record)} style={{ marginRight: 8 }}>
                        Изменить
                    </Button>
                    <Button className="delete-btn" onClick={() => handleDelete(record.id)}>
                        Удалить
                    </Button>
                </>
            ),
        }
    ];

    return (
        <div ref={containerRef} style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
            padding: "10px 10px 0 10px"
        }}>
            {/* Верхний блок с кнопкой */}
            <div style={{ marginBottom: 8 }}>
                <Button type="primary" onClick={() => setIsModalOpen(true)}>
                    Добавить ученика (Shift + N)
                </Button>
            </div>

            {/* Таблица с прокруткой только внутри */}
            <div style={{ flex: 1, minHeight: 0 }}>
                <Table
                    dataSource={students}
                    columns={columns}
                    rowKey="id"
                    pagination={false}
                    loading={loading}
                    scroll={{ y: tableScrollY }}
                />
            </div>

            {/* Модалки */}
            <Modal title="Добавить ученика" open={isModalOpen} onCancel={() => setIsModalOpen(false)} footer={null}>
                <Form form={form} onFinish={onFinish} layout="vertical">
                    <Form.Item name="fullname" label="ФИО" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="age" label="Возраст" rules={[{ required: true }]}><Input type="number" /></Form.Item>
                    <Form.Item name="phone" label="Телефон" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="birthdate" label="Дата рождения" rules={[{ required: true }]}><Input type="date" /></Form.Item>
                    <Form.Item name="groupName" label="Класс" rules={[{ required: true }]}>
                        <AutoComplete
                            options={groups.map((g) => ({ value: g.name }))}
                            onChange={(value) => form.setFieldsValue({ groupName: value })}
                            filterOption={(inputValue, option) => option!.value.toLowerCase().includes(inputValue.toLowerCase())}
                        >
                            <Input placeholder="Выберите или введите группу" />
                        </AutoComplete>
                    </Form.Item>
                    <Form.Item><Button type="primary" htmlType="submit" block>Сохранить</Button></Form.Item>
                </Form>
            </Modal>

            <Modal title="Изменить ученика" open={isEditModalOpen} onCancel={() => setIsEditModalOpen(false)} footer={null}>
                <Form form={editForm} onFinish={onEditFinish} layout="vertical">
                    <Form.Item name="fullname" label="ФИО" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="age" label="Возраст" rules={[{ required: true }]}><Input type="number" /></Form.Item>
                    <Form.Item name="phone" label="Телефон" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="birthdate" label="Дата рождения" rules={[{ required: true }]}><Input type="date" /></Form.Item>
                    <Form.Item name="groupName" label="Класс" rules={[{ required: true }]}>
                        <AutoComplete
                            options={groups.map((g) => ({ value: g.name }))}
                            onChange={(value) => editForm.setFieldsValue({ groupName: value })}
                            filterOption={(inputValue, option) => option!.value.toLowerCase().includes(inputValue.toLowerCase())}
                        >
                            <Input placeholder="Выберите или введите группу" />
                        </AutoComplete>
                    </Form.Item>
                    <Form.Item><Button type="primary" htmlType="submit" block>Сохранить изменения</Button></Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default StudentsTable;
