import React, { useEffect, useState } from "react";
import { Table, Button, Tabs, Tag, Space, message, Popconfirm, Select } from "antd";
import { CheckOutlined, DeleteOutlined, UserOutlined, ClockCircleOutlined } from "@ant-design/icons";
import { fetchAllUsers, approveUser, deleteUser, setUserRole, UserResponse } from "../api/admin.ts";
import {toast} from "react-toastify";

type Role = "ADMIN" | "TEACHER";

const AdminPanel: React.FC = () => {
    const [users, setUsers] = useState<UserResponse[]>([]);
    const [loading, setLoading] = useState(false);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const data = await fetchAllUsers();
            setUsers(data);
        } catch (err: any) {
            message.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadUsers(); }, []);

    const handleApprove = async (id: number) => {
        try {
            await approveUser(id);
            toast.success("Пользователь одобрен");
            await loadUsers();
        } catch (err: any) {
            console.log("Approve error:", err.response?.status, err.response?.data);
            toast.error(err.message);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await deleteUser(id);
            message.success("Пользователь удалён");
            loadUsers();
        } catch (err: any) {
            message.error(err.message);
        }
    };

    const handleRoleChange = async (id: number, val: string) => {
        try {
            await setUserRole(id, val as Role);
            message.success("Роль обновлена");
            loadUsers();
        } catch (err: any) {
            message.error(err.message);
        }
    };

    const pending = users.filter(u => !u.approved);
    const all = users.filter(u => u.approved);

    const pendingColumns = [
        { title: "ID", dataIndex: "id", key: "id", width: 70 },
        { title: "Логин", dataIndex: "username", key: "username" },
        { title: "ФИО", dataIndex: "fullname", key: "fullname" },
        {
            title: "Действия", key: "actions",
            render: (_: any, record: UserResponse) => (
                <Space>
                    <Button type="primary" icon={<CheckOutlined />} onClick={() => handleApprove(record.id)}>
                        Одобрить
                    </Button>
                    <Popconfirm
                        title="Отклонить заявку?"
                        description="Пользователь будет удалён из базы данных."
                        onConfirm={() => handleDelete(record.id)}
                        okText="Да"
                        cancelText="Нет"
                    >
                        <Button danger icon={<DeleteOutlined />}>Отклонить</Button>
                    </Popconfirm>
                </Space>
            )
        }
    ];

    const allColumns = [
        { title: "ID", dataIndex: "id", key: "id", width: 70 },
        { title: "Логин", dataIndex: "username", key: "username" },
        { title: "ФИО", dataIndex: "fullname", key: "fullname" },
        {
            title: "Роль", dataIndex: "role", key: "role", width: 160,
            render: (role: string, record: UserResponse) => (
                <Select
                    value={role}
                    size="small"
                    style={{ width: 150 }}
                    onChange={(val: string) => handleRoleChange(record.id, val)}
                    options={[
                        { value: "ADMIN", label: "Администратор" },
                        { value: "TEACHER", label: "Учитель" },
                    ]}
                />
            )
        },
        {
            title: "Статус", dataIndex: "approved", key: "approved", width: 120,
            render: (approved: boolean) => (
                <Tag color={approved ? "green" : "orange"}>
                    {approved ? "Активен" : "Ожидает"}
                </Tag>
            )
        },
        {
            title: "Действия", key: "actions", width: 120,
            render: (_: any, record: UserResponse) => (
                <Popconfirm
                    title="Удалить пользователя?"
                    description="Это действие необратимо."
                    onConfirm={() => handleDelete(record.id)}
                    okText="Да"
                    cancelText="Нет"
                >
                    <Button danger icon={<DeleteOutlined />}>Удалить</Button>
                </Popconfirm>
            )
        }
    ];

    const tabItems = [
        {
            key: "1",
            label: (
                <span>
                    <ClockCircleOutlined style={{ marginRight: 6 }} />
                    Заявки
                    {pending.length > 0 && (
                        <Tag color="red" style={{ marginLeft: 8, fontSize: 11 }}>{pending.length}</Tag>
                    )}
                </span>
            ),
            children: (
                <Table
                    dataSource={pending}
                    columns={pendingColumns}
                    rowKey="id"
                    loading={loading}
                    pagination={false}
                    locale={{ emptyText: "Нет новых заявок" }}
                />
            )
        },
        {
            key: "2",
            label: (
                <span>
                    <UserOutlined style={{ marginRight: 6 }} />
                    Пользователи
                </span>
            ),
            children: (
                <Table
                    dataSource={all}
                    columns={allColumns}
                    rowKey="id"
                    loading={loading}
                    pagination={false}
                    locale={{ emptyText: "Нет пользователей" }}
                />
            )
        }
    ];

    return (
        <div style={{ padding: "10px" }}>
            <Tabs items={tabItems} />
        </div>
    );
};

export default AdminPanel;