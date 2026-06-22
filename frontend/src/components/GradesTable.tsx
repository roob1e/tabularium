import React, { useEffect, useState, useRef, useCallback } from "react";
import {
    Table, Button, Modal, Form, Select, Space, Tag,
    Tooltip, InputNumber, message, DatePicker, Input
} from "antd";
import { Student, Subject, Teacher } from "../types/types";
import {
    fetchGrades, createGrade, deleteGrade, updateGrade,
    GradeResponse, WorkType, WORK_TYPE_LABELS, PageResponse
} from "../api/grades";
import { fetchStudents } from "../api/students";
import { fetchSubjects } from "../api/subjects";
import { fetchTeachers } from "../api/teachers";
import { SortOrder } from "antd/es/table/interface";
import dayjs from "dayjs";

interface Props {
    highlightId?: number | null;
    onHighlightClear?: () => void;
    onTagClick?: (tableKey: string, id: number) => void;
    searchQuery?: string;
}

const gradeColor = (g: number) => {
    if (g >= 9) return "green";
    if (g >= 7) return "blue";
    if (g >= 5) return "orange";
    if (g <= 1) return "default";
    return "red";
};

const workTypeOptions = (Object.keys(WORK_TYPE_LABELS) as WorkType[]).map(k => ({
    value: k, label: WORK_TYPE_LABELS[k],
}));

const PAGE_SIZE = 50;

