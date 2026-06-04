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

const { Text } = Typography;

type Role = "ADMIN" | "TEACHER";

// Парсит cron "0 0 0 DD MM *" -> "30 июля" без зависимости от dayjs locale
const MONTH_NAMES = [
    "", "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря"
];

const parseCronToDate = (cron: string | null): string => {
    if (!cron) return "не задана";
    // формат: "0 0 0 DD MM *"
    const parts = cron.trim().split(/\s+/);
    if (parts.length >= 5) {
        const day = parseInt(parts[3], 10);
        const month = parseInt(parts[4], 10);
        if (!isNaN(day) && !isNaN(month) && month >= 1 && month <= 12) {
            return `${day} ${MONTH_NAMES[month]}`;
        }
    }
    return cron;
};

const AdminPanel: React.FC = () => {
    const [users, setUsers] = useState<UserResponse[]>([]);
    const [loading, setLoading] = useState(false);

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
            // Бэк возвращает строку напрямую (не JSON-объект)
            const raw = typeof res.data === "string" ? res.data : String(res.data);
            setCurrentCron(raw.trim());
        } catch {
            // scheduler недоступен — не критично
        }
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
            await api.post("/scheduler/date", `"${dateStr}"`, {
                headers: { "Content-Type": "application/json" },
            });
            message.success("Дата автоперевода обновлена");
            setIsSchedulerModalOpen(false);
            schedulerForm.resetFields();
            // Перезагружаем cron чтобы показать актуальную дату
            loadCron();
        } catch (e: any) {
            message.error(e.response?.data || e.message);
        } finally {
            setSchedulerLoading(false);
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
            render: (_: any, r: UserResponse) => (
                <Space>
                    <Button type="primary" icon={<CheckOutlined />} onClick={() => handleApprove(r.id)}>Одобрить</Button>
                    <Popconfirm title="Отклонить заявку?" description="Пользователь будет удалён."
                                onConfirm={() => handleDelete(r.id)} okText="Да" cancelText="Нет">
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
                        options={[
                            { value: "ADMIN", label: "Администратор" },
                            { value: "TEACHER", label: "Учитель" },
                        ]} />
            ),
        },
        {
            title: "Статус", dataIndex: "approved", key: "approved", width: 110,
            render: (approved: boolean) => (
                <Tag color={approved ? "green" : "orange"}>{approved ? "Активен" : "Ожидает"}</Tag>
            ),
        },
        {
            title: "Действия", key: "actions", width: 120,
            render: (_: any, r: UserResponse) => (
                <Popconfirm title="Удалить пользователя?" description="Это действие необратимо."
                            onConfirm={() => handleDelete(r.id)} okText="Да" cancelText="Нет">
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
                    <div style={{ marginTop: 12, fontSize: 13, opacity: 0.6 }}>
                        В эту дату все учащиеся автоматически переводятся в следующую группу
                        (например, П-41 → П-51, 10А → 11А). Выпускники без следующей группы
                        отмечаются в логах сервера.
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
                <div style={{ marginBottom: 12, opacity: 0.65, fontSize: 13 }}>
                    Выберите дату (день и месяц), когда произойдёт автоматический перевод учащихся.
                </div>
                <Form form={schedulerForm} onFinish={handleSetSchedulerDate} layout="vertical">
                    <Form.Item name="date" label="Дата перевода" rules={[{ required: true, message: "Выберите дату" }]}>
                        <DatePicker
                            format="DD.MM"
                            placeholder="ДД.ММ"
                            style={{ width: "100%" }}
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