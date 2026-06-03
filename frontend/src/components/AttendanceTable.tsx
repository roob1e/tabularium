import React, { useEffect, useState, useRef } from "react";
import {
    Table, Button, Modal, Form, Select, DatePicker,
    Input, message, Space, Tag
} from "antd";
import { Student, Subject, Teacher } from "../types/types";
import {
    fetchAttendance, createAttendance, updateAttendance, deleteAttendance,
    AttendanceResponse, ATTENDANCE_STATUS_LABELS, ATTENDANCE_STATUS_COLORS
} from "../api/attendance";
import { fetchStudents } from "../api/students";
import { fetchSubjects } from "../api/subjects";
import { fetchTeachers } from "../api/teachers";
import dayjs from "dayjs";

interface Props {
    searchQuery?: string;
    onTagClick?: (tableKey: string, id: number) => void;
}

const statusOptions = (Object.keys(ATTENDANCE_STATUS_LABELS) as (keyof typeof ATTENDANCE_STATUS_LABELS)[]).map(k => ({
    value: k,
    label: ATTENDANCE_STATUS_LABELS[k],
}));

const AttendanceTable: React.FC<Props> = ({ searchQuery = "", onTagClick }) => {
    const [records, setRecords] = useState<AttendanceResponse[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editing, setEditing] = useState<AttendanceResponse | null>(null);

    const [tableScrollY, setTableScrollY] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const [form] = Form.useForm();
    const [editForm] = Form.useForm();

    const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [recs, studs, subs, tchs] = await Promise.all([
                fetchAttendance(), fetchStudents(), fetchSubjects(), fetchTeachers()
            ]);
            setRecords(recs);
            setStudents(studs.map((s: any) => ({
                ...s,
                groupName: s.group?.name || s.groupName || "",
                groupId: s.group?.id || s.groupId,
            })));
            setSubjects(subs);
            setTeachers(tchs);
        } catch (e: any) { message.error(e.message); }
        finally { setLoading(false); }
    };

    useEffect(() => { loadAll(); }, []);

    useEffect(() => {
        const update = () => {
            if (containerRef.current) {
                const h = containerRef.current.clientHeight;
                const top = containerRef.current.querySelector("div");
                setTableScrollY(h - (top ? (top as HTMLElement).clientHeight + 8 : 0) - 60);
            }
        };
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);

    useEffect(() => {
        const handle = (e: KeyboardEvent) => {
            if (e.shiftKey && (e.key.toLowerCase() === "n" || e.key.toLowerCase() === "т")) {
                if (!isModalOpen && !isEditModalOpen) { e.preventDefault(); form.resetFields(); setIsModalOpen(true); }
            }
        };
        window.addEventListener("keydown", handle);
        return () => window.removeEventListener("keydown", handle);
    }, [isModalOpen, isEditModalOpen, form]);

    const closeAdd = () => { setIsModalOpen(false); form.resetFields(); };
    const closeEdit = () => { setIsEditModalOpen(false); editForm.resetFields(); setEditing(null); };

    const onFinish = async (values: any) => {
        try {
            await createAttendance({ ...values, attendanceDate: values.attendanceDate.format("YYYY-MM-DD") });
            message.success("Запись добавлена");
            closeAdd(); loadAll();
        } catch (e: any) { message.error(e.message); }
    };

    const openEdit = (r: AttendanceResponse) => {
        setEditing(r);
        editForm.setFieldsValue({
            studentId: r.studentId,
            subjectId: r.subjectId,
            teacherId: r.teacherId,
            attendanceDate: dayjs(r.attendanceDate),
            status: r.status,
            note: r.note,
        });
        setIsEditModalOpen(true);
    };

    const onEditFinish = async (values: any) => {
        if (!editing) return;
        try {
            await updateAttendance(editing.id, { ...values, attendanceDate: values.attendanceDate.format("YYYY-MM-DD") });
            message.success("Запись обновлена");
            closeEdit(); loadAll();
        } catch (e: any) { message.error(e.message); }
    };

    const filtered = records.filter(r => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        const sName = r.studentName || students.find(s => s.id === r.studentId)?.fullname || "";
        const subName = r.subjectName || subjects.find(s => s.id === r.subjectId)?.name || "";
        return sName.toLowerCase().includes(q) || subName.toLowerCase().includes(q);
    });

    const AttendanceForm = ({ f, onFin, label }: { f: any; onFin: any; label: string }) => (
        <Form form={f} onFinish={onFin} layout="vertical">
            <Form.Item name="studentId" label="Учащийся" rules={[{ required: true }]}>
                <Select showSearch optionFilterProp="label" options={students.map(s => ({ value: s.id, label: s.fullname }))} />
            </Form.Item>
            <Form.Item name="subjectId" label="Предмет" rules={[{ required: true }]}>
                <Select showSearch optionFilterProp="label" options={subjects.map(s => ({ value: s.id, label: s.name }))} />
            </Form.Item>
            <Form.Item name="teacherId" label="Учитель">
                <Select showSearch optionFilterProp="label" allowClear options={teachers.map(t => ({ value: t.id, label: t.fullname }))} />
            </Form.Item>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Form.Item name="attendanceDate" label="Дата" rules={[{ required: true }]}>
                    <DatePicker format="DD.MM.YYYY" style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item name="status" label="Статус" rules={[{ required: true }]}>
                    <Select options={statusOptions} />
                </Form.Item>
            </div>
            <Form.Item name="note" label="Примечание">
                <Input.TextArea rows={2} />
            </Form.Item>
            <Button type="primary" htmlType="submit" block>{label}</Button>
        </Form>
    );

    const columns = [
        { title: "ID", dataIndex: "id", key: "id", width: 70 },
        {
            title: "Учащийся", dataIndex: "studentId", key: "studentId",
            render: (id: number, r: AttendanceResponse) => {
                const name = r.studentName || students.find(s => s.id === id)?.fullname || "—";
                return <Tag style={{ cursor: "pointer" }} onClick={() => onTagClick?.("1", id)}>{name}</Tag>;
            },
        },
        {
            title: "Предмет", dataIndex: "subjectId", key: "subjectId",
            render: (id: number, r: AttendanceResponse) => {
                const name = r.subjectName || subjects.find(s => s.id === id)?.name || "—";
                return <Tag style={{ cursor: "pointer" }} onClick={() => onTagClick?.("2", id)}>{name}</Tag>;
            },
        },
        {
            title: "Дата", dataIndex: "attendanceDate", key: "attendanceDate",
            render: (d: string) => dayjs(d).format("DD.MM.YYYY"),
            sorter: (a: AttendanceResponse, b: AttendanceResponse) => a.attendanceDate.localeCompare(b.attendanceDate),
        },
        {
            title: "Статус", dataIndex: "status", key: "status", width: 170,
            render: (s: keyof typeof ATTENDANCE_STATUS_LABELS) => (
                <Tag color={ATTENDANCE_STATUS_COLORS[s]}>{ATTENDANCE_STATUS_LABELS[s]}</Tag>
            ),
        },
        { title: "Примечание", dataIndex: "note", key: "note", render: (n?: string) => n || "—" },
        {
            title: "Действия", key: "actions",
            render: (_: any, r: AttendanceResponse) => (
                <Space>
                    <Button className="edit-btn" onClick={() => openEdit(r)}>Изменить</Button>
                    <Button className="delete-btn" danger onClick={() => deleteAttendance(r.id).then(loadAll)}>Удалить</Button>
                </Space>
            ),
        },
    ];

    return (
        <div ref={containerRef} style={{ height: "100%", display: "flex", flexDirection: "column", padding: 10 }}>
            <div style={{ marginBottom: 10 }}>
                <Button type="primary" onClick={() => { form.resetFields(); setIsModalOpen(true); }} style={{ position: "relative" }}>
                    Добавить запись
                    <span style={{ opacity: 0.45, marginLeft: 12, fontSize: "0.8em" }}>{isMac ? "⇧N" : "Shift+N"}</span>
                </Button>
            </div>
            <Table dataSource={filtered} columns={columns} rowKey="id" pagination={false}
                   loading={loading} scroll={{ y: tableScrollY }} />
            <Modal title="Добавить запись посещаемости" open={isModalOpen} onCancel={closeAdd} footer={null} destroyOnClose width={500}>
                <AttendanceForm f={form} onFin={onFinish} label="Сохранить" />
            </Modal>
            <Modal title="Изменить запись посещаемости" open={isEditModalOpen} onCancel={closeEdit} footer={null} destroyOnClose width={500}>
                <AttendanceForm f={editForm} onFin={onEditFinish} label="Сохранить изменения" />
            </Modal>
        </div>
    );
};

export default AttendanceTable;