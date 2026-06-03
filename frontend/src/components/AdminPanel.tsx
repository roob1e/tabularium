import React, { useEffect, useState } from "react";
import {
    Table, Button, Tabs, Tag, Space, message, Popconfirm,
    Select, Modal, DatePicker, Form, Typography
} from "antd";
import {
    CheckOutlined, DeleteOutlined, UserOutlined,
    ClockCircleOutlined, CalendarOutlined
} from "@ant-design/icons";
import { fetchAllUsers, approveUser, deleteUser, setUserRole, UserResponse } from "../api/admin";
import { toast } from "react-toastify";
import api from "../api/api";
import dayjs from "dayjs";

const { Text } = Typography;

type Role = "ADMIN" | "TEACHER";

const AdminPanel: React.FC = () => {
    const [users, setUsers] = useState<UserResponse[]>([]);
    const [loading, setLoading] = useState(false);

    // Scheduler
    const [isSchedulerModalOpen, setIsSchedulerModalOpen] = useState(false);
    const [schedulerForm] = Form.useForm();
    const [currentCron, setCurrentCron] = useState<string | null>(null);
    const [schedulerLoading, setSchedulerLoading] = useState(false);

    const loadUsers = async () => {
        setLoading(true);
        try {
            setUsers(await fetchAllUsers());
        } catch (e: any) {
            message.error(e.message);
        } finally {
            setLoading(false);
        }
    };

    const loadCron = async () => {
        try {
            const res = await api.get("/scheduler/cron");
            setCurrentCron(res.data);
        } catch { /* ignore */ }
    };

    useEffect(() => { loadUsers(); loadCron(); }, []);

    const handleApprove = async (id: number) => {
        try {
            await approveUser(id);
            toast.success("Пользователь одобрен");
            loadUsers();
        } catch (e: any) { toast.error(e.message); }
    };

    const handleDelete = async (id: number) => {
        try {
            await deleteUser(id);
            message.success("Пользователь удалён");
            loadUsers();
        } catch (e: any) { message.error(e.message); }
    };

    const handleRoleChange = async (id: number, val: string) => {
        try {
            await setUserRole(id, val as Role);
            message.success("Роль обновлена");
            loadUsers();
        } catch (e: any) { message.error(e.message); }
    };

    const handleSetSchedulerDate = async (values: any) => {
        if (!values.date) return;
        setSchedulerLoading(true);
        try {
            const dateStr = values.date.format("DD.MM");
            const res = await api.post("/scheduler/date", `"${dateStr}"`, {
                headers: { "Content-Type": "application/json" },
            });
            message.success("Дата автоперевода обновлена");
            setCurrentCron(res.data?.replace("Cron updated to: ", "") || null);
            setIsSchedulerModalOpen(false);
            schedulerForm.resetFields();
            loadCron();
        } catch (e: any) {
            message.error(e.response?.data || e.message);
        } finally {
            setSchedulerLoading(false);
        }
    };

    const parseCronToDate = (cron: string | null): string => {
        if (!cron) return "не задана";
        // format: "0 0 0 DD MM *"
        const parts = cron.trim().split(" ");
        if (parts.length >= 5) {
            const day = parts[3];
            const month = parts[4];
            try {
                return dayjs(`2025-${month.padStart(2, "0")}-${day.padStart(2, "0")}`).format("D MMMM");
            } catch { return cron; }
        }
        return cron;
    };

    const pending = users.filter(u => !u.approved);
    const all = users.filter(u => u.approved);

    const pendingColumns = [
        { title: "ID", dataIndex: "id", key: "id", width: 70 },
        { title: "Логин", dataIndex: "username", key: "username" },
        { title: "ФИО", dataIndex: "fullname", key: "fullname" },
        {
            title: "Действия", key: "actions",
            render: (_: any, r: UserResponse) => (
                <Space>
                    <Button type="primary" icon={<CheckOutlined />} onClick={() => handleApprove(r.id)}>Одобрить</Button>
                    <Popconfirm title="Отклонить заявку?" description="Пользователь будет удалён." onConfirm={() => handleDelete(r.id)} okText="Да" cancelText="Нет">
                        <Button danger icon={<DeleteOutlined />}>Отклонить</Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const allColumns = [
        { title: "ID", dataIndex: "id", key: "id", width: 70 },
        { title: "Логин", dataIndex: "username", key: "username" },
        { title: "ФИО", dataIndex: "fullname", key: "fullname" },
        {
            title: "Роль", dataIndex: "role", key: "role", width: 160,
            render: (role: string, r: UserResponse) => (
                <Select value={role} size="small" style={{ width: 150 }}
                        onChange={(val: string) => handleRoleChange(r.id, val)}
                        options={[{ value: "ADMIN", label: "Администратор" }, { value: "TEACHER", label: "Учитель" }]} />
            ),
        },
        {
            title: "Статус", dataIndex: "approved", key: "approved", width: 110,
            render: (approved: boolean) => <Tag color={approved ? "green" : "orange"}>{approved ? "Активен" : "Ожидает"}</Tag>,
        },
        {
            title: "Действия", key: "actions", width: 120,
            render: (_: any, r: UserResponse) => (
                <Popconfirm title="Удалить пользователя?" description="Это действие необратимо." onConfirm={() => handleDelete(r.id)} okText="Да" cancelText="Нет">
                    <Button danger icon={<DeleteOutlined />}>Удалить</Button>
                </Popconfirm>
            ),
        },
    ];

    const tabItems = [
        {
            key: "1",
            label: (
                <span>
                    <ClockCircleOutlined style={{ marginRight: 6 }} />
                    Заявки
                    {pending.length > 0 && <Tag color="red" style={{ marginLeft: 8, fontSize: 11 }}>{pending.length}</Tag>}
                </span>
            ),
            children: (
                <Table dataSource={pending} columns={pendingColumns} rowKey="id" loading={loading}
                       pagination={false} locale={{ emptyText: "Нет новых заявок" }} />
            ),
        },
        {
            key: "2",
            label: <span><UserOutlined style={{ marginRight: 6 }} />Пользователи</span>,
            children: (
                <Table dataSource={all} columns={allColumns} rowKey="id" loading={loading}
                       pagination={false} locale={{ emptyText: "Нет пользователей" }} />
            ),
        },
        {
            key: "3",
            label: <span><CalendarOutlined style={{ marginRight: 6 }} />Автоперевод</span>,
            children: (
                <div style={{ padding: "16px 0" }}>
                    <div style={{ marginBottom: 16 }}>
                        <Text type="secondary">
                            Дата автоматического перевода учащихся на следующий курс/класс:
                        </Text>
                        <br />
                        <Text strong style={{ fontSize: 16 }}>
                            {parseCronToDate(currentCron)}
                        </Text>
                        {currentCron && (
                            <Text type="secondary" style={{ marginLeft: 12, fontSize: 12 }}>
                                (cron: {currentCron})
                            </Text>
                        )}
                    </div>
                    <Button
                        type="primary"
                        icon={<CalendarOutlined />}
                        onClick={() => setIsSchedulerModalOpen(true)}
                    >
                        Изменить дату автоперевода
                    </Button>
                    <div style={{ marginTop: 12, color: "var(--ant-color-text-secondary, #888)", fontSize: 13 }}>
                        В эту дату все учащиеся автоматически переводятся в следующую группу
                        (например, П-41 → П-51, 10А → 11А). Выпускники без следующей группы отмечаются в логах.
                    </div>
                </div>
            ),
        },
    ];

    return (
        <div style={{ padding: 10 }}>
            <Tabs items={tabItems} />

            <Modal
                title="Дата автоматического перевода"
                open={isSchedulerModalOpen}
                onCancel={() => { setIsSchedulerModalOpen(false); schedulerForm.resetFields(); }}
                footer={null}
                destroyOnClose
            >
                <div style={{ marginBottom: 12, color: "var(--ant-color-text-secondary)" }}>
                    Выберите дату (день и месяц), когда произойдёт автоматический перевод учащихся на следующий курс.
                </div>
                <Form form={schedulerForm} onFinish={handleSetSchedulerDate} layout="vertical">
                    <Form.Item name="date" label="Дата перевода" rules={[{ required: true, message: "Выберите дату" }]}>
                        <DatePicker
                            format="DD.MM"
                            placeholder="ДД.ММ"
                            style={{ width: "100%" }}
                            picker="date"
                        />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" block loading={schedulerLoading}>
                        Установить дату
                    </Button>
                </Form>
            </Modal>
        </div>
    );
};

export default AdminPanel;