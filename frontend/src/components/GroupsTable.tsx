import React, { useEffect, useState, useRef } from "react";
import { Table, Modal, Button, Form, Input, message } from "antd";
import { Group } from "../types/types.ts";
import { createGroup, deleteGroup, getAllGroups } from "../api/groups.ts";
import { useSearchHighlight } from "../hooks/useSearchHighlight.ts";

interface Props {
    highlightId?: number | null;
    onHighlightClear?: () => void;
    searchQuery?: string;
}

const GroupsTable: React.FC<Props> = ({ highlightId, onHighlightClear, searchQuery = "" }) => {
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [tableScrollY, setTableScrollY] = useState<number>(0);
    const [activeHighlightId, setActiveHighlightId] = useState<number | null>(null);

    const [form] = Form.useForm();
    const containerRef = useRef<HTMLDivElement>(null);
    const tableRef = useRef<HTMLDivElement>(null);
    const firstInputRef = useRef<any>(null);

    const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    const shortcutSubmit = isMac ? "shift + return" : "Shift + Enter";
    const shortcutAdd = isMac ? "shift + n" : "Shift + N";

    const { getRowClassName: getSearchRowClass } = useSearchHighlight(
        groups,
        searchQuery,
        (g, q) => g.name.toLowerCase().includes(q),
        tableRef
    );

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

    useEffect(() => { loadGroups(); }, []);

    useEffect(() => {
        if (!highlightId || loading) return;
        setActiveHighlightId(highlightId);
        setTimeout(() => {
            const row = tableRef.current?.querySelector(`[data-row-key="${highlightId}"]`);
            if (row) row.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
        const timer = setTimeout(() => { setActiveHighlightId(null); onHighlightClear?.(); }, 2000);
        return () => clearTimeout(timer);
    }, [highlightId]);

    useEffect(() => {
        const handleShortcut = (event: KeyboardEvent) => {
            const key = event.key.toLowerCase();
            if (event.shiftKey && ["n", "т"].includes(key)) {
                if (!isModalOpen) { event.preventDefault(); form.resetFields(); setIsModalOpen(true); }
            }
        };
        window.addEventListener("keydown", handleShortcut);
        return () => window.removeEventListener("keydown", handleShortcut);
    }, [isModalOpen, form]);

    useEffect(() => {
        const updateHeight = () => {
            if (containerRef.current) {
                const containerHeight = containerRef.current.clientHeight;
                const topBlock = containerRef.current.querySelector("div");
                const topBlockHeight = topBlock ? (topBlock as HTMLElement).clientHeight + 8 : 0;
                setTableScrollY(containerHeight - topBlockHeight - 60);
            }
        };
        updateHeight();
        window.addEventListener("resize", updateHeight);
        return () => window.removeEventListener("resize", updateHeight);
    }, []);

    const onFinish = async (values: any) => {
        try {
            await createGroup({ name: values.name, amount: 0 });
            message.success("Группа добавлена!");
            setIsModalOpen(false);
            form.resetFields();
            await loadGroups();
        } catch (err: any) {
            message.error(err.message || "Ошибка при добавлении группы");
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await deleteGroup(id);
            message.success("Группа удалена!");
            await loadGroups();
        } catch (err: any) {
            message.error(err.message || "Ошибка при удалении группы");
        }
    };

    const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (e.shiftKey) { e.currentTarget.requestSubmit(); return; }
            const target = e.target as HTMLElement;
            if ((target as any).type === "submit") return;
            const allElements = Array.from(e.currentTarget.querySelectorAll("input, .ant-select-selection-search-input")) as HTMLElement[];
            const index = allElements.indexOf(target);
            if (index > -1 && index < allElements.length - 1) allElements[index + 1].focus();
        }
    };

    const getRowClassName = (record: Group) => {
        if (record.id === activeHighlightId) return "row-highlighted";
        return getSearchRowClass(record);
    };

    const columns = [
        { title: "Название", dataIndex: "name", key: "name", width: 200, sorter: (a: Group, b: Group) => a.name.localeCompare(b.name), defaultSortOrder: "ascend" as const },
        { title: "Количество обучающихся", dataIndex: "amount", key: "amount", width: 220 },
        {
            title: "Действия", key: "actions", width: 120,
            render: (_: any, record: Group) => (
                <Button danger className="delete-btn" onClick={() => handleDelete(record.id)}>Удалить</Button>
            ),
        },
    ];

    return (
        <div ref={containerRef} style={{ height: "100%", display: "flex", flexDirection: "column", padding: "10px" }}>
            <style>{`
                .ant-table { border-bottom-left-radius: 8px !important; border-bottom-right-radius: 8px !important; overflow: hidden !important; }
                .ant-table-container { border-bottom-left-radius: 8px !important; border-bottom-right-radius: 8px !important; }
                .ant-table-tbody > tr > td { padding: 8px 16px !important; }
                .ant-table-thead > tr > th { padding: 8px 16px !important; }
                .row-highlighted td { background-color: rgba(22, 119, 255, 0.12) !important; transition: background-color 0.3s ease !important; }
            `}</style>
            <div style={{ marginBottom: 10 }}>
                <Button type="primary" onClick={() => { form.resetFields(); setIsModalOpen(true); }} style={{ position: 'relative' }}>
                    Добавить группу
                    <span style={{ opacity: 0.5, marginLeft: 12, fontSize: '0.8em' }}>{shortcutAdd}</span>
                </Button>
            </div>
            <div ref={tableRef}>
                <Table dataSource={groups} columns={columns} rowKey="id" loading={loading} pagination={false} scroll={{ y: tableScrollY }} rowClassName={getRowClassName} />
            </div>
            <Modal title="Добавить группу" open={isModalOpen} onCancel={() => setIsModalOpen(false)} footer={null} destroyOnClose afterOpenChange={(open) => open && firstInputRef.current?.focus()}>
                <Form form={form} onFinish={onFinish} layout="vertical" onKeyDown={handleFormKeyDown}>
                    <Form.Item label="Название группы" name="name" rules={[{ required: true, message: "Введите название группы" }]}>
                        <Input ref={firstInputRef} placeholder="П-11, П-12..." autoComplete="off" />
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0 }}>
                        <Button type="primary" htmlType="submit" block style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
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