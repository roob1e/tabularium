import React, { useEffect, useState, useCallback, useRef } from "react";
import {
    Button, Modal, Form, Input, Select, DatePicker,
    message, Tag, Tooltip, Spin, Empty, theme, Popconfirm, Space
} from "antd";
import {
    FolderOutlined, FolderOpenOutlined, UserOutlined,
    PlusOutlined, EditOutlined, DeleteOutlined,
    FolderAddOutlined, TeamOutlined
} from "@ant-design/icons";
import { MaskedInput } from "antd-mask-input";
import { Student, Group } from "../types/types";
import { fetchStudents, createStudent, deleteStudent, updateStudent } from "../api/students";
import { getAllGroups, createGroup, deleteGroup, updateGroup } from "../api/groups";
import dayjs from "dayjs";

const { Option } = Select;

interface Props {
    searchQuery?: string;
    highlightStudentId?: number | null;
    onHighlightClear?: () => void;
}

const ClassroomExplorer: React.FC<Props> = ({ searchQuery = "", highlightStudentId, onHighlightClear }) => {
    const { token } = theme.useToken();
    const isDark = token.colorBgContainer === "#141414" || token.colorBgContainer.toLowerCase() === "#1f1f1f";

    const [groups, setGroups] = useState<Group[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
    const [activeHighlightStudentId, setActiveHighlightStudentId] = useState<number | null>(null);
    const studentRowRefs = useRef<Record<number, HTMLDivElement | null>>({});

    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [isEditGroupModalOpen, setIsEditGroupModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<Group | null>(null);
    const [groupForm] = Form.useForm();
    const [editGroupForm] = Form.useForm();

    const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
    const [isEditStudentModalOpen, setIsEditStudentModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [studentForm] = Form.useForm();
    const [editStudentForm] = Form.useForm();

    const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    const shortcutSubmit = isMac ? "⇧↩" : "Shift+Enter";

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [gData, sData] = await Promise.all([getAllGroups(), fetchStudents()]);
            setGroups([...gData].sort((a, b) => a.name.localeCompare(b.name, "ru")));
            setStudents([...sData].map((s: any) => ({
                ...s,
                groupName: s.group?.name || s.groupName || "",
                groupId: s.group?.id || s.groupId,
            })).sort((a: any, b: any) => a.fullname.localeCompare(b.fullname, "ru")));
        } catch (err: any) {
            message.error(err.message || "Ошибка загрузки");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        if (!searchQuery) return;
        const q = searchQuery.toLowerCase();
        const matchingGroupIds = new Set<number>();
        students.forEach(s => {
            if (s.fullname.toLowerCase().includes(q) || s.phone?.includes(q)) {
                matchingGroupIds.add(s.groupId);
            }
        });
        if (matchingGroupIds.size > 0) {
            setExpandedGroups(prev => new Set([...prev, ...matchingGroupIds]));
        }
    }, [searchQuery, students]);

    // Обработка перехода из оценок — раскрываем папку группы и подсвечиваем строку
    useEffect(() => {
        if (!highlightStudentId || students.length === 0) return;
        const student = students.find(s => s.id === highlightStudentId);
        if (!student) return;
        // Раскрываем группу
        setExpandedGroups(prev => new Set([...prev, student.groupId]));
        setActiveHighlightStudentId(highlightStudentId);
        // Скролл к строке студента после рендера
        setTimeout(() => {
            const el = studentRowRefs.current[highlightStudentId];
            if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 120);
        const timer = setTimeout(() => {
            setActiveHighlightStudentId(null);
            onHighlightClear?.();
        }, 2000);
        return () => clearTimeout(timer);
    }, [highlightStudentId, students]);

    const toggleGroup = (id: number) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const expandAll = () => setExpandedGroups(new Set(groups.map(g => g.id)));
    const collapseAll = () => setExpandedGroups(new Set());

    const formatPhone = (p: string) => {
        if (!p) return "";
        const c = p.replace(/\D/g, "");
        if (c.length === 12 && c.startsWith("375"))
            return `+375 (${c.slice(3, 5)}) ${c.slice(5, 8)}-${c.slice(8, 10)}-${c.slice(10, 12)}`;
        return p;
    };

    const formatDate = (d: string) => d ? dayjs(d).format("DD.MM.YYYY") : "";

    const processStudentSubmit = (values: any) => ({
        fullname: values.fullname,
        phone: `${values.prefix}${values.phone?.replace(/\D/g, "")}`,
        birthdate: values.birthdate?.format("YYYY-MM-DD") ?? null,
        groupId: values.groupId,
    });

    const onGroupFinish = async (values: any) => {
        try {
            await createGroup({ name: values.name, amount: 0 });
            message.success("Группа добавлена");
            setIsGroupModalOpen(false);
            groupForm.resetFields();
            load();
        } catch (e: any) { message.error(e.message); }
    };

    const onEditGroupFinish = async (values: any) => {
        if (!editingGroup) return;
        try {
            await updateGroup(editingGroup.id, { name: values.name });
            message.success("Группа обновлена");
            setIsEditGroupModalOpen(false);
            editGroupForm.resetFields();
            setEditingGroup(null);
            load();
        } catch (e: any) { message.error(e.message); }
    };

    const handleDeleteGroup = async (id: number) => {
        try {
            await deleteGroup(id);
            message.success("Группа удалена");
            load();
        } catch (e: any) { message.error(e.message); }
    };

    const openAddStudent = (groupId: number) => {
        studentForm.resetFields();
        studentForm.setFieldsValue({ groupId, prefix: "+375" });
        setIsStudentModalOpen(true);
    };

    const onStudentFinish = async (values: any) => {
        try {
            await createStudent(processStudentSubmit(values));
            message.success("Учащийся добавлен");
            setIsStudentModalOpen(false);
            studentForm.resetFields();
            load();
        } catch (e: any) { message.error(e.message); }
    };

    const openEditStudent = (s: Student) => {
        const clean = s.phone?.replace(/\D/g, "") || "";
        let prefix = "+375", phonePart = clean;
        for (const p of ["375", "380", "48", "7"]) {
            if (clean.startsWith(p)) { prefix = `+${p}`; phonePart = clean.slice(p.length); break; }
        }
        setEditingStudent(s);
        editStudentForm.setFieldsValue({
            fullname: s.fullname,
            prefix,
            phone: phonePart,
            birthdate: s.birthdate ? dayjs(s.birthdate) : null,
            groupId: s.groupId,
        });
        setIsEditStudentModalOpen(true);
    };

    const onEditStudentFinish = async (values: any) => {
        if (!editingStudent) return;
        try {
            await updateStudent(editingStudent.id, processStudentSubmit(values));
            message.success("Учащийся обновлён");
            setIsEditStudentModalOpen(false);
            editStudentForm.resetFields();
            setEditingStudent(null);
            load();
        } catch (e: any) { message.error(e.message); }
    };

    const handleDeleteStudent = async (id: number) => {
        try {
            await deleteStudent(id);
            message.success("Учащийся удалён");
            load();
        } catch (e: any) { message.error(e.message); }
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

    const q = searchQuery.toLowerCase();
    const filteredGroups = q
        ? groups.filter(g =>
            g.name.toLowerCase().includes(q) ||
            students.some(s => s.groupId === g.id && (s.fullname.toLowerCase().includes(q) || s.phone?.includes(q)))
        )
        : groups;

    const getStudentsForGroup = (groupId: number) =>
        students
            .filter(s => s.groupId === groupId)
            .filter(s => !q || s.fullname.toLowerCase().includes(q) || s.phone?.includes(q));

    const text = token.colorText;
    const textSecondary = token.colorTextSecondary;
    const primary = token.colorPrimary;
    const border = token.colorBorderSecondary;
    const hoverBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.025)";
    const folderBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.018)";

    const groupHeaderStyle: React.CSSProperties = {
        display: "flex",
        alignItems: "center",
        padding: "8px 12px",
        borderRadius: 8,
        cursor: "pointer",
        userSelect: "none",
        transition: "background 0.15s",
        background: folderBg,
        border: `1px solid ${border}`,
        marginBottom: 2,
    };

    const studentRowStyle: React.CSSProperties = {
        display: "flex",
        alignItems: "center",
        padding: "6px 12px 6px 40px",
        borderRadius: 6,
        transition: "background 0.12s",
        cursor: "default",
        gap: 8,
    };

    // StudentForm вынесен за пределы render через useCallback-мемоизацию пропсов,
    // но сам компонент объявлен ВНЕ ClassroomExplorer (см. ниже файла).
    // Здесь передаём нужные данные через пропсы, чтобы не создавать замыкание.

    return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: 10 }}>
            <style>{`
                .explorer-group-header:hover { background: ${hoverBg} !important; }
                .explorer-student-row:hover { background: ${hoverBg} !important; }
                .explorer-action-btn { opacity: 0; transition: opacity 0.15s; }
                .explorer-group-header:hover .explorer-action-btn,
                .explorer-student-row:hover .explorer-action-btn { opacity: 1; }
            `}</style>

            {/* Toolbar */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
                <Button type="primary" icon={<FolderAddOutlined />}
                        onClick={() => { groupForm.resetFields(); setIsGroupModalOpen(true); }}>
                    Добавить группу
                </Button>
                <Button icon={<UserOutlined />}
                        onClick={() => { studentForm.resetFields(); studentForm.setFieldsValue({ prefix: "+375" }); setIsStudentModalOpen(true); }}>
                    Добавить учащегося
                </Button>
                <div style={{ flex: 1 }} />
                <Button size="small" type="text" onClick={expandAll} style={{ color: textSecondary }}>Раскрыть все</Button>
                <Button size="small" type="text" onClick={collapseAll} style={{ color: textSecondary }}>Свернуть все</Button>
                <Tag icon={<TeamOutlined />} color="blue" style={{ margin: 0 }}>{students.length} учащихся</Tag>
            </div>

            {/* Tree */}
            <div style={{ flex: 1, overflowY: "auto" }}>
                {loading ? (
                    <div style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}><Spin /></div>
                ) : filteredGroups.length === 0 ? (
                    <Empty description="Группы не найдены" style={{ paddingTop: 60 }} />
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {filteredGroups.map(group => {
                            const isOpen = expandedGroups.has(group.id);
                            const groupStudents = getStudentsForGroup(group.id);
                            const realCount = students.filter(s => s.groupId === group.id).length;

                            return (
                                <div key={group.id}>
                                    <div className="explorer-group-header" style={groupHeaderStyle} onClick={() => toggleGroup(group.id)}>
                                        <span style={{ marginRight: 8, fontSize: 16, color: "#faad14" }}>
                                            {isOpen ? <FolderOpenOutlined /> : <FolderOutlined />}
                                        </span>
                                        <span style={{ fontWeight: 500, fontSize: 14, color: text, flex: 1 }}>{group.name}</span>
                                        <span style={{ fontSize: 12, color: textSecondary, marginRight: 8 }}>{realCount} уч.</span>
                                        <div className="explorer-action-btn" onClick={e => e.stopPropagation()} style={{ display: "flex", gap: 4 }}>
                                            <Tooltip title="Добавить учащегося">
                                                <Button size="small" type="text" icon={<PlusOutlined />}
                                                        style={{ color: primary }} onClick={() => openAddStudent(group.id)} />
                                            </Tooltip>
                                            <Tooltip title="Переименовать">
                                                <Button size="small" type="text" icon={<EditOutlined />}
                                                        style={{ color: textSecondary }}
                                                        onClick={() => {
                                                            setEditingGroup(group);
                                                            editGroupForm.setFieldsValue({ name: group.name });
                                                            setIsEditGroupModalOpen(true);
                                                        }} />
                                            </Tooltip>
                                            <Tooltip title="Удалить группу">
                                                <Popconfirm title="Удалить группу?"
                                                            description="Учащиеся группы не будут удалены."
                                                            onConfirm={() => handleDeleteGroup(group.id)}
                                                            okText="Да" cancelText="Нет">
                                                    <Button size="small" type="text" icon={<DeleteOutlined />} danger />
                                                </Popconfirm>
                                            </Tooltip>
                                        </div>
                                    </div>

                                    {isOpen && (
                                        <div style={{
                                            marginLeft: 16, marginBottom: 4,
                                            borderLeft: `2px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                                            paddingLeft: 4,
                                        }}>
                                            {groupStudents.length === 0 ? (
                                                <div style={{ padding: "6px 12px 6px 32px", color: textSecondary, fontSize: 13 }}>
                                                    Нет учащихся
                                                </div>
                                            ) : (
                                                groupStudents.map(student => (
                                                    <div key={student.id} className="explorer-student-row"
                                                         ref={el => { studentRowRefs.current[student.id] = el; }}
                                                         style={{
                                                             ...studentRowStyle,
                                                             ...(student.id === activeHighlightStudentId
                                                                 ? { background: "rgba(22,119,255,0.12)", borderRadius: 6 }
                                                                 : {}),
                                                         }}>
                                                        <UserOutlined style={{ color: textSecondary, fontSize: 13, flexShrink: 0 }} />
                                                        <span style={{ fontSize: 13, color: text, flex: 1, minWidth: 0 }}>
                                                            <span style={{ fontWeight: 500 }}>{student.fullname}</span>
                                                            {student.age && (
                                                                <span style={{ color: textSecondary, marginLeft: 8, fontSize: 12 }}>
                                                                    {student.age} лет
                                                                </span>
                                                            )}
                                                        </span>
                                                        <span style={{ fontSize: 12, color: textSecondary, flexShrink: 0 }}>
                                                            {formatPhone(student.phone)}
                                                        </span>
                                                        {student.birthdate && (
                                                            <Tooltip title={`Дата рождения: ${formatDate(student.birthdate)}`}>
                                                                <span style={{ fontSize: 12, color: textSecondary, flexShrink: 0 }}>
                                                                    {formatDate(student.birthdate)}
                                                                </span>
                                                            </Tooltip>
                                                        )}
                                                        <div className="explorer-action-btn" style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                                                            <Tooltip title="Изменить">
                                                                <Button size="small" type="text" icon={<EditOutlined />}
                                                                        style={{ color: primary }} onClick={() => openEditStudent(student)} />
                                                            </Tooltip>
                                                            <Tooltip title="Удалить">
                                                                <Popconfirm title={`Удалить ${student.fullname}?`}
                                                                            onConfirm={() => handleDeleteStudent(student.id)}
                                                                            okText="Да" cancelText="Нет">
                                                                    <Button size="small" type="text" icon={<DeleteOutlined />} danger />
                                                                </Popconfirm>
                                                            </Tooltip>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <Modal title="Добавить группу" open={isGroupModalOpen}
                   onCancel={() => { setIsGroupModalOpen(false); groupForm.resetFields(); }} footer={null} destroyOnClose>
                <Form form={groupForm} onFinish={onGroupFinish} layout="vertical" style={{ marginTop: 8 }}>
                    <Form.Item name="name" label="Название группы" rules={[{ required: true }]}>
                        <Input placeholder="П-41, 10А..." autoComplete="off" autoFocus />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" block>Создать</Button>
                </Form>
            </Modal>

            <Modal title="Переименовать группу" open={isEditGroupModalOpen}
                   onCancel={() => { setIsEditGroupModalOpen(false); editGroupForm.resetFields(); setEditingGroup(null); }} footer={null} destroyOnClose>
                <Form form={editGroupForm} onFinish={onEditGroupFinish} layout="vertical" style={{ marginTop: 8 }}>
                    <Form.Item name="name" label="Новое название" rules={[{ required: true }]}>
                        <Input autoComplete="off" autoFocus />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" block>Сохранить</Button>
                </Form>
            </Modal>

            <Modal title="Добавить учащегося" open={isStudentModalOpen}
                   onCancel={() => { setIsStudentModalOpen(false); studentForm.resetFields(); }} footer={null} afterOpenChange={(open) => { if (!open) studentForm.resetFields(); }}>
                <div style={{ marginTop: 8 }}>
                    <Form form={studentForm} onFinish={onStudentFinish} layout="vertical" initialValues={{ prefix: "+375" }}>
                        <Form.Item name="fullname" label="ФИО" rules={[{ required: true }]}>
                            <Input autoComplete="off" autoFocus />
                        </Form.Item>
                        <Form.Item label="Телефон" required>
                            <Space.Compact style={{ width: "100%" }}>
                                {prefixSelector("prefix")}
                                <Form.Item name="phone" noStyle rules={[{ required: true }]}>
                                    <MaskedInput mask="(00) 000-00-00" className="ant-input"
                                                 style={{ width: "calc(100% - 110px)", backgroundColor: token.colorBgContainer, color: token.colorText, borderColor: token.colorBorder }}
                                                 autoComplete="off" />
                                </Form.Item>
                            </Space.Compact>
                        </Form.Item>
                        <Form.Item name="birthdate" label="Дата рождения" rules={[{ required: true }]}>
                            <DatePicker format="DD.MM.YYYY" style={{ width: "100%" }} />
                        </Form.Item>
                        <Form.Item name="groupId" label="Группа" rules={[{ required: true }]}>
                            <Select options={groups.map(g => ({ value: g.id, label: g.name }))} showSearch optionFilterProp="label" />
                        </Form.Item>
                        <Button type="primary" htmlType="submit" block style={{ display: "flex", justifyContent: "center", position: "relative" }}>
                            <span>Добавить</span>
                            <span style={{ opacity: 0.45, position: "absolute", right: 14, fontSize: "0.82em" }}>{shortcutSubmit}</span>
                        </Button>
                    </Form>
                </div>
            </Modal>

            <Modal title="Изменить учащегося" open={isEditStudentModalOpen}
                   onCancel={() => { setIsEditStudentModalOpen(false); editStudentForm.resetFields(); setEditingStudent(null); }} footer={null}
                   afterOpenChange={(open) => { if (!open) { editStudentForm.resetFields(); } }}>
                <div style={{ marginTop: 8 }}>
                    <Form form={editStudentForm} onFinish={onEditStudentFinish} layout="vertical" initialValues={{ prefix: "+375" }}>
                        <Form.Item name="fullname" label="ФИО" rules={[{ required: true }]}>
                            <Input autoComplete="off" autoFocus />
                        </Form.Item>
                        <Form.Item label="Телефон" required>
                            <Space.Compact style={{ width: "100%" }}>
                                {prefixSelector("prefix")}
                                <Form.Item name="phone" noStyle rules={[{ required: true }]}>
                                    <MaskedInput mask="(00) 000-00-00" className="ant-input"
                                                 style={{ width: "calc(100% - 110px)", backgroundColor: token.colorBgContainer, color: token.colorText, borderColor: token.colorBorder }}
                                                 autoComplete="off" />
                                </Form.Item>
                            </Space.Compact>
                        </Form.Item>
                        <Form.Item name="birthdate" label="Дата рождения" rules={[{ required: true }]}>
                            <DatePicker format="DD.MM.YYYY" style={{ width: "100%" }} />
                        </Form.Item>
                        <Form.Item name="groupId" label="Группа" rules={[{ required: true }]}>
                            <Select options={groups.map(g => ({ value: g.id, label: g.name }))} showSearch optionFilterProp="label" />
                        </Form.Item>
                        <Button type="primary" htmlType="submit" block style={{ display: "flex", justifyContent: "center", position: "relative" }}>
                            <span>Сохранить изменения</span>
                            <span style={{ opacity: 0.45, position: "absolute", right: 14, fontSize: "0.82em" }}>{shortcutSubmit}</span>
                        </Button>
                    </Form>
                </div>
            </Modal>
        </div>
    );
};

export default ClassroomExplorer;