const GradesTable: React.FC<Props> = ({ highlightId, onHighlightClear, onTagClick, searchQuery = "" }) => {
    const [grades, setGrades] = useState<GradeResponse[]>([]);
    const [totalElements, setTotalElements] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [students, setStudents] = useState<Student[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeHighlightId, setActiveHighlightId] = useState<number | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingGrade, setEditingGrade] = useState<GradeResponse | null>(null);
    const [addSubjectId, setAddSubjectId] = useState<number | null>(null);
    const [editSubjectId, setEditSubjectId] = useState<number | null>(null);

    const tableRef = useRef<HTMLDivElement>(null);
    const [form] = Form.useForm();
    const [editForm] = Form.useForm();

    const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    const shortcutSubmit = isMac ? "⇧↩" : "Shift+Enter";
    const shortcutAdd = isMac ? "⇧N" : "Shift+N";

    const getTeachersForSubject = (sid: number | null) =>
        sid ? teachers.filter(t => t.subjectIds?.includes(sid)) : [];

    const loadPage = useCallback(async (page: number) => {
        setLoading(true);
        try {
            const res: PageResponse<GradeResponse> = await fetchGrades({ page: page - 1, size: PAGE_SIZE });
            setGrades(res.content);
            setTotalElements(res.totalElements);
        } catch (e: any) { message.error(e.message); }
        finally { setLoading(false); }
    }, []);

    const loadMeta = useCallback(async () => {
        const [sd, subD, td] = await Promise.all([fetchStudents(), fetchSubjects(), fetchTeachers()]);
        setStudents(sd.map((s: any) => ({
            ...s, groupName: s.group?.name || s.groupName || "", groupId: s.group?.id || s.groupId,
        })));
        setSubjects(subD);
        setTeachers(td);
    }, []);

    useEffect(() => { loadPage(1); loadMeta(); }, []);

    useEffect(() => {
        if (!highlightId || loading) return;
        setActiveHighlightId(highlightId);
        setTimeout(() => {
            tableRef.current?.querySelector(`[data-row-key="${highlightId}"]`)
                ?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
        const t = setTimeout(() => { setActiveHighlightId(null); onHighlightClear?.(); }, 2000);
        return () => clearTimeout(t);
    }, [highlightId]);

    useEffect(() => {
        const handle = (e: KeyboardEvent) => {
            if (e.shiftKey && (e.key.toLowerCase() === "n" || e.key.toLowerCase() === "т")) {
                if (!isModalOpen && !isEditModalOpen) { e.preventDefault(); form.resetFields(); setIsModalOpen(true); }
            }
        };
        window.addEventListener("keydown", handle);
        return () => window.removeEventListener("keydown", handle);
    }, [isModalOpen, isEditModalOpen, form]);

    const closeAdd = () => { setIsModalOpen(false); form.resetFields(); setAddSubjectId(null); };
    const closeEdit = () => { setIsEditModalOpen(false); editForm.resetFields(); setEditingGrade(null); setEditSubjectId(null); };

    const onFinish = async (values: any) => {
        try {
            await createGrade({ ...values, gradeDate: values.gradeDate?.format("YYYY-MM-DD") });
            message.success("Оценка добавлена");
            closeAdd(); loadPage(currentPage);
        } catch (e: any) { message.error(e.message); }
    };

    const openEditModal = (grade: GradeResponse) => {
        setEditingGrade(grade);
        setEditSubjectId(grade.subjectId);
        editForm.setFieldsValue({
            studentId: grade.studentId, subjectId: grade.subjectId, teacherId: grade.teacherId,
            grade: grade.grade, workType: grade.workType,
            gradeDate: grade.gradeDate ? dayjs(grade.gradeDate) : null,
            comment: grade.comment,
        });
        setIsEditModalOpen(true);
    };

    const onEditFinish = async (values: any) => {
        if (!editingGrade) return;
        try {
            await updateGrade(editingGrade.id, { ...values, gradeDate: values.gradeDate?.format("YYYY-MM-DD") });
            message.success("Оценка обновлена");
            closeEdit(); loadPage(currentPage);
        } catch (e: any) { message.error(e.message); }
    };

    const handleDelete = async (id: number) => {
        try {
            await deleteGrade(id);
            message.success("Оценка удалена");
            loadPage(currentPage);
        } catch (e: any) { message.error(e.message || "Ошибка удаления"); }
    };

    const getRowClassName = (r: GradeResponse) => r.id === activeHighlightId ? "row-highlighted" : "";

    const renderStudentTag = (studentId: number, name?: string) => {
        const s = students.find(s => s.id === studentId);
        return (
            <Tooltip mouseEnterDelay={0.6} title={s ? <><b>ФИО:</b> {s.fullname}<br /><b>Класс:</b> {s.groupName}</> : null}>
                <Tag style={{ margin: 0, cursor: "pointer" }} onClick={() => onTagClick?.("1", studentId)}>
                    {name || s?.fullname || "—"}
                </Tag>
            </Tooltip>
        );
    };

    const renderSubjectTag = (subjectId: number, name?: string) => (
        <Tag style={{ margin: 0, cursor: "pointer" }} onClick={() => onTagClick?.("2", subjectId)}>
            {name || subjects.find(s => s.id === subjectId)?.name || "—"}
        </Tag>
    );

    const renderTeacherTag = (teacherId: number, name?: string) => {
        const t = teachers.find(t => t.id === teacherId);
        return (
            <Tooltip mouseEnterDelay={0.6} title={t ? <><b>ФИО:</b> {t.fullname}<br /><b>Тел:</b> {t.phone}</> : null}>
                <Tag style={{ margin: 0, cursor: "pointer" }} onClick={() => onTagClick?.("3", teacherId)}>
                    {name || t?.fullname || "—"}
                </Tag>
            </Tooltip>
        );
    };

    const GradeForm = ({ f, onFin, subjectId, setSubjectId, submitLabel }: {
        f: any; onFin: any; subjectId: number | null;
        setSubjectId: (id: number | null) => void; submitLabel: string;
    }) => (
        <Form form={f} onFinish={onFin} layout="vertical">
            <Form.Item name="studentId" label="Учащийся" rules={[{ required: true }]}>
                <Select showSearch optionFilterProp="label" options={students.map(s => ({ value: s.id, label: s.fullname }))} />
            </Form.Item>
            <Form.Item name="subjectId" label="Предмет" rules={[{ required: true }]}>
                <Select showSearch optionFilterProp="label" options={subjects.map(s => ({ value: s.id, label: s.name }))}
                        onChange={val => { setSubjectId(val); f.setFieldValue("teacherId", undefined); }} />
            </Form.Item>
            <Form.Item name="teacherId" label="Учитель" rules={[{ required: true }]}>
                <Select showSearch optionFilterProp="label"
                        placeholder={subjectId ? "Выберите учителя" : "Сначала выберите предмет"}
                        disabled={!subjectId}
                        options={getTeachersForSubject(subjectId).map(t => ({ value: t.id, label: t.fullname }))} />
            </Form.Item>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Form.Item name="grade" label="Оценка (0–10)" rules={[{ required: true }]}>
                    <InputNumber min={0} max={10} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item name="workType" label="Тип работы">
                    <Select placeholder="Не указан" options={workTypeOptions} allowClear />
                </Form.Item>
            </div>
            <Form.Item name="gradeDate" label="Дата">
                <DatePicker format="DD.MM.YYYY" style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="comment" label="Комментарий">
                <Input.TextArea rows={2} autoComplete="off" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block style={{ display: "flex", justifyContent: "center", position: "relative" }}>
                <span>{submitLabel}</span>
                <span style={{ opacity: 0.45, position: "absolute", right: 14, fontSize: "0.82em" }}>{shortcutSubmit}</span>
            </Button>
        </Form>
    );

    // Клиентский поиск по уже загруженной странице
    const filtered = searchQuery
        ? grades.filter(g => {
            const q = searchQuery.toLowerCase();
            const sName = g.studentName || students.find(s => s.id === g.studentId)?.fullname || "";
            return sName.toLowerCase().includes(q);
        })
        : grades;

    const columns = [
        { title: "ID", dataIndex: "id", key: "id", width: 70, defaultSortOrder: "ascend" as SortOrder },
        { title: "Учащийся",  dataIndex: "studentId",  key: "studentId",  render: (id: number, r: GradeResponse) => renderStudentTag(id, r.studentName) },
        { title: "Предмет",   dataIndex: "subjectId",  key: "subjectId",  render: (id: number, r: GradeResponse) => renderSubjectTag(id, r.subjectName) },
        { title: "Учитель",   dataIndex: "teacherId",  key: "teacherId",  render: (id: number, r: GradeResponse) => renderTeacherTag(id, r.teacherName) },
        {
            title: "Тип", dataIndex: "workType", key: "workType", width: 130,
            render: (wt?: WorkType) => wt ? <Tag>{WORK_TYPE_LABELS[wt]}</Tag> : "—",
        },
        {
            title: "Оценка", dataIndex: "grade", key: "grade", width: 100, align: "center" as const,
            render: (g: number) => (
                <div style={{ display: "flex", justifyContent: "center" }}>
                    <Tag color={gradeColor(g)} style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>{g}</Tag>
                </div>
            ),
        },
        {
            title: "Дата", dataIndex: "gradeDate", key: "gradeDate", width: 110,
            render: (d?: string) => d ? dayjs(d).format("DD.MM.YYYY") : "—",
        },
        {
            title: "Действия", key: "actions",
            render: (_: any, r: GradeResponse) => (
                <Space>
                    <Button className="edit-btn" onClick={() => openEditModal(r)}>Изменить</Button>
                    <Button className="delete-btn" danger onClick={() => handleDelete(r.id)}>Удалить</Button>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: 10 }}>
            <style>{`.row-highlighted td { background-color: rgba(22,119,255,0.12) !important; }`}</style>
            <div style={{ marginBottom: 10 }}>
                <Button type="primary" onClick={() => { form.resetFields(); setIsModalOpen(true); }} style={{ position: "relative" }}>
                    Добавить оценку
                    <span style={{ opacity: 0.45, marginLeft: 12, fontSize: "0.8em" }}>{shortcutAdd}</span>
                </Button>
            </div>
            <div ref={tableRef} style={{ flex: 1, overflowY: "auto" }}>
                <Table
                    dataSource={filtered}
                    columns={columns}
                    rowKey="id"
                    loading={loading}
                    rowClassName={getRowClassName}
                    scroll={{ x: "max-content" }}
                    pagination={{
                        current: currentPage,
                        pageSize: PAGE_SIZE,
                        total: totalElements,
                        showSizeChanger: false,
                        showTotal: (total) => `Всего ${total} оценок`,
                        onChange: (page) => { setCurrentPage(page); loadPage(page); },
                    }}
                />
            </div>

            <Modal title="Добавить оценку" open={isModalOpen} onCancel={closeAdd} footer={null} destroyOnClose width={520}>
                <GradeForm f={form} onFin={onFinish} subjectId={addSubjectId} setSubjectId={setAddSubjectId} submitLabel="Сохранить" />
            </Modal>
            <Modal title="Изменить оценку" open={isEditModalOpen} onCancel={closeEdit} footer={null} destroyOnClose width={520}>
                <GradeForm f={editForm} onFin={onEditFinish} subjectId={editSubjectId} setSubjectId={setEditSubjectId} submitLabel="Сохранить изменения" />
            </Modal>
        </div>
    );
};

export default GradesTable;