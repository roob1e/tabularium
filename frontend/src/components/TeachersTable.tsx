import React, { useEffect, useState, useRef } from "react";
import { Table, Button, Modal, Form, Input, message, Select, Space, Tag, Tooltip, theme } from "antd";
import { MaskedInput } from "antd-mask-input";
import { Teacher, Subject } from "../types/types.ts";
import { fetchTeachers, createTeacher, deleteTeacher, updateTeacher } from "../api/teachers.ts";
import { fetchSubjects } from "../api/subjects.ts";
import { SortOrder } from "antd/es/table/interface";
import { useSearchHighlight } from "../hooks/useSearchHighlight.ts";

const { Option } = Select;

interface Props {
    highlightId?: number | null;
    onHighlightClear?: () => void;
    onTagClick?: (tableKey: string, id: number) => void;
    searchQuery?: string;
}

const TeachersTable: React.FC<Props> = ({ highlightId, onHighlightClear, onTagClick, searchQuery = "" }) => {
    const { token } = theme.useToken();
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeHighlightId, setActiveHighlightId] = useState<number | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingTeacher, setEditingTeacher] = useState<any>(null);

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

    const { getRowClassName: getSearchRowClass } = useSearchHighlight(
        teachers,
        searchQuery,
        (t, q) => t.fullname.toLowerCase().includes(q),
        tableRef
    );

    const formatPhoneForTable = (phoneStr: string) => {
        if (!phoneStr) return "";
        const clean = phoneStr.replace(/[^\d]/g, "");
        if (clean.length === 12 && clean.startsWith("375")) {
            return `+375 (${clean.slice(3, 5)}) ${clean.slice(5, 8)}-${clean.slice(8, 10)}-${clean.slice(10, 12)}`;
        }
        return phoneStr;
    };

    const loadTeachers = async () => {
        setLoading(true);
        try {
            const data = await fetchTeachers();
            setTeachers(data);
        } catch (err: any) {
            message.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const loadSubjects = async () => {
        try {
            const data = await fetchSubjects();
            setSubjects(data);
        } catch (err: any) {
            message.error(err.message || "Ошибка при загрузке предметов");
        }
    };

    useEffect(() => { loadTeachers(); loadSubjects(); }, []);

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
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            if (e.shiftKey && (key === 'n' || key === 'т')) {
                if (!isModalOpen && !isEditModalOpen) { e.preventDefault(); form.resetFields(); setIsModalOpen(true); }
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
            if (e.shiftKey) { e.currentTarget.requestSubmit(); return; }
            const target = e.target as HTMLElement;
            if (target.tagName === "TEXTAREA" || (target as any).type === "submit") return;
            const allElements = Array.from(e.currentTarget.querySelectorAll("input, select, .ant-select-selection-search-input")) as HTMLElement[];
            const filteredElements = allElements.filter(el => {
                const isPrefix = el.closest('.ant-select') && (el.closest('.ant-form-item')?.querySelector('.ant-select-selection-item')?.textContent?.includes('+'));
                const isHidden = el.style.display === 'none' || el.getAttribute('type') === 'hidden';
                return !isPrefix && !isHidden;
            });
            const index = filteredElements.indexOf(target);
            if (index > -1 && index < filteredElements.length - 1) filteredElements[index + 1].focus();
        }
    };

    const processSubmit = (values: any) => {
        const cleanPhone = values.phone ? values.phone.replace(/[^\d]/g, "") : "";
        return { fullname: values.fullname, phone: `${values.prefix}${cleanPhone}`, subjectIds: values.subjectIds || [] };
    };

    const closeAddModal = () => { setIsModalOpen(false); form.resetFields(); };
    const closeEditModal = () => { setIsEditModalOpen(false); editForm.resetFields(); setEditingTeacher(null); };

    const onFinish = async (values: any) => {
        try {
            await createTeacher(processSubmit(values));
            message.success("Учитель добавлен!");
            closeAddModal();
            loadTeachers();
        } catch (err: any) {
            message.error(err.message || "Ошибка");
        }
    };

    const openEditModal = (teacher: Teacher) => {
        const cleanPhone = teacher.phone ? teacher.phone.replace(/[^\d]/g, "") : "";
        let prefix = "+375";
        let phonePart = cleanPhone;
        const prefixes = ["375", "380", "48", "7"];
        for (const p of prefixes) {
            if (cleanPhone.startsWith(p)) { prefix = `+${p}`; phonePart = cleanPhone.slice(p.length); break; }
        }
        const editData = { ...teacher, ui_prefix: prefix, ui_phone: phonePart, ui_subjectIds: teacher.subjectIds || [] };
        setEditingTeacher(editData);
        // Явно проставляем значения — initialValues работают только при первом mount Modal
        editForm.setFieldsValue({
            fullname: editData.fullname,
            prefix: editData.ui_prefix,
            phone: editData.ui_phone,
            subjectIds: editData.ui_subjectIds,
        });
        setIsEditModalOpen(true);
    };

    const onEditFinish = async (values: any) => {
        try {
            await updateTeacher(editingTeacher.id, processSubmit(values));
            message.success("Учитель обновлён!");
            closeEditModal();
            loadTeachers();
        } catch (err: any) {
            message.error(err.message || "Ошибка");
        }
    };

    const prefixSelector = (name: string) => (
        <Form.Item name={name} noStyle>
            <Select style={{ width: 110 }} tabIndex={-1}>
                <Option value="+375">🇧🇾 +375</Option>
                <Option value="+7">🇷🇺 +7</Option>
                <Option value="+380">🇺🇦 +380</Option>
                <Option value="+48">🇵🇱 +48</Option>
            </Select>
        </Form.Item>
    );

    const renderSubjectTags = (subjectIds: number[]) => {
        if (!subjectIds || subjectIds.length === 0) return "—";
        return (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {subjectIds.map(id => {
                    const s = subjects.find(s => s.id === id);
                    if (!s) return null;
                    return (
                        <Tooltip key={id} mouseEnterDelay={0.6} title={<div style={{ fontSize: 13 }}><div><b>Предмет:</b> {s.name}</div></div>}>
                            <Tag style={{ margin: 0, cursor: "pointer" }} onClick={() => onTagClick?.("2", id)}>{s.name}</Tag>
                        </Tooltip>
                    );
                })}
            </div>
        );
    };

    const getRowClassName = (record: Teacher) => {
        if (record.id === activeHighlightId) return "row-highlighted";
        return getSearchRowClass(record);
    };

    const columns = [
        { title: "ID", dataIndex: "id", key: "id", width: 80, sorter: (a: any, b: any) => a.id - b.id, defaultSortOrder: "ascend" as SortOrder },
        { title: "ФИО", dataIndex: "fullname", key: "fullname" },
        { title: "Телефон", dataIndex: "phone", key: "phone", render: (t: string) => formatPhoneForTable(t) },
        { title: "Предметы", dataIndex: "subjectIds", key: "subjectIds", render: (ids: number[]) => renderSubjectTags(ids) },
        {
            title: "Действия", key: "actions",
            render: (_: any, record: Teacher) => (
                <Space>
                    <Button className="edit-btn" onClick={() => openEditModal(record)}>Изменить</Button>
                    <Button className="delete-btn" danger onClick={() => deleteTeacher(record.id).then(() => { message.success("Учитель удалён"); loadTeachers(); }).catch((e: any) => message.error(e.message || "Ошибка удаления"))}>Удалить</Button>
                </Space>
            ),
        }
    ];

    return (
        <div ref={containerRef} style={{ height: "100%", display: "flex", flexDirection: "column", padding: "10px" }}>
            <style>{`
                .ant-table { border-bottom-left-radius: 8px !important; border-bottom-right-radius: 8px !important; overflow: hidden !important; }
                .ant-table-container { border-bottom-left-radius: 8px !important; border-bottom-right-radius: 8px !important; }
                .masked-input-themed { background-color: ${token.colorBgContainer} !important; color: ${token.colorText} !important; border-color: ${token.colorBorder} !important; }
                .masked-input-themed:hover { border-color: ${token.colorPrimaryHover} !important; }
                .masked-input-themed:focus { border-color: ${token.colorPrimary} !important; box-shadow: 0 0 0 2px ${token.controlOutline} !important; outline: none; }
                .masked-input-themed::placeholder { color: ${token.colorTextPlaceholder} !important; }
                .row-highlighted td { background-color: rgba(22, 119, 255, 0.12) !important; transition: background-color 0.3s ease !important; }
            `}</style>
            <div style={{ marginBottom: 10 }}>
                <Button type="primary" onClick={() => { form.resetFields(); setIsModalOpen(true); }} style={{ position: 'relative' }}>
                    Добавить учителя
                    <span style={{ opacity: 0.5, marginLeft: 12, fontSize: '0.8em' }}>{shortcutAdd}</span>
                </Button>
            </div>
            <div ref={tableRef}>
                <Table dataSource={teachers} columns={columns} rowKey="id" pagination={false} loading={loading} scroll={{ y: tableScrollY }} rowClassName={getRowClassName} />
            </div>

            <Modal title="Добавить учителя" open={isModalOpen} onCancel={closeAddModal} footer={null} destroyOnClose afterOpenChange={(open) => open && firstInputRef.current?.focus()}>
                <Form form={form} onFinish={onFinish} layout="vertical" initialValues={{ prefix: "+375" }} onKeyDown={handleFormKeyDown}>
                    <Form.Item name="fullname" label="ФИО" rules={[{ required: true }]}><Input ref={firstInputRef} autoComplete="off" /></Form.Item>
                    <Form.Item label="Телефон" required>
                        <Input.Group compact>
                            {prefixSelector("prefix")}
                            <Form.Item name="phone" noStyle rules={[{ required: true }]}>
                                <MaskedInput mask="(00) 000-00-00" className="ant-input masked-input-themed" style={{ width: "calc(100% - 110px)" }} autoComplete="off" />
                            </Form.Item>
                        </Input.Group>
                    </Form.Item>
                    <Form.Item name="subjectIds" label="Предметы" rules={[{ required: true, message: "Выберите хотя бы один предмет" }]}>
                        <Select mode="multiple" options={subjects.map(s => ({ value: s.id, label: s.name }))} showSearch optionFilterProp="label" placeholder="Выберите предметы" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" block style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
                        <span>Сохранить</span>
                        <span style={{ opacity: 0.5, position: 'absolute', right: 15, fontSize: '0.85em' }}>{shortcutSubmit}</span>
                    </Button>
                </Form>
            </Modal>

            <Modal title="Изменить учителя" open={isEditModalOpen} onCancel={closeEditModal} footer={null}
                   afterOpenChange={(open) => {
                       if (open && editingTeacher) {
                           editForm.setFieldsValue({
                               fullname: editingTeacher.fullname,
                               prefix: editingTeacher.ui_prefix,
                               phone: editingTeacher.ui_phone,
                               subjectIds: editingTeacher.ui_subjectIds,
                           });
                           editFirstInputRef.current?.focus();
                       }
                   }}>
                {editingTeacher && (
                    <Form key={editingTeacher.id} form={editForm} onFinish={onEditFinish} layout="vertical" onKeyDown={handleFormKeyDown}
                          initialValues={{ fullname: editingTeacher.fullname, prefix: editingTeacher.ui_prefix, phone: editingTeacher.ui_phone, subjectIds: editingTeacher.ui_subjectIds }}>
                        <Form.Item name="fullname" label="ФИО" rules={[{ required: true }]}><Input ref={editFirstInputRef} autoComplete="off" /></Form.Item>
                        <Form.Item label="Телефон" required>
                            <Input.Group compact>
                                {prefixSelector("prefix")}
                                <Form.Item name="phone" noStyle rules={[{ required: true }]}>
                                    <MaskedInput mask="(00) 000-00-00" className="ant-input masked-input-themed" style={{ width: "calc(100% - 110px)" }} autoComplete="off" />
                                </Form.Item>
                            </Input.Group>
                        </Form.Item>
                        <Form.Item name="subjectIds" label="Предметы" rules={[{ required: true, message: "Выберите хотя бы один предмет" }]}>
                            <Select mode="multiple" options={subjects.map(s => ({ value: s.id, label: s.name }))} showSearch optionFilterProp="label" placeholder="Выберите предметы" />
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

export default TeachersTable;