import React, { useEffect, useState, useRef } from "react";
import { Table, Button, Modal, Form, Input, message, Select, DatePicker, Space, Tag, Tooltip, theme } from "antd";
import { MaskedInput } from "antd-mask-input";
import { Student, Group } from "../types/types.ts";
import { fetchStudents, createStudent, deleteStudent, updateStudent } from "../api/students.ts";
import { getAllGroups } from "../api/groups.ts";
import { SortOrder } from "antd/es/table/interface";
import { useSearchHighlight } from "../hooks/useSearchHighlight.ts";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

const { Option } = Select;

interface Props {
    highlightId?: number | null;
    onHighlightClear?: () => void;
    onTagClick?: (tableKey: string, id: number) => void;
    searchQuery?: string;
}

const StudentsTable: React.FC<Props> = ({ highlightId, onHighlightClear, onTagClick, searchQuery = "" }) => {
    const { token } = theme.useToken();
    const [students, setStudents] = useState<Student[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeHighlightId, setActiveHighlightId] = useState<number | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<any>(null);

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
        students,
        searchQuery,
        (s, q) => s.fullname.toLowerCase().includes(q),
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

    const formatDateForTable = (dateStr: string) => {
        if (!dateStr) return "";
        return dayjs(dateStr).format("DD.MM.YYYY");
    };

    const loadStudents = async () => {
        setLoading(true);
        try {
            const data = await fetchStudents();
            setStudents(data.map((s: any) => ({
                ...s,
                groupName: s.group?.name || s.groupName || "",
                groupId: s.group?.id || s.groupId
            })));
        } catch (err: any) {
            message.error(err.message);
        } finally {
            setLoading(false);
        }
    };

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

    const handleDateKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
        const target = e.target as HTMLInputElement;
        const key = e.key;
        if (["Backspace", "Delete", "Tab", "Escape", "Enter", "ArrowLeft", "ArrowRight"].includes(key)) return;
        if (!/[0-9]/.test(key)) { e.preventDefault(); return; }
        const value = target.value;
        if (value.length === 2 || value.length === 5) target.value += ".";
        if (value.length >= 10) e.preventDefault();
    };

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
        return {
            ...values,
            phone: `${values.prefix}${cleanPhone}`,
            birthdate: values.birthdate ? values.birthdate.format("YYYY-MM-DD") : null
        };
    };

    const closeAddModal = () => { setIsModalOpen(false); form.resetFields(); };
    const closeEditModal = () => { setIsEditModalOpen(false); editForm.resetFields(); setEditingStudent(null); };

    const onFinish = async (values: any) => {
        try {
            await createStudent(processSubmit(values));
            message.success("Ученик добавлен!");
            closeAddModal();
            loadStudents();
        } catch (err: any) {
            message.error(err.message || "Ошибка");
        }
    };

    const openEditModal = (student: Student) => {
        const cleanPhone = student.phone ? student.phone.replace(/[^\d]/g, "") : "";
        let prefix = "+375";
        let phonePart = cleanPhone;
        const prefixes = ["375", "380", "48", "7"];
        for (const p of prefixes) {
            if (cleanPhone.startsWith(p)) { prefix = `+${p}`; phonePart = cleanPhone.slice(p.length); break; }
        }
        setEditingStudent({ ...student, ui_prefix: prefix, ui_phone: phonePart, ui_birthdate: student.birthdate ? dayjs(student.birthdate) : null });
        setIsEditModalOpen(true);
    };

    const onEditFinish = async (values: any) => {
        try {
            await updateStudent(editingStudent.id, processSubmit(values));
            message.success("Ученик обновлён!");
            closeEditModal();
            loadStudents();
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

    const renderGroupTag = (record: Student) => {
        const group = groups.find(g => g.id === record.groupId);
        if (!group) return record.groupName || "—";
        return (
            <Tooltip mouseEnterDelay={0.6} title={<div style={{ fontSize: 13 }}><div><b>Класс:</b> {group.name}</div><div><b>Учеников:</b> {group.amount}</div></div>}>
                <Tag style={{ margin: 0, cursor: "pointer" }} onClick={() => onTagClick?.("2", group.id)}>{group.name}</Tag>
            </Tooltip>
        );
    };

    const getRowClassName = (record: Student) => {
        if (record.id === activeHighlightId) return "row-highlighted";
        return getSearchRowClass(record);
    };

    const columns = [
        { title: "ID", dataIndex: "id", key: "id", width: 80, sorter: (a: any, b: any) => a.id - b.id, defaultSortOrder: "ascend" as SortOrder },
        { title: "ФИО", dataIndex: "fullname", key: "fullname" },
        { title: "Возраст", dataIndex: "age", key: "age", width: 100 },
        { title: "Телефон", dataIndex: "phone", key: "phone", render: (t: string) => formatPhoneForTable(t) },
        { title: "Дата рождения", dataIndex: "birthdate", key: "birthdate", render: (t: string) => formatDateForTable(t) },
        { title: "Класс", dataIndex: "groupName", key: "groupName", render: (_: string, record: Student) => renderGroupTag(record) },
        {
            title: "Действия", key: "actions",
            render: (_: any, record: Student) => (
                <Space>
                    <Button className="edit-btn" onClick={() => openEditModal(record)}>Изменить</Button>
                    <Button className="delete-btn" danger onClick={() => deleteStudent(record.id).then(loadStudents)}>Удалить</Button>
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
                    Добавить ученика
                    <span style={{ opacity: 0.5, marginLeft: 12, fontSize: '0.8em' }}>{shortcutAdd}</span>
                </Button>
            </div>
            <div ref={tableRef}>
                <Table dataSource={students} columns={columns} rowKey="id" pagination={false} loading={loading} scroll={{ y: tableScrollY }} rowClassName={getRowClassName} />
            </div>

            <Modal title="Добавить ученика" open={isModalOpen} onCancel={closeAddModal} footer={null} destroyOnClose afterOpenChange={(open) => open && firstInputRef.current?.focus()}>
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
                    <Form.Item name="birthdate" label="Дата рождения" rules={[{ required: true }]}>
                        <DatePicker format="DD.MM.YYYY" placeholder="ДД.ММ.ГГГГ" style={{ width: "100%" }} onKeyDown={handleDateKeyDown as any} autoComplete="off" />
                    </Form.Item>
                    <Form.Item name="groupId" label="Класс" rules={[{ required: true }]}>
                        <Select options={groups.map(g => ({ value: g.id, label: g.name }))} showSearch optionFilterProp="label" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" block style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
                        <span>Сохранить</span>
                        <span style={{ opacity: 0.5, position: 'absolute', right: 15, fontSize: '0.85em' }}>{shortcutSubmit}</span>
                    </Button>
                </Form>
            </Modal>

            <Modal title="Изменить ученика" open={isEditModalOpen} onCancel={closeEditModal} footer={null} destroyOnClose afterOpenChange={(open) => open && editFirstInputRef.current?.focus()}>
                {editingStudent && (
                    <Form key={editingStudent.id} form={editForm} onFinish={onEditFinish} layout="vertical" onKeyDown={handleFormKeyDown}
                          initialValues={{ fullname: editingStudent.fullname, prefix: editingStudent.ui_prefix, phone: editingStudent.ui_phone, birthdate: editingStudent.ui_birthdate, groupId: editingStudent.groupId }}>
                        <Form.Item name="fullname" label="ФИО" rules={[{ required: true }]}><Input ref={editFirstInputRef} autoComplete="off" /></Form.Item>
                        <Form.Item label="Телефон" required>
                            <Input.Group compact>
                                {prefixSelector("prefix")}
                                <Form.Item name="phone" noStyle rules={[{ required: true }]}>
                                    <MaskedInput mask="(00) 000-00-00" className="ant-input masked-input-themed" style={{ width: "calc(100% - 110px)" }} autoComplete="off" />
                                </Form.Item>
                            </Input.Group>
                        </Form.Item>
                        <Form.Item name="birthdate" label="Дата рождения" rules={[{ required: true }]}>
                            <DatePicker format="DD.MM.YYYY" placeholder="ДД.ММ.ГГГГ" style={{ width: "100%" }} onKeyDown={handleDateKeyDown as any} autoComplete="off" />
                        </Form.Item>
                        <Form.Item name="groupId" label="Класс" rules={[{ required: true }]}>
                            <Select options={groups.map(g => ({ value: g.id, label: g.name }))} showSearch optionFilterProp="label" />
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

export default StudentsTable;