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
    const firstInputRef = useRef<any>(null);

    const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    const shortcutSubmit = isMac ? "shift + return" : "Shift + Enter";
    const shortcutAdd = isMac ? "shift + n" : "Shift + N";

    useEffect(() => {
        const handleShortcut = (event: KeyboardEvent) => {
            const key = event.key.toLowerCase();
            if (event.shiftKey && ["n", "т"].includes(key)) {
                if (!isModalOpen) {
                    event.preventDefault();
                    form.resetFields();
                    setIsModalOpen(true);
                }
            }
        };

        window.addEventListener("keydown", handleShortcut);
        return () => window.removeEventListener("keydown", handleShortcut);
    }, [isModalOpen, form]);

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

    const closeAddModal = () => {
        setIsModalOpen(false);
        form.resetFields();
    };

    const onFinish = async (values: any) => {
        const newGroup = { name: values.name, amount: 0 };
        try {
            await createGroup(newGroup);
            message.success("Группа добавлена!");
            closeAddModal();
            await loadGroups();
        } catch (err: any) {
            message.error(err.message || "Ошибка при добавлении группы");
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await deleteGroup(id);
            message.success("Группа удалена!");
        } catch (err: any) {
            message.error(err.message || "Ошибка при удалении группы");
        } finally {
            await loadGroups();
        }
    };

    const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (e.shiftKey) {
                e.currentTarget.requestSubmit();
            }
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
                <Button
                    danger
                    className="delete-btn"
                    onClick={() => handleDelete(record.id)}
                >
                    Удалить
                </Button>
            ),
        },
    ];

    useEffect(() => {
        const updateHeight = () => {
            if (containerRef.current) {
                const containerHeight = containerRef.current.clientHeight;
                const topBlock = containerRef.current.querySelector("div");
                const topBlockHeight = topBlock ? (topBlock as HTMLElement).clientHeight + 8 : 0;
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
            <div style={{ marginBottom: 8 }}>
                <Button
                    type="primary"
                    onClick={() => { form.resetFields(); setIsModalOpen(true); }}
                    style={{ position: 'relative' }}
                >
                    Добавить группу
                    <span style={{ opacity: 0.5, marginLeft: 12, fontSize: '0.8em' }}>{shortcutAdd}</span>
                </Button>
            </div>

            <div style={{ flex: 1, minHeight: 0, paddingBottom: 40 }}>
                <Table
                    dataSource={groups}
                    columns={columns}
                    rowKey="id"
                    loading={loading}
                    pagination={false}
                    scroll={{ y: tableScrollY }}
                />
            </div>

            <Modal
                title="Добавить группу"
                open={isModalOpen}
                onCancel={closeAddModal}
                footer={null}
                destroyOnClose
                afterOpenChange={(open) => open && firstInputRef.current?.focus()}
            >
                <Form
                    form={form}
                    onFinish={onFinish}
                    layout="vertical"
                    autoComplete="off"
                    onKeyDown={handleFormKeyDown}
                    initialValues={{ name: "" }}
                >
                    <Form.Item
                        label="Название группы"
                        name="name"
                        rules={[{ required: true, message: "Введите название группы" }]}
                    >
                        <Input ref={firstInputRef} placeholder="П-11, П-12..." autoComplete="off" />
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0 }}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            block
                            style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}
                        >
                            <span>Сохранить</span>
                            <span style={{ opacity: 0.5, position: 'absolute', right: 15, fontSize: '0.85em' }}>{shortcutSubmit}</span>
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default GroupsTable;