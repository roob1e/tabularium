import React, { useEffect, useState, useRef } from "react";
import { Table, Button, Modal, Form, Input, message, AutoComplete } from "antd";
import { Student, Group } from "../types.ts";
import { fetchStudents, createStudent, deleteStudent } from "../api/studentsApi.ts";
import { getAllGroups } from "../api/groupApi.ts";

interface TableProps {
    tableHeight: number;
}

const StudentsTable: React.FC<TableProps> = ({ tableHeight }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form] = Form.useForm();
    const containerRef = useRef<HTMLDivElement>(null);

    // Загрузка студентов
    const loadStudents = async () => {
        setLoading(true);
        try {
            const data = await fetchStudents();
            // Маппим данные, чтобы гарантировать наличие поля groupName
            const formatted = data.map((s: any) => ({
                ...s,
                groupName: s.groupName || s.group || "",
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

    const onFinish = async (values: any) => {
        const newStudent = {
            fullname: values.fullname,
            age: values.age,
            phone: values.phone,
            birthdate: values.birthdate,
            groupName: values.group,
        };
        try {
            await createStudent(newStudent);
            message.success("Ученик добавлен!");
            setIsModalOpen(false);
            form.resetFields();
        } catch (err: any) {
            message.error(err.message || "Ошибка при добавлении ученика");
        } finally {
            await loadStudents();
        }
    };

    const handleDelete = async (id: number) => {
        try {
            const res = await deleteStudent(id);
            if (!res.ok) throw new Error(`Ошибка при удалении студента: ${res.statusText}`);
            message.success("Ученик удалён!");
        } catch (err: any) {
            message.error(err.message || "Не удалось удалить студента");
        } finally {
            await loadStudents();
        }
    };

    const columns = [
        { title: "ID", dataIndex: "id", key: "id" },
        { title: "ФИО", dataIndex: "fullname", key: "fullname" },
        { title: "Возраст", dataIndex: "age", key: "age" },
        { title: "Телефон", dataIndex: "phone", key: "phone" },
        {
            title: "Дата рождения",
            key: "birthdate",
            render: (_: any, record: Student) => {
                if (!record.birthdate) return "";
                const d = new Date(record.birthdate);
                const day = String(d.getDate()).padStart(2, "0");
                const month = String(d.getMonth() + 1).padStart(2, "0");
                const year = d.getFullYear();
                return `${day}.${month}.${year}`;
            },
        },
        {
            title: "Класс",
            key: "group",
            render: (_: any, record: Student) => record.group?.name || "",
        },
        {
            title: "Действия",
            key: "actions",
            render: (_: any, record: Student) => (
                <Button danger onClick={() => handleDelete(record.id)}>Удалить</Button>
            ),
        },
    ];

    return (
        <div
            ref={containerRef}
            style={{
                paddingLeft: 20,
                paddingRight: 20,
                paddingTop: 8,
                paddingBottom: 20,
                height: tableHeight,
                display: "flex",
                flexDirection: "column",
            }}
        >
            {/* Закреплённая кнопка */}
            <div style={{ background: "transparent", padding: "4px 0", zIndex: 1 }}>
                <Button
                    type="primary"
                    onClick={() => setIsModalOpen(true)}
                    style={{ marginLeft: 8 }}
                >
                    Добавить ученика
                </Button>
            </div>

            {/* Таблица с прокруткой */}
            <div style={{ flex: 1, overflowY: "auto", marginTop: 8 }}>
                <Table
                    dataSource={students}
                    columns={columns}
                    rowKey="id"
                    loading={loading}
                    pagination={false}
                    style={{ minWidth: "100%" }}
                />
            </div>

            {/* Модалка */}
            <Modal
                title="Добавить ученика"
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
            >
                <Form onFinish={onFinish} layout="vertical" form={form}>
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

                    {/* AutoComplete с Input внутри */}
                    <Form.Item name="group" label="Класс" rules={[{ required: true }]}>
                        <AutoComplete
                            options={groups.map((g) => ({ value: g.name }))}
                            filterOption={(inputValue, option) =>
                                option!.value.toLowerCase().includes(inputValue.toLowerCase())
                            }
                            style={{ width: "100%" }}
                            onChange={(value) => form.setFieldsValue({ group: value })}
                            onFocus={(e) => {
                                const target = e.target as HTMLInputElement;
                                target.select();
                            }}
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
        </div>
    );
};

export default StudentsTable;