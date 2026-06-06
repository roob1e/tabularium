import React, { useEffect, useState } from "react";
import {
    Button, Select, Table, Tag, Empty, Spin, Typography,
    Divider, Space, Tooltip, message, theme, Card, Tabs,
    Statistic, Row, Col, Progress, Alert
} from "antd";
import {
    FileExcelOutlined, FilePdfOutlined, FilterOutlined,
    EyeOutlined, DownloadOutlined, UserOutlined, BookOutlined,
    WarningOutlined, FallOutlined
} from "@ant-design/icons";
import { getAllGroups } from "../api/groups";
import { fetchSubjects } from "../api/subjects";
import { fetchStudents } from "../api/students";
import { GradeResponse, WORK_TYPE_LABELS, WorkType } from "../api/grades";
import { AttendanceResponse } from "../api/attendance";
import api from "../api/api";
import dayjs from "dayjs";

// ─── Сохранение файла через Tauri dialog (fallback — a.click) ────────────────
const saveFileWithDialog = async (data: ArrayBuffer, suggestedName: string, mime: string) => {
    try {
        const { save }      = await import("@tauri-apps/plugin-dialog");
        const { writeFile } = await import("@tauri-apps/plugin-fs");
        const path = await save({ defaultPath: suggestedName });
        if (path) { await writeFile(path, new Uint8Array(data)); return; }
        return; // пользователь закрыл диалог
    } catch { /* плагины не установлены — fallback */ }
    const blob = new Blob([data], { type: mime });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = suggestedName;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

const { Title, Text } = Typography;



// ─── Скачать файл — открывает нативный диалог «Сохранить как» в Tauri ─────
const downloadBlob = async (
    url: string,
    params: Record<string, unknown>,
    filename: string,
    mime: string,
    setLoading: (v: boolean) => void
) => {
    setLoading(true);
    try {
        const res = await api.get(url, { params, responseType: "arraybuffer" });
        await saveFileWithDialog(res.data as ArrayBuffer, filename, mime);
    } catch (e: any) {
        message.error("Ошибка экспорта: " + (e.response?.statusText || e.message));
    } finally {
        setLoading(false);
    }
};

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const PDF_MIME  = "application/pdf";

// ─── Вспомогательные компоненты ──────────────────────────────────────────────

const gradeColor = (g: number) =>
    g >= 9 ? "green" : g >= 7 ? "blue" : g >= 5 ? "orange" : g <= 1 ? "default" : "red";

const avgOf = (data: GradeResponse[]) =>
    data.length > 0 ? (data.reduce((s, g) => s + g.grade, 0) / data.length).toFixed(2) : null;

const StatsRow: React.FC<{ data: GradeResponse[] }> = ({ data }) => {
    const a = avgOf(data);
    if (!a) return null;
    const min = Math.min(...data.map(r => r.grade));
    const max = Math.max(...data.map(r => r.grade));
    return (
        <Row gutter={24} style={{ marginBottom: 12 }}>
            <Col><Statistic title="Записей" value={data.length} /></Col>
            <Col>
                <Statistic title="Средний балл" value={a}
                           valueStyle={{ color: parseFloat(a) >= 7 ? "#3f8600" : parseFloat(a) >= 5 ? "#d46b08" : "#cf1322" }} />
            </Col>
            <Col><Statistic title="Минимум" value={min} /></Col>
            <Col><Statistic title="Максимум" value={max} /></Col>
        </Row>
    );
};

const gradeColumns = (showSubject = true, showStudent = true) => [
    ...(showStudent ? [{
        title: "Учащийся", dataIndex: "studentName", key: "studentName",
        sorter: (a: GradeResponse, b: GradeResponse) => (a.studentName || "").localeCompare(b.studentName || ""),
        render: (n?: string) => n || "—",
    }] : []),
    ...(showSubject ? [{
        title: "Предмет", dataIndex: "subjectName", key: "subjectName",
        sorter: (a: GradeResponse, b: GradeResponse) => (a.subjectName || "").localeCompare(b.subjectName || ""),
        render: (n?: string) => n || "—",
    }] : []),
    { title: "Учитель", dataIndex: "teacherName", key: "teacherName", render: (n?: string) => n || "—" },
    {
        title: "Тип работы", dataIndex: "workType", key: "workType",
        filters: (Object.keys(WORK_TYPE_LABELS) as WorkType[]).map(k => ({ text: WORK_TYPE_LABELS[k], value: k })),
        onFilter: (value: any, r: GradeResponse) => r.workType === value,
        render: (wt?: WorkType) => wt ? <Tag>{WORK_TYPE_LABELS[wt]}</Tag> : <Tag color="default">Не указан</Tag>,
    },
    {
        title: "Оценка", dataIndex: "grade", key: "grade", width: 90, align: "center" as const,
        sorter: (a: GradeResponse, b: GradeResponse) => a.grade - b.grade,
        render: (g: number) => <Tag color={gradeColor(g)} style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>{g}</Tag>,
    },
    {
        title: "Дата", dataIndex: "gradeDate", key: "gradeDate", width: 110,
        sorter: (a: GradeResponse, b: GradeResponse) => (a.gradeDate || "").localeCompare(b.gradeDate || ""),
        render: (d?: string) => d ? dayjs(d).format("DD.MM.YYYY") : "—",
    },
    {
        title: "Комментарий", dataIndex: "comment", key: "comment",
        render: (c?: string) => c
            ? <Tooltip title={c}><span style={{ opacity: 0.75 }}>{c.length > 35 ? c.slice(0, 35) + "…" : c}</span></Tooltip>
            : "—",
    },
];

const tableSummary = (pageData: readonly GradeResponse[]) => {
    if (pageData.length === 0) return null;
    const a = avgOf([...pageData])!;
    const min = Math.min(...pageData.map(r => r.grade));
    const max = Math.max(...pageData.map(r => r.grade));
    return (
        <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={4}>
                <Text type="secondary" style={{ fontSize: 12 }}>Итого по странице ({pageData.length} зап.)</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={4} align="center">
                <Space direction="vertical" size={1}>
                    <Tag color={gradeColor(parseFloat(a))}>⌀ {a}</Tag>
                    <Text type="secondary" style={{ fontSize: 11 }}>{min} – {max}</Text>
                </Space>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={5} /><Table.Summary.Cell index={6} />
        </Table.Summary.Row>
    );
};

const EmptyHint: React.FC<{ icon: React.ReactNode; text: string }> = ({ icon, text }) => (
    <div style={{ padding: "60px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, opacity: 0.4 }}>
        <span style={{ fontSize: 52 }}>{icon}</span>
        <Text>{text}</Text>
    </div>
);

// ════════════════════════════════════════════════════════════════════
//  Вкладка «По группе / предмету»
// ════════════════════════════════════════════════════════════════════

const GroupSubjectTab: React.FC<{
    groups: { id: number; name: string }[];
    subjects: { id: number; name: string }[];
}> = ({ groups, subjects }) => {
    const { token } = theme.useToken();
    const [groupId, setGroupId]     = useState<number | null>(null);
    const [subjectId, setSubjectId] = useState<number | null>(null);
    const [data, setData]           = useState<GradeResponse[]>([]);
    const [loading, setLoading]     = useState(false);
    const [shown, setShown]         = useState(false);
    const [xlsLoading, setXlsLoading] = useState(false);
    const [pdfLoading, setPdfLoading] = useState(false);

    const canApply = groupId !== null && subjectId !== null;
    const gName    = groups.find(g => g.id === groupId)?.name ?? "";
    const sName    = subjects.find(s => s.id === subjectId)?.name ?? "";

    const load = async () => {
        if (!canApply) return;
        setLoading(true); setShown(true);
        try {
            const res = await api.get("/api/export/grades/preview", { params: { groupId, subjectId } });
            setData(res.data?.content ?? (Array.isArray(res.data) ? res.data : []));
        } catch (e: any) { message.error("Ошибка: " + (e.response?.data || e.message)); }
        finally { setLoading(false); }
    };

    const dlExcel = () => downloadBlob("/api/export/grades/excel", { groupId, subjectId }, `grades_${gName}_${sName}.xlsx`, XLSX_MIME, setXlsLoading);
    const dlPdf   = () => downloadBlob("/api/export/grades/pdf",   { groupId, subjectId }, `grades_${gName}_${sName}.pdf`,  PDF_MIME,  setPdfLoading);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%", overflow: "hidden" }}>
            <Card size="small" style={{ borderColor: token.colorBorderSecondary, flexShrink: 0 }} styles={{ body: { padding: "12px 16px" } }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <FilterOutlined style={{ color: token.colorPrimary }} />
                    <Select placeholder="Группа" style={{ width: 160 }} showSearch optionFilterProp="label"
                            value={groupId} onChange={v => { setGroupId(v); setShown(false); setData([]); }}
                            options={groups.map(g => ({ value: g.id, label: g.name }))} />
                    <Select placeholder="Предмет" style={{ width: 190 }} showSearch optionFilterProp="label"
                            value={subjectId} onChange={v => { setSubjectId(v); setShown(false); setData([]); }}
                            options={subjects.map(s => ({ value: s.id, label: s.name }))} />
                    <Button type="primary" icon={<EyeOutlined />} disabled={!canApply} loading={loading} onClick={load}>Показать</Button>
                    <Divider type="vertical" style={{ height: 24, margin: "0 4px" }} />
                    <Tooltip title={!canApply ? "Выберите группу и предмет" : undefined}>
                        <Button icon={<FileExcelOutlined />} disabled={!canApply} loading={xlsLoading} onClick={dlExcel}
                                style={canApply ? { color: "#217346", borderColor: "#217346" } : {}}>Excel</Button>
                    </Tooltip>
                    <Tooltip title={!canApply ? "Выберите группу и предмет" : undefined}>
                        <Button icon={<FilePdfOutlined />} disabled={!canApply} loading={pdfLoading} onClick={dlPdf}
                                style={canApply ? { color: "#d4380d", borderColor: "#d4380d" } : {}}>PDF</Button>
                    </Tooltip>
                </div>
            </Card>

            {!shown && <EmptyHint icon={<DownloadOutlined />} text="Выберите группу и предмет, затем нажмите «Показать»" />}
            {shown && loading && <div style={{ padding: "60px 0", display: "flex", justifyContent: "center" }}><Spin size="large" /></div>}
            {shown && !loading && (
                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                        <Space wrap size={6}>
                            <Title level={5} style={{ margin: 0 }}>Результат</Title>
                            {gName && <Tag color="blue">{gName}</Tag>}
                            {sName && <Tag color="purple">{sName}</Tag>}
                        </Space>
                        <Space>
                            <Button size="small" icon={<FileExcelOutlined />} disabled={!data.length} loading={xlsLoading} onClick={dlExcel}
                                    style={data.length ? { color: "#217346", borderColor: "#217346" } : {}}>Скачать Excel</Button>
                            <Button size="small" icon={<FilePdfOutlined />} disabled={!data.length} loading={pdfLoading} onClick={dlPdf}
                                    style={data.length ? { color: "#d4380d", borderColor: "#d4380d" } : {}}>Скачать PDF</Button>
                        </Space>
                    </div>
                    <StatsRow data={data} />
                    {data.length === 0
                        ? <Empty description={<>Нет оценок для <b>{gName}</b> / <b>{sName}</b></>} />
                        : <Table dataSource={data} columns={gradeColumns(false, true)} rowKey="id" size="small" bordered
                                 scroll={{ x: "max-content" }}
                                 pagination={{ pageSize: 20, showSizeChanger: true, showTotal: t => `Всего ${t}` }}
                                 summary={tableSummary} />
                    }
                </div>
            )}
        </div>
    );
};

// ════════════════════════════════════════════════════════════════════
//  Вкладка «По учащемуся»
// ════════════════════════════════════════════════════════════════════

const StudentTab: React.FC<{
    students: { id: number; fullname: string; groupName?: string }[];
    subjects: { id: number; name: string }[];
}> = ({ students, subjects }) => {
    const { token } = theme.useToken();
    const [studentId, setStudentId] = useState<number | null>(null);
    const [subjectId, setSubjectId] = useState<number | null>(null);
    const [data, setData]           = useState<GradeResponse[]>([]);
    const [loading, setLoading]     = useState(false);
    const [shown, setShown]         = useState(false);
    const [xlsLoading, setXlsLoading] = useState(false);
    const [pdfLoading, setPdfLoading] = useState(false);

    const sName   = students.find(s => s.id === studentId)?.fullname ?? "";
    const subName = subjects.find(s => s.id === subjectId)?.name;

    const load = async () => {
        if (!studentId) return;
        setLoading(true); setShown(true);
        try {
            const params: any = { studentId, page: 0, size: 10000 };
            if (subjectId) params.subjectId = subjectId;
            const res = await api.get("/api/grades", { params });
            setData(res.data?.content ?? (Array.isArray(res.data) ? res.data : []));
        } catch (e: any) { message.error("Ошибка: " + (e.response?.data || e.message)); }
        finally { setLoading(false); }
    };

    // ↓ Правильные эндпоинты для экспорта по учащемуся
    const dlExcel = () => downloadBlob(
        "/api/export/grades/student/excel",
        { studentId, ...(subjectId ? { subjectId } : {}) },
        `grades_${sName}.xlsx`, XLSX_MIME, setXlsLoading
    );
    const dlPdf = () => downloadBlob(
        "/api/export/grades/student/pdf",
        { studentId, ...(subjectId ? { subjectId } : {}) },
        `grades_${sName}.pdf`, PDF_MIME, setPdfLoading
    );

    const bySubject = data.reduce<Record<string, GradeResponse[]>>((acc, g) => {
        const key = g.subjectName || String(g.subjectId);
        if (!acc[key]) acc[key] = [];
        acc[key].push(g);
        return acc;
    }, {});

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%", overflow: "hidden" }}>
            <Card size="small" style={{ borderColor: token.colorBorderSecondary, flexShrink: 0 }} styles={{ body: { padding: "12px 16px" } }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <UserOutlined style={{ color: token.colorPrimary }} />
                    <Select placeholder="Учащийся" style={{ width: 220 }} showSearch optionFilterProp="label"
                            value={studentId}
                            onChange={v => { setStudentId(v); setShown(false); setData([]); }}
                            options={students.map(s => ({
                                value: s.id,
                                label: s.fullname + (s.groupName ? ` (${s.groupName})` : ""),
                            }))} />
                    <BookOutlined style={{ color: token.colorTextSecondary }} />
                    <Select placeholder="Предмет (необязательно)" style={{ width: 200 }}
                            showSearch optionFilterProp="label" allowClear value={subjectId}
                            onChange={v => { setSubjectId(v ?? null); setShown(false); setData([]); }}
                            options={subjects.map(s => ({ value: s.id, label: s.name }))} />
                    <Button type="primary" icon={<EyeOutlined />} disabled={!studentId} loading={loading} onClick={load}>Показать</Button>
                    <Divider type="vertical" style={{ height: 24, margin: "0 4px" }} />
                    <Tooltip title={!studentId ? "Выберите учащегося" : undefined}>
                        <Button icon={<FileExcelOutlined />} disabled={!studentId} loading={xlsLoading} onClick={dlExcel}
                                style={studentId ? { color: "#217346", borderColor: "#217346" } : {}}>Excel</Button>
                    </Tooltip>
                    <Tooltip title={!studentId ? "Выберите учащегося" : undefined}>
                        <Button icon={<FilePdfOutlined />} disabled={!studentId} loading={pdfLoading} onClick={dlPdf}
                                style={studentId ? { color: "#d4380d", borderColor: "#d4380d" } : {}}>PDF</Button>
                    </Tooltip>
                </div>
            </Card>

            {!shown && <EmptyHint icon={<UserOutlined />} text="Выберите учащегося и нажмите «Показать»" />}
            {shown && loading && <div style={{ padding: "60px 0", display: "flex", justifyContent: "center" }}><Spin size="large" /></div>}
            {shown && !loading && (
                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                        <Space wrap size={6}>
                            <Title level={5} style={{ margin: 0 }}>{sName}</Title>
                            {subName && <Tag color="purple">{subName}</Tag>}
                        </Space>
                        <Space>
                            <Button size="small" icon={<FileExcelOutlined />} disabled={!data.length} loading={xlsLoading} onClick={dlExcel}
                                    style={data.length ? { color: "#217346", borderColor: "#217346" } : {}}>Скачать Excel</Button>
                            <Button size="small" icon={<FilePdfOutlined />} disabled={!data.length} loading={pdfLoading} onClick={dlPdf}
                                    style={data.length ? { color: "#d4380d", borderColor: "#d4380d" } : {}}>Скачать PDF</Button>
                        </Space>
                    </div>
                    <StatsRow data={data} />
                    {!subjectId && Object.keys(bySubject).length > 1 && (
                        <Card size="small" title={<Text strong style={{ fontSize: 13 }}>Средний балл по предметам</Text>}>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                {Object.entries(bySubject).map(([subj, grades]) => {
                                    const a = avgOf(grades)!;
                                    return (
                                        <Tag key={subj} color={gradeColor(parseFloat(a))} style={{ fontSize: 13, padding: "2px 10px" }}>
                                            {subj}: <b>{a}</b>
                                        </Tag>
                                    );
                                })}
                            </div>
                        </Card>
                    )}
                    {data.length === 0
                        ? <Empty description="Нет оценок" />
                        : <Table dataSource={data} columns={gradeColumns(!subjectId, false)} rowKey="id" size="small" bordered
                                 scroll={{ x: "max-content" }}
                                 pagination={{ pageSize: 20, showSizeChanger: true, showTotal: t => `Всего ${t}` }}
                                 summary={tableSummary} />
                    }
                </div>
            )}
        </div>
    );
};

// ════════════════════════════════════════════════════════════════════
//  Вкладка «Статистика»
// ════════════════════════════════════════════════════════════════════

interface StudentStats {
    studentId: number; studentName: string; groupName: string;
    totalGrades: number; avgGrade: number; badGrades: number;
    absences: number; lates: number; totalAttendance: number;
}

const BAD_GRADE_THRESHOLD = 5;

const StatisticsTab: React.FC<{
    groups: { id: number; name: string }[];
    students: { id: number; fullname: string; groupName?: string; groupId?: number }[];
}> = ({ groups, students }) => {
    const { token } = theme.useToken();
    const [groupId, setGroupId]   = useState<number | null>(null);
    const [stats, setStats]       = useState<StudentStats[]>([]);
    const [loading, setLoading]   = useState(false);
    const [shown, setShown]       = useState(false);
    const [xlsLoading, setXlsLoading] = useState(false);
    const [pdfLoading, setPdfLoading] = useState(false);

    const riskLevel = (s: StudentStats): "high" | "medium" | "low" => {
        if (s.avgGrade < 4 || s.absences >= 10) return "high";
        if (s.avgGrade < 6 || s.absences >= 5 || s.badGrades >= 3) return "medium";
        return "low";
    };

    const load = async () => {
        setLoading(true); setShown(true);
        try {
            const targetStudents = groupId ? students.filter(s => s.groupId === groupId) : students;
            if (targetStudents.length === 0) { setStats([]); setLoading(false); return; }

            const [gradesRes, attRes] = await Promise.all([
                api.get("/api/grades",     { params: { page: 0, size: 10000 } }),
                api.get("/api/attendance", { params: { page: 0, size: 10000 } }),
            ]);
            const allGrades: GradeResponse[]   = gradesRes.data?.content ?? (Array.isArray(gradesRes.data) ? gradesRes.data : []);
            const allAtt: AttendanceResponse[]  = attRes.data?.content    ?? (Array.isArray(attRes.data)    ? attRes.data    : []);

            const result: StudentStats[] = targetStudents.map(st => {
                const sg = allGrades.filter(g => g.studentId === st.id);
                const sa = allAtt.filter(a => a.studentId === st.id);
                const avg = sg.length > 0 ? parseFloat((sg.reduce((s, g) => s + g.grade, 0) / sg.length).toFixed(2)) : 0;
                return {
                    studentId: st.id, studentName: st.fullname, groupName: st.groupName || "",
                    totalGrades: sg.length, avgGrade: avg,
                    badGrades: sg.filter(g => g.grade < BAD_GRADE_THRESHOLD).length,
                    absences: sa.filter(a => a.status === "ABSENT" || a.status === "EXCUSED").length,
                    lates: sa.filter(a => a.status === "LATE").length,
                    totalAttendance: sa.length,
                };
            });
            result.sort((a, b) => (b.badGrades + b.absences) - (a.badGrades + a.absences));
            setStats(result);
        } catch (e: any) { message.error("Ошибка: " + (e.response?.data || e.message)); }
        finally { setLoading(false); }
    };

    const dlExcel = () => downloadBlob("/api/export/statistics/excel", groupId ? { groupId } : {}, "statistics.xlsx", XLSX_MIME, setXlsLoading);
    const dlPdf   = () => downloadBlob("/api/export/statistics/pdf",   groupId ? { groupId } : {}, "statistics.pdf",  PDF_MIME,  setPdfLoading);

    const columns = [
        {
            title: "Учащийся", dataIndex: "studentName", key: "studentName",
            sorter: (a: StudentStats, b: StudentStats) => a.studentName.localeCompare(b.studentName),
            render: (name: string, r: StudentStats) => (
                <div><div style={{ fontWeight: 500 }}>{name}</div><div style={{ fontSize: 12, opacity: 0.6 }}>{r.groupName}</div></div>
            ),
        },
        {
            title: "Ср. балл", dataIndex: "avgGrade", key: "avgGrade", width: 100, align: "center" as const,
            sorter: (a: StudentStats, b: StudentStats) => a.avgGrade - b.avgGrade,
            render: (v: number, r: StudentStats) => r.totalGrades === 0 ? "—" : <Tag color={gradeColor(v)} style={{ fontWeight: 700, fontSize: 13 }}>{v}</Tag>,
        },
        {
            title: "Плохих оценок", dataIndex: "badGrades", key: "badGrades", width: 140, align: "center" as const,
            sorter: (a: StudentStats, b: StudentStats) => b.badGrades - a.badGrades,
            render: (v: number, r: StudentStats) => r.totalGrades === 0 ? "—" : (
                <Space direction="vertical" size={2} style={{ width: "100%" }}>
                    <span style={{ color: v > 0 ? "#cf1322" : undefined, fontWeight: v > 0 ? 600 : 400 }}>{v} / {r.totalGrades}</span>
                    <Progress percent={Math.round((v / r.totalGrades) * 100)} size="small" showInfo={false}
                              strokeColor={v / r.totalGrades > 0.4 ? "#ff4d4f" : v / r.totalGrades > 0.2 ? "#fa8c16" : "#52c41a"} />
                </Space>
            ),
        },
        {
            title: "Пропуски", dataIndex: "absences", key: "absences", width: 120, align: "center" as const,
            sorter: (a: StudentStats, b: StudentStats) => b.absences - a.absences,
            render: (v: number, r: StudentStats) => r.totalAttendance === 0 ? "—" : (
                <Space direction="vertical" size={2} style={{ width: "100%" }}>
                    <span style={{ color: v > 0 ? "#d46b08" : undefined, fontWeight: v > 0 ? 600 : 400 }}>{v} / {r.totalAttendance}</span>
                    <Progress percent={Math.round((v / r.totalAttendance) * 100)} size="small" showInfo={false}
                              strokeColor={v / r.totalAttendance > 0.3 ? "#ff4d4f" : v / r.totalAttendance > 0.15 ? "#fa8c16" : "#52c41a"} />
                </Space>
            ),
        },
        {
            title: "Опозданий", dataIndex: "lates", key: "lates", width: 100, align: "center" as const,
            sorter: (a: StudentStats, b: StudentStats) => b.lates - a.lates,
            render: (v: number) => v > 0 ? <Tag color="orange">{v}</Tag> : <span style={{ opacity: 0.4 }}>0</span>,
        },
        {
            title: "Статус", key: "risk", width: 160,
            sorter: (a: StudentStats, b: StudentStats) => ({ high: 0, medium: 1, low: 2 }[riskLevel(a)] - { high: 0, medium: 1, low: 2 }[riskLevel(b)]),
            render: (_: any, r: StudentStats) => {
                const lvl = riskLevel(r);
                return lvl === "high" ? <Tag color="red">Высокий риск</Tag>
                    : lvl === "medium" ? <Tag color="orange">Требует внимания</Tag>
                        : <Tag color="green">Норма</Tag>;
            },
        },
    ];

    const highRisk = stats.filter(s => riskLevel(s) === "high");
    const medRisk  = stats.filter(s => riskLevel(s) === "medium");

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%", overflow: "hidden" }}>
            <Card size="small" style={{ borderColor: token.colorBorderSecondary, flexShrink: 0 }} styles={{ body: { padding: "12px 16px" } }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <WarningOutlined style={{ color: "#fa8c16" }} />
                    <Text strong>Анализ успеваемости и посещаемости:</Text>
                    <Select placeholder="Все группы" style={{ width: 180 }} showSearch optionFilterProp="label"
                            allowClear value={groupId} onChange={v => setGroupId(v ?? null)}
                            options={groups.map(g => ({ value: g.id, label: g.name }))} />
                    <Button type="primary" icon={<EyeOutlined />} loading={loading} onClick={load}>Показать</Button>
                    <Divider type="vertical" style={{ height: 24, margin: "0 4px" }} />
                    <Button icon={<FileExcelOutlined />} disabled={!stats.length} loading={xlsLoading} onClick={dlExcel}
                            style={stats.length ? { color: "#217346", borderColor: "#217346" } : {}}>Excel</Button>
                    <Button icon={<FilePdfOutlined />} disabled={!stats.length} loading={pdfLoading} onClick={dlPdf}
                            style={stats.length ? { color: "#d4380d", borderColor: "#d4380d" } : {}}>PDF</Button>
                </div>
            </Card>

            {!shown && <EmptyHint icon={<FallOutlined />} text="Нажмите «Показать» для анализа успеваемости" />}
            {shown && loading && <div style={{ padding: "60px 0", display: "flex", justifyContent: "center" }}><Spin size="large" /></div>}
            {shown && !loading && (
                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
                    {stats.length > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                            <Row gutter={16} style={{ flex: 1 }}>
                                <Col><Statistic title="Учащихся" value={stats.length} /></Col>
                                <Col>
                                    <Statistic title="Высокий риск" value={highRisk.length}
                                               valueStyle={{ color: highRisk.length > 0 ? "#cf1322" : undefined }}
                                               prefix={highRisk.length > 0 ? <WarningOutlined /> : undefined} />
                                </Col>
                                <Col>
                                    <Statistic title="Требуют внимания" value={medRisk.length}
                                               valueStyle={{ color: medRisk.length > 0 ? "#d46b08" : undefined }} />
                                </Col>
                                <Col>
                                    <Statistic title="Средний балл"
                                               value={stats.filter(s => s.totalGrades > 0).length > 0
                                                   ? (stats.filter(s => s.totalGrades > 0).reduce((s, r) => s + r.avgGrade, 0) /
                                                       stats.filter(s => s.totalGrades > 0).length).toFixed(2)
                                                   : "—"} />
                                </Col>
                            </Row>
                            <Space>
                                <Button size="small" icon={<FileExcelOutlined />} disabled={!stats.length} loading={xlsLoading} onClick={dlExcel}
                                        style={stats.length ? { color: "#217346", borderColor: "#217346" } : {}}>Скачать Excel</Button>
                                <Button size="small" icon={<FilePdfOutlined />} disabled={!stats.length} loading={pdfLoading} onClick={dlPdf}
                                        style={stats.length ? { color: "#d4380d", borderColor: "#d4380d" } : {}}>Скачать PDF</Button>
                            </Space>
                        </div>
                    )}
                    {highRisk.length > 0 && (
                        <Alert type="error" showIcon
                               message={`${highRisk.length} учащихся в зоне высокого риска`}
                               description={highRisk.map(s => s.studentName).join(", ")} />
                    )}
                    {stats.length === 0
                        ? <Empty description="Нет данных" />
                        : <Table dataSource={stats} columns={columns} rowKey="studentId" size="small" bordered
                                 scroll={{ x: "max-content" }}
                                 rowClassName={r => riskLevel(r) === "high" ? "row-risk-high" : ""}
                                 pagination={{ pageSize: 20, showSizeChanger: true, showTotal: t => `Всего ${t}` }} />
                    }
                </div>
            )}
            <style>{`.row-risk-high td { background: rgba(255,77,79,0.06) !important; }`}</style>
        </div>
    );
};

// ════════════════════════════════════════════════════════════════════
//  Корневой компонент
// ════════════════════════════════════════════════════════════════════

const ExportPanel: React.FC = () => {
    const [groups, setGroups]     = useState<{ id: number; name: string }[]>([]);
    const [subjects, setSubjects] = useState<{ id: number; name: string }[]>([]);
    const [students, setStudents] = useState<{ id: number; fullname: string; groupName?: string; groupId?: number }[]>([]);

    useEffect(() => {
        Promise.all([getAllGroups(), fetchSubjects(), fetchStudents()]).then(([g, s, st]) => {
            setGroups(g);
            setSubjects(s);
            setStudents(st.map((x: any) => ({
                id: x.id, fullname: x.fullname,
                groupName: x.group?.name || x.groupName || "",
                groupId: x.group?.id || x.groupId,
            })));
        });
    }, []);

    const tabItems = [
        { key: "1", label: <span><FileExcelOutlined style={{ marginRight: 6 }} />По группе / предмету</span>,
            children: <GroupSubjectTab groups={groups} subjects={subjects} /> },
        { key: "2", label: <span><UserOutlined style={{ marginRight: 6 }} />По учащемуся</span>,
            children: <StudentTab students={students} subjects={subjects} /> },
        { key: "3", label: <span><WarningOutlined style={{ marginRight: 6 }} />Статистика</span>,
            children: <StatisticsTab groups={groups} students={students} /> },
    ];

    return (
        <>
            <style>{`
                .export-tabs { height: 100%; display: flex; flex-direction: column; }
                .export-tabs > .ant-tabs-nav { flex-shrink: 0; padding: 0 10px; }
                .export-tabs > .ant-tabs-content-holder { flex: 1; min-height: 0; overflow: hidden; }
                .export-tabs > .ant-tabs-content-holder > .ant-tabs-content { height: 100%; }
                .export-tabs > .ant-tabs-content-holder > .ant-tabs-content > .ant-tabs-tabpane { height: 100%; padding: 0 10px; overflow: hidden; }
            `}</style>
            <Tabs items={tabItems} className="export-tabs" />
        </>
    );
};

export default ExportPanel;