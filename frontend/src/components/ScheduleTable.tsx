import React, { useEffect, useState, useRef } from "react";
import {
    Button, Modal, Form, Select, InputNumber,
    Input, message, Space, Tag, Table, Tabs
} from "antd";
import {
    fetchSchedule, createScheduleEntry, updateScheduleEntry, deleteScheduleEntry,
    ScheduleResponse, DayOfWeek, DAY_LABELS
} from "../api/schedule";
import { fetchSubjects } from "../api/subjects";
import { fetchTeachers } from "../api/teachers";
import { getAllGroups } from "../api/groups";
import { Subject, Teacher } from "../types/types";

interface Props {
    searchQuery?: string;
    onTagClick?: (tableKey: string, id: number) => void;
}

const dayOrder: DayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

const ScheduleTable: React.FC<Props> = ({ searchQuery = "", onTagClick }) => {
    const [entries, setEntries] = useState<ScheduleResponse[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [groups, setGroups] = useState<{ id: number; name: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editing, setEditing] = useState<ScheduleResponse | null>(null);
    const [activeDay, setActiveDay] = useState<DayOfWeek>("MONDAY");

    const containerRef = useRef<HTMLDivElement>(null);
    const [tableScrollY, setTableScrollY] = useState(400);

    const [form] = Form.useForm();
    const [editForm] = Form.useForm();

    const loadAll = async () => {
        setLoading(true);
        try {
            const [ents, subs, tchs, grps] = await Promise.all([
                fetchSchedule(), fetchSubjects(), fetchTeachers(), getAllGroups()
            ]);
            setEntries(ents);
            setSubjects(subs);
            setTeachers(tchs);
            setGroups(grps);
        } catch (e: any) { message.error(e.message); }
        finally { setLoading(false); }
    };

    useEffect(() => { loadAll(); }, []);

    useEffect(() => {
        const update = () => {
            if (containerRef.current) {
                setTableScrollY(containerRef.current.clientHeight - 160);
            }
        };
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);

    const closeAdd = () => { setIsModalOpen(false); form.resetFields(); };
    const closeEdit = () => { setIsEditModalOpen(false); editForm.resetFields(); setEditing(null); };

    const onFinish = async (values: any) => {
        try {
            await createScheduleEntry(values);
            message.success("Запись расписания добавлена");
            closeAdd(); loadAll();
        } catch (e: any) { message.error(e.message); }
    };

    const openEdit = (r: ScheduleResponse) => {
        setEditing(r);
        editForm.setFieldsValue({
            groupId: r.groupId,
            subjectId: r.subjectId,
            teacherId: r.teacherId,
            dayOfWeek: r.dayOfWeek,
            lessonNumber: r.lessonNumber,
            classroom: r.classroom,
        });
        setIsEditModalOpen(true);
    };

    const onEditFinish = async (values: any) => {
        if (!editing) return;
        try {
            await updateScheduleEntry(editing.id, values);
            message.success("Запись обновлена");
            closeEdit(); loadAll();
        } catch (e: any) { message.error(e.message); }
    };

    const filterEntries = (day: DayOfWeek) => {
        const q = searchQuery.toLowerCase();
        return entries
            .filter(e => e.dayOfWeek === day)
            .filter(e => !selectedGroupId || e.groupId === selectedGroupId)
            .filter(e => !q
                || (e.groupName || "").toLowerCase().includes(q)
                || (e.subjectName || "").toLowerCase().includes(q)
                || (e.teacherName || "").toLowerCase().includes(q)
            )
            .sort((a, b) => a.lessonNumber - b.lessonNumber);
    };

    const ScheduleForm = ({ f, onFin, label }: { f: any; onFin: any; label: string }) => (
        <Form form={f} onFinish={onFin} layout="vertical">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Form.Item name="groupId" label="Группа" rules={[{ required: true }]}>
                    <Select showSearch optionFilterProp="label" options={groups.map(g => ({ value: g.id, label: g.name }))} />
                </Form.Item>
                <Form.Item name="dayOfWeek" label="День недели" rules={[{ required: true }]}>
                    <Select options={dayOrder.map(d => ({ value: d, label: DAY_LABELS[d] }))} />
                </Form.Item>
            </div>
            <Form.Item name="subjectId" label="Предмет" rules={[{ required: true }]}>
                <Select showSearch optionFilterProp="label" options={subjects.map(s => ({ value: s.id, label: s.name }))} />
            </Form.Item>
            <Form.Item name="teacherId" label="Учитель">
                <Select showSearch optionFilterProp="label" allowClear options={teachers.map(t => ({ value: t.id, label: t.fullname }))} />
            </Form.Item>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Form.Item name="lessonNumber" label="Номер урока (1–8)" rules={[{ required: true }]}>
                    <InputNumber min={1} max={8} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item name="classroom" label="Кабинет">
                    <Input placeholder="204, спортзал..." />
                </Form.Item>
            </div>
            <Button type="primary" htmlType="submit" block>{label}</Button>
        </Form>
    );

    const columns = [
        { title: "№", dataIndex: "lessonNumber", key: "lessonNumber", width: 50 },
        {
            title: "Группа", dataIndex: "groupId", key: "groupId",
            render: (id: number, r: ScheduleResponse) => (
                <Tag style={{ cursor: "pointer" }} onClick={() => onTagClick?.("1", id)}>{r.groupName || "—"}</Tag>
            ),
        },
        {
            title: "Предмет", dataIndex: "subjectId", key: "subjectId",
            render: (id: number, r: ScheduleResponse) => (
                <Tag style={{ cursor: "pointer" }} onClick={() => onTagClick?.("2", id)}>{r.subjectName || "—"}</Tag>
            ),
        },
        {
            title: "Учитель", dataIndex: "teacherId", key: "teacherId",
            render: (id: number, r: ScheduleResponse) => id
                ? <Tag style={{ cursor: "pointer" }} onClick={() => onTagClick?.("3", id)}>{r.teacherName || "—"}</Tag>
                : "—",
        },
        { title: "Кабинет", dataIndex: "classroom", key: "classroom", render: (c?: string) => c || "—" },
        {
            title: "Действия", key: "actions",
            render: (_: any, r: ScheduleResponse) => (
                <Space>
                    <Button className="edit-btn" onClick={() => openEdit(r)}>Изменить</Button>
                    <Button className="delete-btn" danger onClick={() => deleteScheduleEntry(r.id).then(() => { message.success("Запись расписания удалена"); loadAll(); }).catch((e: any) => message.error(e.message || "Ошибка удаления"))}>Удалить</Button>
                </Space>
            ),
        },
    ];

    const tabItems = dayOrder.map(day => ({
        key: day,
        label: (
            <span>
                {DAY_LABELS[day]}
                {filterEntries(day).length > 0 && (
                    <Tag color="blue" style={{ marginLeft: 6, fontSize: 10 }}>{filterEntries(day).length}</Tag>
                )}
            </span>
        ),
        children: (
            <Table
                dataSource={filterEntries(day)}
                columns={columns}
                rowKey="id"
                pagination={false}
                loading={loading}
                scroll={{ y: tableScrollY - 50 }}
                size="small"
            />
        ),
    }));

    return (
        <div ref={containerRef} style={{ height: "100%", display: "flex", flexDirection: "column", padding: 10 }}>
            <div style={{ marginBottom: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <Button type="primary" onClick={() => { form.resetFields(); setIsModalOpen(true); }}>
                    Добавить запись
                </Button>
                <Select
                    allowClear
                    placeholder="Фильтр по группе"
                    style={{ width: 200 }}
                    value={selectedGroupId}
                    onChange={val => setSelectedGroupId(val ?? null)}
                    options={groups.map(g => ({ value: g.id, label: g.name }))}
                    showSearch
                    optionFilterProp="label"
                />
            </div>
            <Tabs activeKey={activeDay} onChange={k => setActiveDay(k as DayOfWeek)} items={tabItems} style={{ flex: 1 }} />
            <Modal title="Добавить запись расписания" open={isModalOpen} onCancel={closeAdd} footer={null} destroyOnClose width={520}>
                <ScheduleForm f={form} onFin={onFinish} label="Сохранить" />
            </Modal>
            <Modal title="Изменить запись расписания" open={isEditModalOpen} onCancel={closeEdit} footer={null} destroyOnClose width={520}>
                <ScheduleForm f={editForm} onFin={onEditFinish} label="Сохранить изменения" />
            </Modal>
        </div>
    );
};

export default ScheduleTable;