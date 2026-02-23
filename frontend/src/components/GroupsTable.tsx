import React, { useEffect, useState, useRef } from "react";
import { Table, Modal, Button, Form, Input, message } from "antd";
import { Group } from "../types/types.ts";
import { createGroup, deleteGroup, getAllGroups } from "../api/groups.ts";

const GroupsTable: React.FC = () => {
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [tableScrollY, setTableScrollY] = useState<number>(0);

    const [form] = Form.useForm();
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

    const loadGroups = async () => {
        setLoading(true);
        try {
            const data = await getAllGroups();
            setGroups(data);
        } catch (err: any) {
            message.error(err.message || "Ошибка при загрузке групп");
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
            await loadGroups();
        } catch (err: any) {
            message.error(err.message || "Ошибка при добавлении группы");
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
                <Button className="delete-btn" onClick={() => handleDelete(record.name)}>
                    Удалить
                </Button>
            ),
        },
    ];

    // вычисляем высоту таблицы
    useEffect(() => {
        const updateHeight = () => {
            if (containerRef.current) {
                const containerHeight = containerRef.current.clientHeight;
                const topBlock = containerRef.current.querySelector("div");
                const topBlockHeight = topBlock ? (topBlock as HTMLElement).clientHeight + 8 : 0;

                // адаптивный отступ снизу: 5% экрана, но минимум 24px
                const bottomOffset = Math.max(window.innerHeight * 0.05, 24);

                setTableScrollY(containerHeight - topBlockHeight - bottomOffset);
            }
        };
        updateHeight();
        window.addEventListener("resize", updateHeight);
        return () => window.removeEventListener("resize", updateHeight);
    }, []);

    return (
        <div
            ref={containerRef}
            style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                minHeight: 0,
                padding: "10px 10px 0 10px",
            }}
        >
            {/* Кнопка добавления группы */}
            <div style={{ marginBottom: 8 }}>
                <Button type="primary" onClick={() => setIsModalOpen(true)}>
                    Добавить группу (Shift + N)
                </Button>
            </div>

            {/* Таблица */}
            <div style={{ flex: 1, minHeight: 0, paddingBottom: 40 }}>
                <Table
                    dataSource={groups}
                    columns={columns}
                    rowKey="name"
                    loading={loading}
                    pagination={false}
                    scroll={{ y: tableScrollY }}
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