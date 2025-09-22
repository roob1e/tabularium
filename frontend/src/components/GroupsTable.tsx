import React, { useEffect, useState, useRef } from "react";
import { Table, Modal, Button, Form, Input, message } from "antd";
import { Group } from "../types.ts";
import { createGroup, deleteGroup, getAllGroups } from "../api/groupApi.ts";

interface GroupsTableProps {
    tableHeight: number; // принимаем высоту из App
}

const GroupsTable: React.FC<GroupsTableProps> = ({ tableHeight }) => {
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form] = Form.useForm();
    const containerRef = useRef<HTMLDivElement>(null);


    // Shortcuts
    useEffect(() => {
        const handleShortcut = (event: KeyboardEvent) => {
            if (event.shiftKey && ["n", "т"].includes(event.key.toLowerCase())) {
                event.preventDefault();
                setIsModalOpen(true);
            }
        }

        window.addEventListener("keydown", handleShortcut);
        return () => window.removeEventListener("keydown", handleShortcut);
    })

    const loadGroups = async () => {
        setLoading(true);
        try {
            const data = await getAllGroups();
            setGroups(data);
        } catch (err: any) {
            message.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadGroups();
    }, []);

    const onFinish = async (values: any) => {
        const newGroup = { name: values.name, amount: 0 };
        try {
            await createGroup(newGroup);
            message.success("Группа добавлена!");
            setIsModalOpen(false);
            form.resetFields();
        } catch (err: any) {
            message.error(err.message || "Ошибка при добавлении группы");
        } finally {
            await loadGroups();
        }
    };

    const handleDelete = async (groupName: string) => {
        try {
            await deleteGroup(groupName);
            message.success("Группа удалена!");
        } catch (err: any) {
            message.error(err.message || "Ошибка при удалении группы");
        } finally {
            await loadGroups();
        }
    };

    const columns = [
        {
            title: "Название",
            dataIndex: "name",
            key: "name",
            sorter: (a: Group, b: Group) => a.name.localeCompare(b.name),
            defaultSortOrder: "ascend" as const,
        },
        {
            title: "Количество обучающихся",
            dataIndex: "amount",
            key: "amount",
        },
        {
            title: "Действия",
            key: "actions",
            render: (_: any, record: Group) => (
                <Button danger onClick={() => handleDelete(record.name)}>
                    Удалить
                </Button>
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
            {/* Закреплённая кнопка с внутренними паддингами и левым margin */}
            <div style={{ background: "transparent", padding: "4px 0", zIndex: 1 }}>
                <Button
                    type="primary"
                    onClick={() => setIsModalOpen(true)}
                    style={{ marginLeft: 8 }}
                >
                    Добавить группу (Shift + N)
                </Button>
            </div>

            {/* Таблица с прокруткой */}
            <div style={{ flex: 1, overflowY: "auto", marginTop: 8 }}>
                <Table
                    dataSource={groups}
                    columns={columns}
                    rowKey="name"
                    loading={loading}
                    pagination={false}
                    style={{ minWidth: "100%" }}
                />
            </div>

            {/* Модалка */}
            <Modal
                title="Добавить группу"
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
            >
                <Form form={form} onFinish={onFinish} layout="vertical" autoComplete="off">
                    <Form.Item
                        label="Название группы"
                        name="name"
                        rules={[{ required: true, message: "Введите название группы" }]}
                    >
                        <Input placeholder="П-11, П-12..." />
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

export default GroupsTable;