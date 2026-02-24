import React, { useEffect, useState, useRef } from "react";
import { Table, Button, Modal, Form, Input, message, Space, Tag, Tooltip } from "antd";
import { Subject, Teacher } from "../types/types.ts";
import { fetchSubjects, createSubject, deleteSubject, updateSubject } from "../api/subjects.ts";
import { fetchTeachers } from "../api/teachers.ts";
import { SortOrder } from "antd/es/table/interface";

interface Props {
    highlightId?: number | null;
    onHighlightClear?: () => void;
    onTagClick?: (tableKey: string, id: number) => void;
}

const SubjectsTable: React.FC<Props> = ({ highlightId, onHighlightClear, onTagClick }) => {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeHighlightId, setActiveHighlightId] = useState<number | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

    const [tableScrollY, setTableScrollY] = useState<number>(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const tableRef = useRef<HTMLDivElement>(null);
    const firstInputRef = useRef<any>(null);
    const editFirstInputRef = useRef<any>(null);

    const [form] = Form.useForm();
    const [editForm] = Form.useForm();

    const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    const shortcutSubmit = isMac ? "shift + return" : "Shift + Enter";
    const shortcutAdd = isMac ? "shift + n" : "Shift + N";

    const loadSubjects = async () => {
        setLoading(true);
        try {
            const data = await fetchSubjects();
            setSubjects(data);
        } catch (err: any) {
            message.error(err.message || "Ошибка при загрузке");
        } finally {
            setLoading(false);
        }
    };

    const loadTeachers = async () => {
        try {
            const data = await fetchTeachers();
            setTeachers(data);
        } catch (err: any) {
            message.error(err.message || "Ошибка при загрузке учителей");
        }
    };

    useEffect(() => {
        loadSubjects();
        loadTeachers();
    }, []);

    useEffect(() => {
        if (!highlightId || loading) return;

        setActiveHighlightId(highlightId);

        setTimeout(() => {
            const row = tableRef.current?.querySelector(`[data-row-key="${highlightId}"]`);
            if (row) row.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);

        const timer = setTimeout(() => {
            setActiveHighlightId(null);
            onHighlightClear?.();
        }, 2000);

        return () => clearTimeout(timer);
    }, [highlightId]);

    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            if (e.shiftKey && (key === 'n' || key === 'т')) {
                if (!isModalOpen && !isEditModalOpen) {
                    e.preventDefault();
                    form.resetFields();
                    setIsModalOpen(true);
                }
            }
        };
        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [isModalOpen, isEditModalOpen, form]);

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

    const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (e.shiftKey) {
                e.currentTarget.requestSubmit();
                return;
            }
            const target = e.target as HTMLElement;
            if ((target as any).type === "submit") return;
            const allElements = Array.from(e.currentTarget.querySelectorAll("input, .ant-select-selection-search-input")) as HTMLElement[];
            const index = allElements.indexOf(target);
            if (index > -1 && index < allElements.length - 1) {
                allElements[index + 1].focus();
            }
        }
    };

    const closeAddModal = () => {
        setIsModalOpen(false);
        form.resetFields();
    };

    const closeEditModal = () => {
        setIsEditModalOpen(false);
        editForm.resetFields();
        setEditingSubject(null);
    };

    const onFinish = async (values: any) => {
        try {
            await createSubject(values);
            message.success("Предмет добавлен!");
            closeAddModal();
            loadSubjects();
        } catch (err: any) {
            message.error(err.message || "Ошибка");
        }
    };

    const openEditModal = (subject: Subject) => {
        setEditingSubject(subject);
        setIsEditModalOpen(true);
    };

    const onEditFinish = async (values: any) => {
        if (!editingSubject) return;
        try {
            await updateSubject(editingSubject.id, values);
            message.success("Предмет обновлён!");
            closeEditModal();
            loadSubjects();
        } catch (err: any) {
            message.error(err.message || "Ошибка");
        }
    };

    const renderTeacherTags = (teacherIds: number[]) => {
        if (!teacherIds || teacherIds.length === 0) return "—";
        return (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {teacherIds.map(id => {
                    const t = teachers.find(t => t.id === id);
                    if (!t) return null;
                    return (
                        <Tooltip
                            key={id}
                            mouseEnterDelay={0.6}
                            title={
                                <div style={{ fontSize: 13 }}>
                                    <div><b>ФИО:</b> {t.fullname}</div>
                                    <div><b>Телефон:</b> {t.phone}</div>
                                </div>
                            }
                        >
                            <Tag
                                style={{ margin: 0, cursor: "pointer" }}
                                onClick={() => onTagClick?.("4", id)}
                            >
                                {t.fullname}
                            </Tag>
                        </Tooltip>
                    );
                })}
            </div>
        );
    };

    const columns = [
        {
            title: "Название предмета",
            dataIndex: "name",
            key: "name",
            sorter: (a: Subject, b: Subject) => a.name.localeCompare(b.name),
            defaultSortOrder: "ascend" as SortOrder
        },
        {
            title: "Учителя",
            dataIndex: "teacherIds",
            key: "teacherIds",
            render: (teacherIds: number[]) => renderTeacherTags(teacherIds)
        },
        {
            title: "Действия",
            key: "actions",
            render: (_: any, record: Subject) => (
                <Space>
                    <Button className="edit-btn" onClick={() => openEditModal(record)}>Изменить</Button>
                    <Button className="delete-btn" danger onClick={() => deleteSubject(record.id).then(loadSubjects)}>Удалить</Button>
                </Space>
            ),
        }
    ];

    return (
        <div ref={containerRef} style={{ height: "100%", display: "flex", flexDirection: "column", padding: "10px" }}>
            <style>
                {`
                    .ant-table {
                        border-bottom-left-radius: 8px !important;
                        border-bottom-right-radius: 8px !important;
                        overflow: hidden !important;
                    }
                    .ant-table-container {
                        border-bottom-left-radius: 8px !important;
                        border-bottom-right-radius: 8px !important;
                    }
                    .row-highlighted td {
                        background-color: rgba(22, 119, 255, 0.12) !important;
                        transition: background-color 0.3s ease !important;
                    }
                `}
            </style>
            <div style={{ marginBottom: 10 }}>
                <Button type="primary" onClick={() => { form.resetFields(); setIsModalOpen(true); }} style={{ position: 'relative' }}>
                    Добавить предмет
                    <span style={{ opacity: 0.5, marginLeft: 12, fontSize: '0.8em' }}>{shortcutAdd}</span>
                </Button>
            </div>
            <div ref={tableRef}>
                <Table
                    dataSource={subjects}
                    columns={columns}
                    rowKey="id"
                    pagination={false}
                    loading={loading}
                    scroll={{ y: tableScrollY }}
                    rowClassName={(record: Subject) => record.id === activeHighlightId ? "row-highlighted" : ""}
                />
            </div>

            <Modal
                title="Добавить предмет"
                open={isModalOpen}
                onCancel={closeAddModal}
                footer={null}
                destroyOnClose
                afterOpenChange={(open) => open && firstInputRef.current?.focus()}
            >
                <Form form={form} onFinish={onFinish} layout="vertical" onKeyDown={handleFormKeyDown}>
                    <Form.Item name="name" label="Название" rules={[{ required: true }]}>
                        <Input ref={firstInputRef} autoComplete="off" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" block style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
                        <span>Сохранить</span>
                        <span style={{ opacity: 0.5, position: 'absolute', right: 15, fontSize: '0.85em' }}>{shortcutSubmit}</span>
                    </Button>
                </Form>
            </Modal>

            <Modal
                title="Изменить предмет"
                open={isEditModalOpen}
                onCancel={closeEditModal}
                footer={null}
                destroyOnClose
                afterOpenChange={(open) => open && editFirstInputRef.current?.focus()}
            >
                {editingSubject && (
                    <Form
                        key={editingSubject.id}
                        form={editForm}
                        onFinish={onEditFinish}
                        layout="vertical"
                        onKeyDown={handleFormKeyDown}
                        initialValues={{ name: editingSubject.name }}
                    >
                        <Form.Item name="name" label="Название" rules={[{ required: true }]}>
                            <Input ref={editFirstInputRef} autoComplete="off" />
                        </Form.Item>
                        <Button type="primary" htmlType="submit" block style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
                            <span>Сохранить изменения</span>
                            <span style={{ opacity: 0.5, position: 'absolute', right: 15, fontSize: '0.85em' }}>{shortcutSubmit}</span>
                        </Button>
                    </Form>
                )}
            </Modal>
        </div>
    );
};

export default SubjectsTable;