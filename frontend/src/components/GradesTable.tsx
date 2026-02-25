import React, { useEffect, useState, useRef } from "react";
import { Table, Button, Modal, Form, Select, Space, Tag, Tooltip, InputNumber, message, theme } from "antd";
import { Student, Subject, Teacher } from "../types/types.ts";
import { fetchGrades, createGrade, deleteGrade, updateGrade, GradeResponse } from "../api/grades.ts";
import { fetchStudents } from "../api/students.ts";
import { fetchSubjects } from "../api/subjects.ts";
import { fetchTeachers } from "../api/teachers.ts";
import { SortOrder } from "antd/es/table/interface";

interface Props {
    highlightId?: number | null;
    onHighlightClear?: () => void;
    onTagClick?: (tableKey: string, id: number) => void;
}

const gradeColor = (grade: number) => {
    if (grade >= 9) return "green";
    if (grade >= 7) return "blue";
    if (grade >= 5) return "orange";
    return "red";
};

const GradesTable: React.FC<Props> = ({ highlightId, onHighlightClear, onTagClick }) => {
    const { token } = theme.useToken();
    const [grades, setGrades] = useState<GradeResponse[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeHighlightId, setActiveHighlightId] = useState<number | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingGrade, setEditingGrade] = useState<GradeResponse | null>(null);

    const [addSelectedSubjectId, setAddSelectedSubjectId] = useState<number | null>(null);
    const [editSelectedSubjectId, setEditSelectedSubjectId] = useState<number | null>(null);

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

    const getTeachersForSubject = (subjectId: number | null) => {
        if (!subjectId) return [];
        return teachers.filter(t => t.subjectIds?.includes(subjectId));
    };

    const loadAll = async () => {
        setLoading(true);
        try {
            const [gradesData, studentsData, subjectsData, teachersData] = await Promise.all([
                fetchGrades(),
                fetchStudents(),
                fetchSubjects(),
                fetchTeachers(),
            ]);
            setGrades(gradesData);
            setStudents(studentsData.map((s: any) => ({
                ...s,
                groupName: s.group?.name || s.groupName || "",
                groupId: s.group?.id || s.groupId
            })));
            setSubjects(subjectsData);
            setTeachers(teachersData);
        } catch (err: any) {
            message.error(err.message || "Ошибка при загрузке");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAll();
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
        setAddSelectedSubjectId(null);
    };

    const closeEditModal = () => {
        setIsEditModalOpen(false);
        editForm.resetFields();
        setEditingGrade(null);
        setEditSelectedSubjectId(null);
    };

    const onFinish = async (values: any) => {
        try {
            await createGrade(values);
            message.success("Оценка добавлена!");
            closeAddModal();
            loadAll();
        } catch (err: any) {
            message.error(err.message || "Ошибка");
        }
    };

    const openEditModal = (grade: GradeResponse) => {
        setEditingGrade(grade);
        setEditSelectedSubjectId(grade.subjectId);
        setIsEditModalOpen(true);
    };

    const onEditFinish = async (values: any) => {
        if (!editingGrade) return;
        try {
            await updateGrade(editingGrade.id, values);
            message.success("Оценка обновлена!");
            closeEditModal();
            loadAll();
        } catch (err: any) {
            message.error(err.message || "Ошибка");
        }
    };

    const renderStudentTag = (studentId: number) => {
        const s = students.find(s => s.id === studentId);
        if (!s) return "—";
        return (
            <Tooltip
                mouseEnterDelay={0.6}
                title={
                    <div style={{ fontSize: 13 }}>
                        <div><b>ФИО:</b> {s.fullname}</div>
                        <div><b>Класс:</b> {s.groupName}</div>
                    </div>
                }
            >
                <Tag style={{ margin: 0, cursor: "pointer" }} onClick={() => onTagClick?.("1", studentId)}>
                    {s.fullname}
                </Tag>
            </Tooltip>
        );
    };

    const renderSubjectTag = (subjectId: number) => {
        const s = subjects.find(s => s.id === subjectId);
        if (!s) return "—";
        return (
            <Tooltip
                mouseEnterDelay={0.6}
                title={<div style={{ fontSize: 13 }}><div><b>Предмет:</b> {s.name}</div></div>}
            >
                <Tag style={{ margin: 0, cursor: "pointer" }} onClick={() => onTagClick?.("3", subjectId)}>
                    {s.name}
                </Tag>
            </Tooltip>
        );
    };

    const renderTeacherTag = (teacherId: number) => {
        const t = teachers.find(t => t.id === teacherId);
        if (!t) return "—";
        return (
            <Tooltip
                mouseEnterDelay={0.6}
                title={
                    <div style={{ fontSize: 13 }}>
                        <div><b>ФИО:</b> {t.fullname}</div>
                        <div><b>Телефон:</b> {t.phone}</div>
                    </div>
                }
            >
                <Tag style={{ margin: 0, cursor: "pointer" }} onClick={() => onTagClick?.("4", teacherId)}>
                    {t.fullname}
                </Tag>
            </Tooltip>
        );
    };

    const columns = [
        {
            title: "ID",
            dataIndex: "id",
            key: "id",
            width: 80,
            sorter: (a: GradeResponse, b: GradeResponse) => a.id - b.id,
            defaultSortOrder: "ascend" as SortOrder
        },
        {
            title: "Ученик",
            dataIndex: "studentId",
            key: "studentId",
            render: (id: number) => renderStudentTag(id)
        },
        {
            title: "Предмет",
            dataIndex: "subjectId",
            key: "subjectId",
            render: (id: number) => renderSubjectTag(id)
        },
        {
            title: "Учитель",
            dataIndex: "teacherId",
            key: "teacherId",
            render: (id: number) => renderTeacherTag(id)
        },
        {
            title: "Оценка",
            dataIndex: "grade",
            key: "grade",
            width: 110,
            sorter: (a: GradeResponse, b: GradeResponse) => a.grade - b.grade,
            render: (grade: number) => (
                <Tag color={gradeColor(grade)} style={{ fontWeight: 600, fontSize: 14 }}>
                    {grade}
                </Tag>
            )
        },
        {
            title: "Действия",
            key: "actions",
            render: (_: any, record: GradeResponse) => (
                <Space>
                    <Button className="edit-btn" onClick={() => openEditModal(record)}>Изменить</Button>
                    <Button className="delete-btn" danger onClick={() => deleteGrade(record.id).then(loadAll)}>Удалить</Button>
                </Space>
            )
        }
    ];

    return (
        <div ref={containerRef} style={{ height: "100%", display: "flex", flexDirection: "column", padding: "10px" }}>
            <style>{`
                .ant-table {
                    border-bottom-left-radius: 8px !important;
                    border-bottom-right-radius: 8px !important;
                    overflow: hidden !important;
                }
                .ant-table-container {
                    border-bottom-left-radius: 8px !important;
                    border-bottom-right-radius: 8px !important;
                }
                .ant-input-number {
                    background-color: ${token.colorBgContainer} !important;
                    color: ${token.colorText} !important;
                    border-color: ${token.colorBorder} !important;
                    width: 100%;
                }
                .ant-input-number:hover {
                    border-color: ${token.colorPrimaryHover} !important;
                }
                .ant-input-number-focused, .ant-input-number:focus {
                    border-color: ${token.colorPrimary} !important;
                    box-shadow: 0 0 0 2px ${token.controlOutline} !important;
                }
                .ant-input-number-input {
                    background-color: ${token.colorBgContainer} !important;
                    color: ${token.colorText} !important;
                }
                .row-highlighted td {
                    background-color: rgba(22, 119, 255, 0.12) !important;
                    transition: background-color 0.3s ease !important;
                }
            `}</style>

            <div style={{ marginBottom: 10 }}>
                <Button type="primary" onClick={() => { form.resetFields(); setIsModalOpen(true); }} style={{ position: 'relative' }}>
                    Добавить оценку
                    <span style={{ opacity: 0.5, marginLeft: 12, fontSize: '0.8em' }}>{shortcutAdd}</span>
                </Button>
            </div>

            <div ref={tableRef}>
                <Table
                    dataSource={grades}
                    columns={columns}
                    rowKey="id"
                    pagination={false}
                    loading={loading}
                    scroll={{ y: tableScrollY }}
                    rowClassName={(record: GradeResponse) => record.id === activeHighlightId ? "row-highlighted" : ""}
                />
            </div>

            {/* Модал добавления */}
            <Modal
                title="Добавить оценку"
                open={isModalOpen}
                onCancel={closeAddModal}
                footer={null}
                destroyOnClose
                afterOpenChange={(open) => open && firstInputRef.current?.focus()}
            >
                <Form form={form} onFinish={onFinish} layout="vertical" onKeyDown={handleFormKeyDown}>
                    <Form.Item name="studentId" label="Ученик" rules={[{ required: true }]}>
                        <Select
                            ref={firstInputRef}
                            showSearch
                            optionFilterProp="label"
                            placeholder="Выберите ученика"
                            options={students.map(s => ({ value: s.id, label: s.fullname }))}
                        />
                    </Form.Item>
                    <Form.Item name="subjectId" label="Предмет" rules={[{ required: true }]}>
                        <Select
                            showSearch
                            optionFilterProp="label"
                            placeholder="Выберите предмет"
                            options={subjects.map(s => ({ value: s.id, label: s.name }))}
                            onChange={(val) => {
                                setAddSelectedSubjectId(val);
                                form.setFieldValue("teacherId", undefined);
                            }}
                        />
                    </Form.Item>
                    <Form.Item name="teacherId" label="Учитель" rules={[{ required: true }]}>
                        <Select
                            showSearch
                            optionFilterProp="label"
                            placeholder={addSelectedSubjectId ? "Выберите учителя" : "Сначала выберите предмет"}
                            disabled={!addSelectedSubjectId}
                            options={getTeachersForSubject(addSelectedSubjectId).map(t => ({ value: t.id, label: t.fullname }))}
                        />
                    </Form.Item>
                    <Form.Item name="grade" label="Оценка" rules={[{ required: true }]}>
                        <InputNumber min={0} max={10} style={{ width: "100%" }} placeholder="От 0 до 10" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" block style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
                        <span>Сохранить</span>
                        <span style={{ opacity: 0.5, position: 'absolute', right: 15, fontSize: '0.85em' }}>{shortcutSubmit}</span>
                    </Button>
                </Form>
            </Modal>

            {/* Модал редактирования */}
            <Modal
                title="Изменить оценку"
                open={isEditModalOpen}
                onCancel={closeEditModal}
                footer={null}
                destroyOnClose
                afterOpenChange={(open) => open && editFirstInputRef.current?.focus()}
            >
                {editingGrade && (
                    <Form
                        key={editingGrade.id}
                        form={editForm}
                        onFinish={onEditFinish}
                        layout="vertical"
                        onKeyDown={handleFormKeyDown}
                        initialValues={{
                            studentId: editingGrade.studentId,
                            subjectId: editingGrade.subjectId,
                            teacherId: editingGrade.teacherId,
                            grade: editingGrade.grade,
                        }}
                    >
                        <Form.Item name="studentId" label="Ученик" rules={[{ required: true }]}>
                            <Select
                                ref={editFirstInputRef}
                                showSearch
                                optionFilterProp="label"
                                placeholder="Выберите ученика"
                                options={students.map(s => ({ value: s.id, label: s.fullname }))}
                            />
                        </Form.Item>
                        <Form.Item name="subjectId" label="Предмет" rules={[{ required: true }]}>
                            <Select
                                showSearch
                                optionFilterProp="label"
                                placeholder="Выберите предмет"
                                options={subjects.map(s => ({ value: s.id, label: s.name }))}
                                onChange={(val) => {
                                    setEditSelectedSubjectId(val);
                                    editForm.setFieldValue("teacherId", undefined);
                                }}
                            />
                        </Form.Item>
                        <Form.Item name="teacherId" label="Учитель" rules={[{ required: true }]}>
                            <Select
                                showSearch
                                optionFilterProp="label"
                                placeholder={editSelectedSubjectId ? "Выберите учителя" : "Сначала выберите предмет"}
                                disabled={!editSelectedSubjectId}
                                options={getTeachersForSubject(editSelectedSubjectId).map(t => ({ value: t.id, label: t.fullname }))}
                            />
                        </Form.Item>
                        <Form.Item name="grade" label="Оценка" rules={[{ required: true }]}>
                            <InputNumber min={0} max={10} style={{ width: "100%" }} placeholder="От 0 до 10" />
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

export default GradesTable;