import React, { useState, useCallback, useRef } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { theme, message } from "antd";
import api from "../api/api";

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

type BlockType = "IF" | "AND" | "OR" | "NOT";
type FieldKind = "number" | "string" | "date" | "enum";

interface FieldDef { label: string; value: string; kind: FieldKind; enumValues?: string[]; }
interface Block { id: string; type: BlockType; field?: string; operator?: string; value?: string; values?: string[]; }
interface Preset { id: string; name: string; rootEntity: string; blocks: Block[]; createdAt: string; }

const WORK_TYPES   = ["CURRENT","CONTROL","INDEPENDENT","TEST","EXAM","FINAL"];
const ATT_STATUSES = ["PRESENT","ABSENT","LATE","EXCUSED"];
const DAYS         = ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"];

const ENTITY_FIELDS: Record<string, FieldDef[]> = {
    Student: [
        { label: "ФИО учащегося",        value: "fullname",                       kind: "string" },
        { label: "Телефон",               value: "phone",                          kind: "string" },
        { label: "Возраст",               value: "age",                            kind: "number" },
        { label: "Дата рождения",         value: "birthdate",                      kind: "date"   },
        { label: "Название группы",       value: "group.name",                     kind: "string" },
        { label: "Оценка",                value: "grades.grade",                   kind: "number" },
        { label: "Тип работы",            value: "grades.workType",                kind: "enum",  enumValues: WORK_TYPES },
        { label: "Дата оценки",           value: "grades.gradeDate",               kind: "date"   },
        { label: "Статус посещения",      value: "attendances.status",             kind: "enum",  enumValues: ATT_STATUSES },
        { label: "Дата посещения",        value: "attendances.attendanceDate",     kind: "date"   },
    ],
    Group: [
        { label: "Название группы",       value: "name",                           kind: "string" },
        { label: "Кол-во учащихся",       value: "amount",                         kind: "number" },
        { label: "ФИО учащегося",         value: "students.fullname",              kind: "string" },
        { label: "Оценка учащегося",      value: "students.grades.grade",          kind: "number" },
        { label: "Кабинет (расписание)",  value: "schedules.classroom",            kind: "string" },
        { label: "День недели",           value: "schedules.dayOfWeek",            kind: "enum",  enumValues: DAYS },
        { label: "Номер урока",           value: "schedules.lessonNumber",         kind: "number" },
    ],
    Grade: [
        { label: "Оценка",                value: "grade",                          kind: "number" },
        { label: "Тип работы",            value: "workType",                       kind: "enum",  enumValues: WORK_TYPES },
        { label: "Дата оценки",           value: "gradeDate",                      kind: "date"   },
        { label: "Комментарий",           value: "comment",                        kind: "string" },
        { label: "ФИО учащегося",         value: "student.fullname",               kind: "string" },
        { label: "Группа учащегося",      value: "student.group.name",             kind: "string" },
        { label: "Предмет",               value: "subject.name",                   kind: "string" },
        { label: "ФИО учителя",           value: "teacher.fullname",               kind: "string" },
    ],
    Attendance: [
        { label: "Статус посещения",      value: "status",                         kind: "enum",  enumValues: ATT_STATUSES },
        { label: "Дата посещения",        value: "attendanceDate",                 kind: "date"   },
        { label: "Примечание",            value: "note",                           kind: "string" },
        { label: "ФИО учащегося",         value: "student.fullname",               kind: "string" },
        { label: "Группа",                value: "student.group.name",             kind: "string" },
        { label: "Предмет",               value: "subject.name",                   kind: "string" },
        { label: "ФИО учителя",           value: "teacher.fullname",               kind: "string" },
    ],
    Schedule: [
        { label: "День недели",           value: "dayOfWeek",                      kind: "enum",  enumValues: DAYS },
        { label: "Номер урока",           value: "lessonNumber",                   kind: "number" },
        { label: "Кабинет",               value: "classroom",                      kind: "string" },
        { label: "Группа",                value: "group.name",                     kind: "string" },
        { label: "Предмет",               value: "subject.name",                   kind: "string" },
        { label: "ФИО учителя",           value: "teacher.fullname",               kind: "string" },
    ],
    Subject: [
        { label: "Название предмета",     value: "name",                           kind: "string" },
        { label: "ФИО учителя",           value: "teachers.fullname",              kind: "string" },
    ],
    Teacher: [
        { label: "ФИО учителя",           value: "fullname",                       kind: "string" },
        { label: "Телефон",               value: "phone",                          kind: "string" },
        { label: "Предмет",               value: "subjects.name",                  kind: "string" },
    ],
};

const ENTITY_LABELS: Record<string, string> = {
    Student: "Учащиеся", Group: "Группы", Grade: "Оценки",
    Attendance: "Посещаемость", Schedule: "Расписание", Subject: "Предметы", Teacher: "Учителя",
};

const COL_LABELS: Record<string, string> = {
    id: "ID", fullname: "ФИО", age: "Возраст", phone: "Телефон", birthdate: "Дата рождения",
    name: "Название", amount: "Кол-во", grade: "Оценка", workType: "Тип работы",
    gradeDate: "Дата оценки", comment: "Комментарий", status: "Статус",
    attendanceDate: "Дата посещения", note: "Примечание", dayOfWeek: "День недели",
    lessonNumber: "Номер урока", classroom: "Кабинет",
    student_id: "ID учащегося", student_fullname: "ФИО учащегося",
    student_age: "Возраст уч.", student_phone: "Телефон уч.", student_birthdate: "Дата рождения уч.",
    group_id: "ID группы", group_name: "Группа", group_amount: "Кол-во в группе",
    subject_id: "ID предмета", subject_name: "Предмет",
    teacher_id: "ID учителя", teacher_fullname: "ФИО учителя", teacher_phone: "Телефон учителя",
};
const colLabel = (k: string) => COL_LABELS[k] ?? k;

const OPERATORS: Record<FieldKind, { label: string; value: string }[]> = {
    number: [
        { label: "=", value: "EQUAL" }, { label: "≠", value: "NOT_EQUAL" },
        { label: ">", value: "GREATER_THAN" }, { label: "<", value: "LESS_THAN" },
        { label: "≥", value: "GREATER_THAN_OR_EQUAL" }, { label: "≤", value: "LESS_THAN_OR_EQUAL" },
    ],
    string: [
        { label: "равно", value: "STRING_EQUAL" }, { label: "содержит", value: "CONTAINS" },
        { label: "начинается с", value: "STARTS_WITH" }, { label: "заканчивается", value: "ENDS_WITH" },
        { label: "длина =", value: "LENGTH_EQUAL" }, { label: "длина >", value: "LENGTH_GREATER_THAN" },
        { label: "длина <", value: "LENGTH_LESS_THAN" },
    ],
    date: [{ label: "=", value: "DATE_EQUAL" }, { label: "до", value: "BEFORE" }, { label: "после", value: "AFTER" }],
    enum: [{ label: "один из", value: "IN_LIST" }],
};

const uid = () => Math.random().toString(36).slice(2, 9);
const getField = (root: string, v?: string) => ENTITY_FIELDS[root]?.find(f => f.value === v);
const defaultOp = (kind: FieldKind) => OPERATORS[kind][0].value;

const PRESET_KEY  = (u: string) => `qb_presets_v3_${u}`;
const loadPresets = (u: string): Preset[] => { try { return JSON.parse(localStorage.getItem(PRESET_KEY(u)) ?? "[]"); } catch { return []; } };
const savePresets = (u: string, p: Preset[]) => localStorage.setItem(PRESET_KEY(u), JSON.stringify(p));

const TYPE_COLOR: Record<BlockType, string> = {
    IF: "#007AFF", AND: "#34C759", OR: "#AF52DE", NOT: "#FF3B30",
};

// IF — единственный блок с полями. AND / OR / NOT — коннекторы без полей.
// Бэкенд GenericFilterParser.parse() читает NOT как pending-флаг перед следующим IF:
//   [NOT, IF field=X op=Y val=Z]  →  WHERE NOT (X Y Z)
const SIDEBAR_ITEMS: { id: string; type: BlockType; label: string; hint: string }[] = [
    { id: "tmpl-IF",  type: "IF",  label: "ЕСЛИ",  hint: "условие" },
    { id: "tmpl-AND", type: "AND", label: "И",     hint: "оба верны" },
    { id: "tmpl-OR",  type: "OR",  label: "ИЛИ",   hint: "одно из" },
    { id: "tmpl-NOT", type: "NOT", label: "НЕ",    hint: "отрицание" },
];

// ─── Скачать файл (POST, для фильтров) ───────────────────────────────────────
const downloadPost = async (
    url: string,
    body: object,
    filename: string,
    mime: string,
    setLoading: (v: boolean) => void
) => {
    setLoading(true);
    try {
        const res = await api.post(url, body, { responseType: "arraybuffer" });
        await saveFileWithDialog(res.data as ArrayBuffer, filename, mime);
    } catch {
        message.error("Ошибка экспорта");
    } finally {
        setLoading(false);
    }
};

// ─── InlineDrop ───────────────────────────────────────────────────────────────
const InlineDrop: React.FC<{
    label: string; options: { label: string; value: string }[];
    onSelect: (v: string) => void; accent?: boolean; isDark: boolean;
}> = ({ label, options, onSelect, accent, isDark }) => {
    const [open, setOpen] = useState(false);
    const { token } = theme.useToken();
    const border = isDark ? "#3a3a3c" : token.colorBorderSecondary;
    return (
        <div style={{ position: "relative", display: "inline-block" }}>
            <span onClick={() => setOpen(o => !o)} style={{
                cursor: "pointer",
                background: accent ? (isDark ? "#0d2a4a" : token.colorPrimary + "16") : (isDark ? "#2c2c2e" : token.colorFillSecondary),
                color: accent ? token.colorPrimary : (isDark ? "#ebebf5" : token.colorText),
                border: `1px solid ${accent ? token.colorPrimary + "44" : border}`,
                borderRadius: 7, padding: "2px 9px", fontSize: 13, fontWeight: 500,
                userSelect: "none", whiteSpace: "nowrap",
            }}>
                {label} <span style={{ opacity: 0.45, fontSize: 10 }}>▾</span>
            </span>
            {open && (
                <>
                    <div style={{ position: "fixed", inset: 0, zIndex: 999 }} onClick={() => setOpen(false)} />
                    <div style={{
                        position: "absolute", top: "calc(100% + 5px)", left: 0, zIndex: 1000,
                        background: isDark ? "#1c1c1e" : "#fff",
                        borderRadius: 10, minWidth: 185, maxHeight: 270, overflowY: "auto",
                        boxShadow: isDark ? "0 10px 36px rgba(0,0,0,0.65)" : "0 10px 36px rgba(0,0,0,0.16)",
                        border: `1px solid ${border}`,
                    }}>
                        {options.map(opt => (
                            <div key={opt.value} onClick={() => { onSelect(opt.value); setOpen(false); }}
                                 style={{ padding: "8px 14px", cursor: "pointer", fontSize: 13, color: isDark ? "#ebebf5" : token.colorText }}
                                 onMouseEnter={e => (e.currentTarget.style.background = isDark ? "#2c2c2e" : token.colorFillSecondary)}
                                 onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                                {opt.label}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

// ─── ValueInput ───────────────────────────────────────────────────────────────
const ValueInput: React.FC<{
    field?: FieldDef; operator?: string; value?: string; values?: string[];
    isDark: boolean; onChange: (v: string, vs?: string[]) => void;
}> = ({ field, operator, value, values, isDark, onChange }) => {
    const { token } = theme.useToken();
    if (!field) return null;
    const base: React.CSSProperties = {
        background: "transparent", border: "none",
        borderBottom: `1.5px solid ${token.colorPrimary}66`,
        outline: "none", fontSize: 13, color: isDark ? "#ebebf5" : token.colorText,
        padding: "1px 4px", minWidth: 40, fontFamily: "inherit",
        width: `${Math.max(40, (value?.length ?? 0) * 8 + 24)}px`,
    };
    if (operator === "IN_LIST" && field.enumValues) {
        const sel = values ?? [];
        return (
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                {field.enumValues.map(ev => (
                    <span key={ev}
                          onClick={() => onChange("", sel.includes(ev) ? sel.filter(v => v !== ev) : [...sel, ev])}
                          style={{
                              cursor: "pointer", padding: "2px 8px", borderRadius: 6, fontSize: 12,
                              background: sel.includes(ev) ? token.colorPrimary : (isDark ? "#2c2c2e" : token.colorFillSecondary),
                              color: sel.includes(ev) ? "#fff" : (isDark ? "#ebebf5" : token.colorText),
                              userSelect: "none", transition: "background 0.15s",
                          }}>{ev}</span>
                ))}
            </div>
        );
    }
    if (field.kind === "date") return (
        <input type="date" value={value ?? ""} onChange={e => onChange(e.target.value)}
               style={{ ...base, width: 130, colorScheme: isDark ? "dark" : "light" }} />
    );
    return (
        <input type={field.kind === "number" ? "number" : "text"} value={value ?? ""}
               placeholder="значение" onChange={e => onChange(e.target.value)} style={base} />
    );
};

// ─── BlockCard ────────────────────────────────────────────────────────────────
const BlockCard: React.FC<{
    block: Block; rootEntity: string; isDark: boolean;
    onChange: (id: string, p: Partial<Block>) => void;
    onDelete: (id: string) => void;
}> = ({ block, rootEntity, isDark, onChange, onDelete }) => {
    const { token } = theme.useToken();
    const fields  = ENTITY_FIELDS[rootEntity] ?? [];
    const field   = getField(rootEntity, block.field);
    const opOpts  = field ? OPERATORS[field.kind] : [];
    const opLabel = opOpts.find(o => o.value === block.operator)?.label ?? "...";
    const color   = TYPE_COLOR[block.type];

    const bgLight: Record<BlockType, string> = { IF: "#EBF3FF", AND: "#EDFAEF", OR: "#F7EEFF", NOT: "#FFF3F3" };
    const bgDark:  Record<BlockType, string> = { IF: "#0d2137", AND: "#0d2010", OR: "#1a0d2a", NOT: "#2a0d0d" };

    // Только IF имеет поля — NOT/AND/OR это коннекторы (как в бэкенде)
    const isIF = block.type === "IF";

    // Подсказка для коннекторов
    const connectorHint: Partial<Record<BlockType, string>> = {
        AND: "— оба условия должны выполняться",
        OR:  "— достаточно одного условия",
        NOT: "— отрицание следующего условия ЕСЛИ",
    };

    return (
        <div style={{
            background: isDark ? bgDark[block.type] : bgLight[block.type],
            borderRadius: 12, padding: "9px 12px",
            display: "flex", alignItems: "center", gap: 8,
            boxShadow: isDark ? "0 1px 4px rgba(0,0,0,0.45)" : "0 1px 3px rgba(0,0,0,0.08)",
            borderLeft: `3px solid ${color}`,
            minHeight: 44, width: "100%", boxSizing: "border-box",
        }}>
            <span style={{
                fontWeight: 800, fontSize: 11, color,
                letterSpacing: 0.6, minWidth: 30, textTransform: "uppercase",
                background: color + "1a", borderRadius: 5, padding: "1px 6px",
            }}>
                {block.type}
            </span>

            {isIF && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, flexWrap: "wrap" }}>
                    <InlineDrop
                        label={field?.label ?? "поле"}
                        options={fields.map(f => ({ label: f.label, value: f.value }))}
                        onSelect={v => {
                            const f = fields.find(x => x.value === v)!;
                            onChange(block.id, { field: v, operator: defaultOp(f.kind), value: "", values: [] });
                        }}
                        accent isDark={isDark}
                    />
                    {field && (
                        <InlineDrop label={opLabel} options={opOpts} isDark={isDark}
                                    onSelect={v => onChange(block.id, { operator: v, value: "", values: [] })} />
                    )}
                    {field && (
                        <ValueInput field={field} operator={block.operator}
                                    value={block.value} values={block.values} isDark={isDark}
                                    onChange={(v, vs) => onChange(block.id, { value: v, values: vs })} />
                    )}
                </div>
            )}

            {!isIF && connectorHint[block.type] && (
                <span style={{ fontSize: 12, color: isDark ? "#8e8e93" : token.colorTextSecondary, flex: 1, fontStyle: "italic" }}>
                    {connectorHint[block.type]}
                </span>
            )}

            <button onClick={() => onDelete(block.id)} style={{
                marginLeft: "auto", background: "none", border: "none",
                cursor: "pointer", color: isDark ? "#636366" : token.colorTextSecondary,
                fontSize: 18, lineHeight: 1, opacity: 0.45, padding: "0 2px", borderRadius: 5,
                transition: "opacity 0.15s",
            }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                    onMouseLeave={e => (e.currentTarget.style.opacity = "0.45")}
            >×</button>
        </div>
    );
};

// ─── PresetsPanel ─────────────────────────────────────────────────────────────
const PresetsPanel: React.FC<{
    username: string; currentBlocks: Block[]; rootEntity: string; isDark: boolean;
    onLoad: (blocks: Block[], entity: string) => void;
}> = ({ username, currentBlocks, rootEntity, isDark, onLoad }) => {
    const { token } = theme.useToken();
    const [presets, setPresets] = useState<Preset[]>(() => loadPresets(username));
    const [naming, setNaming]   = useState(false);
    const [name, setName]       = useState("");

    const bg      = isDark ? "#1c1c1e" : token.colorBgElevated;
    const border  = isDark ? "#38383a" : token.colorBorderSecondary;
    const text    = isDark ? "#ebebf5" : token.colorText;
    const textSec = isDark ? "#8e8e93" : token.colorTextSecondary;
    const itemBg  = isDark ? "#2c2c2e" : token.colorFillSecondary;

    const save = () => {
        if (!name.trim()) return;
        const p: Preset = { id: uid(), name: name.trim(), rootEntity, blocks: currentBlocks, createdAt: new Date().toISOString() };
        const next = [p, ...presets];
        setPresets(next); savePresets(username, next);
        setName(""); setNaming(false);
        message.success("Пресет сохранён");
    };
    const remove = (id: string) => { const next = presets.filter(p => p.id !== id); setPresets(next); savePresets(username, next); };

    return (
        <div style={{
            width: "100%", flex: 1, minHeight: 0, background: bg,
            borderRadius: 14, padding: 14, border: `1px solid ${border}`,
            display: "flex", flexDirection: "column", gap: 10, overflowY: "auto",
        }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: textSec, letterSpacing: 0.3 }}>ПРЕСЕТЫ</div>
            {naming ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <input autoFocus value={name} onChange={e => setName(e.target.value)}
                           onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") { setNaming(false); setName(""); } }}
                           placeholder="Название"
                           style={{ background: isDark ? "#2c2c2e" : token.colorBgContainer, border: `1px solid ${border}`, borderRadius: 8, padding: "5px 8px", fontSize: 12, color: text, outline: "none" }} />
                    <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={save} style={{ flex: 1, background: token.colorPrimary, color: "#fff", border: "none", borderRadius: 7, padding: "5px 0", fontSize: 12, cursor: "pointer" }}>Сохранить</button>
                        <button onClick={() => { setNaming(false); setName(""); }} style={{ flex: 1, background: itemBg, color: text, border: "none", borderRadius: 7, padding: "5px 0", fontSize: 12, cursor: "pointer" }}>Отмена</button>
                    </div>
                </div>
            ) : (
                <button onClick={() => { if (!currentBlocks.length) { message.warning("Нет блоков"); return; } setNaming(true); }}
                        style={{ background: "transparent", color: token.colorPrimary, border: `1.5px solid ${token.colorPrimary}44`, borderRadius: 9, padding: "6px 0", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    + Сохранить текущий
                </button>
            )}
            {presets.length === 0 && (
                <div style={{ fontSize: 12, color: textSec, opacity: 0.5, textAlign: "center", paddingTop: 8 }}>Нет пресетов</div>
            )}
            {presets.map(p => (
                <div key={p.id} style={{ background: itemBg, borderRadius: 9, padding: "8px 10px", display: "flex", alignItems: "flex-start", gap: 6 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div onClick={() => { onLoad(p.blocks, p.rootEntity); message.info(`Загружен: «${p.name}»`); }}
                             style={{ fontSize: 12, fontWeight: 500, cursor: "pointer", color: text, wordBreak: "break-word", marginBottom: 2 }}>
                            {p.name}
                        </div>
                        <div style={{ fontSize: 10, color: textSec }}>{ENTITY_LABELS[p.rootEntity]} · {p.blocks.length} блоков</div>
                        <div style={{ fontSize: 10, color: textSec }}>{new Date(p.createdAt).toLocaleDateString("ru")}</div>
                    </div>
                    <button onClick={() => remove(p.id)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: textSec, fontSize: 14, opacity: 0.5, padding: 0 }}
                            onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                            onMouseLeave={e => (e.currentTarget.style.opacity = "0.5")}>×</button>
                </div>
            ))}
        </div>
    );
};

// ─── ResultTable ──────────────────────────────────────────────────────────────
const PAGE_SIZE = 50;

const ResultTable: React.FC<{
    results: Record<string, unknown>[];
    total: number; loading: boolean; isDark: boolean;
    lastRequest: { rootEntity: string; blocks: object[] } | null;
}> = ({ results, total, loading, isDark, lastRequest }) => {
    const { token } = theme.useToken();
    const text    = isDark ? "#ebebf5" : token.colorText;
    const textSec = isDark ? "#8e8e93" : token.colorTextSecondary;
    const border  = isDark ? "#38383a" : token.colorBorderSecondary;
    const [page, setPage]         = useState(0);
    const [xlsLoading, setXlsLoading] = useState(false);
    const [pdfLoading, setPdfLoading] = useState(false);

    const totalPages = Math.ceil(results.length / PAGE_SIZE);
    const pageData   = results.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const cols = results.length > 0
        ? Object.keys(results[0]).filter(k => !k.startsWith("$$") && k !== "hibernateLazyInitializer")
        : [];

    const exportFile = (fmt: "excel" | "pdf") => {
        if (!lastRequest) return;
        const mime = fmt === "excel"
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : "application/pdf";
        downloadPost(
            `/api/v1/filters/export/${fmt}`,
            { ...lastRequest, page: 0, size: 100000 },
            `filter_results.${fmt === "excel" ? "xlsx" : "pdf"}`,
            mime,
            fmt === "excel" ? setXlsLoading : setPdfLoading
        );
    };

    if (loading) return <div style={{ textAlign: "center", padding: 32, color: textSec }}>Загрузка...</div>;
    if (!results.length) return <div style={{ textAlign: "center", padding: 32, color: textSec, opacity: 0.5 }}>Нет результатов</div>;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Шапка: счётчик + кнопки экспорта */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <div style={{ fontSize: 12, color: textSec }}>
                    Найдено: <b style={{ color: text }}>{total}</b>
                    {total > results.length && <span style={{ marginLeft: 6, opacity: 0.6 }}>(показано {results.length})</span>}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    {(["excel", "pdf"] as const).map(fmt => {
                        const isLoading = fmt === "excel" ? xlsLoading : pdfLoading;
                        const color = fmt === "excel" ? "#217346" : "#d4380d";
                        return (
                            <button key={fmt} onClick={() => exportFile(fmt)} disabled={isLoading || !lastRequest}
                                    style={{
                                        padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500,
                                        border: `1px solid ${isLoading ? border : color}`,
                                        color: isLoading ? textSec : color,
                                        background: "transparent", cursor: isLoading ? "default" : "pointer",
                                        transition: "background 0.15s",
                                    }}
                                    onMouseEnter={e => { if (!isLoading) e.currentTarget.style.background = color + "14"; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                                {isLoading ? "⏳" : "⬇"} {fmt === "excel" ? "Excel" : "PDF"}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Таблица */}
            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                    <tr style={{ borderBottom: `2px solid ${border}` }}>
                        {cols.map(c => (
                            <th key={c} style={{
                                padding: "7px 10px", textAlign: "left", color: textSec,
                                fontWeight: 600, whiteSpace: "nowrap",
                                background: isDark ? "#16161a" : token.colorFillSecondary,
                                fontSize: 11, letterSpacing: 0.3,
                            }}>{colLabel(c)}</th>
                        ))}
                    </tr>
                    </thead>
                    <tbody>
                    {pageData.map((row, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${border}22` }}
                            onMouseEnter={e => (e.currentTarget.style.background = isDark ? "#1c1c1e" : token.colorFillSecondary + "88")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                            {cols.map(c => (
                                <td key={c} style={{ padding: "7px 10px", color: text, whiteSpace: "nowrap", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {row[c] != null ? String(row[c]) : "—"}
                                </td>
                            ))}
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            {/* Пагинация */}
            {totalPages > 1 && (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6, paddingTop: 4 }}>
                    <PaginBtn onClick={() => setPage(0)} disabled={page === 0} isDark={isDark}>«</PaginBtn>
                    <PaginBtn onClick={() => setPage(p => p - 1)} disabled={page === 0} isDark={isDark}>‹</PaginBtn>
                    {Array.from({ length: totalPages }, (_, i) => i)
                        .filter(i => Math.abs(i - page) <= 2)
                        .map(i => (
                            <PaginBtn key={i} onClick={() => setPage(i)} isDark={isDark}
                                      active={i === page}>{i + 1}</PaginBtn>
                        ))}
                    <PaginBtn onClick={() => setPage(p => p + 1)} disabled={page === totalPages - 1} isDark={isDark}>›</PaginBtn>
                    <PaginBtn onClick={() => setPage(totalPages - 1)} disabled={page === totalPages - 1} isDark={isDark}>»</PaginBtn>
                    <span style={{ fontSize: 11, color: textSec, marginLeft: 4 }}>стр. {page + 1} / {totalPages}</span>
                </div>
            )}
        </div>
    );
};

const PaginBtn: React.FC<React.PropsWithChildren<{
    onClick: () => void; disabled?: boolean; isDark: boolean; active?: boolean;
}>> = ({ onClick, disabled, isDark, active, children }) => {
    const { token } = theme.useToken();
    return (
        <button onClick={disabled ? undefined : onClick} style={{
            padding: "3px 9px", borderRadius: 7, fontSize: 13, fontWeight: active ? 700 : 500,
            border: `1px solid ${active ? token.colorPrimary : (isDark ? "#38383a" : token.colorBorderSecondary)}`,
            background: active ? token.colorPrimary : "transparent",
            color: disabled ? (isDark ? "#48484a" : token.colorTextDisabled)
                : active ? "#fff" : (isDark ? "#ebebf5" : token.colorText),
            cursor: disabled ? "default" : "pointer",
            opacity: disabled ? 0.5 : 1,
            transition: "background 0.15s",
        }}>{children}</button>
    );
};

// ─── QueryBuilder ─────────────────────────────────────────────────────────────
const QueryBuilder: React.FC<{ username?: string }> = ({ username = "default" }) => {
    const { token } = theme.useToken();
    const isDark = (token.colorBgContainer as string).toLowerCase().includes("14")
        || token.colorBgContainer === "#1f1f1f";

    const [rootEntity, setRootEntity] = useState("Student");
    const [blocks, setBlocks]         = useState<Block[]>([]);
    const [results, setResults]       = useState<Record<string, unknown>[]>([]);
    const [total, setTotal]           = useState(0);
    const [loading, setLoading]       = useState(false);
    const [executed, setExecuted]     = useState(false);
    const [lastRequest, setLastRequest] = useState<{ rootEntity: string; blocks: object[] } | null>(null);

    const changeRoot = (e: string) => { setRootEntity(e); setBlocks([]); setResults([]); setExecuted(false); };

    const makeNewBlock = (type: BlockType): Block => {
        if (type === "IF") {
            const fields = ENTITY_FIELDS[rootEntity] ?? [];
            const f = fields[0];
            return { id: uid(), type: "IF", field: f?.value, operator: f ? defaultOp(f.kind) : undefined, value: "" };
        }
        // AND / OR / NOT — коннекторы, без полей
        return { id: uid(), type };
    };

    const addBlock = useCallback((type: BlockType) => {
        setBlocks(prev => [...prev, makeNewBlock(type)]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rootEntity]);

    const changeBlock = useCallback((id: string, patch: Partial<Block>) => {
        setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b));
    }, []);

    const deleteBlock = useCallback((id: string) => {
        setBlocks(prev => prev.filter(b => b.id !== id));
    }, []);

    const onDragEnd = useCallback((res: DropResult) => {
        if (!res.destination) return;
        if (res.source.droppableId === "qb" && res.destination.droppableId === "qb") {
            if (res.source.index === res.destination.index) return;
            setBlocks(prev => {
                const next = [...prev];
                const [moved] = next.splice(res.source.index, 1);
                next.splice(res.destination!.index, 0, moved);
                return next;
            });
        }
        if (res.source.droppableId === "sidebar" && res.destination.droppableId === "qb") {
            const tmpl = SIDEBAR_ITEMS[res.source.index];
            const newBlock = makeNewBlock(tmpl.type);
            setBlocks(prev => {
                const next = [...prev];
                next.splice(res.destination!.index, 0, newBlock);
                return next;
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rootEntity]);

    const loadPreset = useCallback((b: Block[], entity: string) => {
        setRootEntity(entity);
        setBlocks(b.map(x => ({ ...x, id: uid() })));
        setExecuted(false); setResults([]);
    }, []);

    const execute = async () => {
        setLoading(true); setExecuted(true);
        const payload = { rootEntity, blocks: blocks.map(({ id, ...rest }) => rest), page: 0, size: 500 };
        setLastRequest({ rootEntity, blocks: payload.blocks });
        try {
            const res = await api.post("/api/v1/filters/execute", payload);
            setResults(res.data.content ?? []);
            setTotal(res.data.totalElements ?? 0);
        } catch {
            message.error("Ошибка выполнения запроса");
            setResults([]); setTotal(0);
        } finally { setLoading(false); }
    };

    const clear = () => { setBlocks([]); setResults([]); setTotal(0); setExecuted(false); setLastRequest(null); };

    const bg      = isDark ? "#111113" : token.colorBgContainer;
    const text    = isDark ? "#ebebf5" : token.colorText;
    const textSec = isDark ? "#8e8e93" : token.colorTextSecondary;
    const border  = isDark ? "#38383a" : token.colorBorderSecondary;

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 14, padding: 10, background: bg, overflow: "hidden" }}>

                <div style={{ display: "flex", flex: executed ? "0 0 55%" : 1, gap: 14, overflow: "hidden" }}>

                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 12, overflow: "hidden" }}>
                        <div style={{ flexShrink: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 15, color: text, marginBottom: 8 }}>Конструктор фильтров</div>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                {Object.entries(ENTITY_LABELS).map(([key, label]) => {
                                    const active = key === rootEntity;
                                    return (
                                        <button key={key} onClick={() => changeRoot(key)} style={{
                                            padding: "4px 12px", borderRadius: 20, border: "none", cursor: "pointer",
                                            fontSize: 12, fontWeight: active ? 600 : 400,
                                            background: active ? token.colorPrimary : (isDark ? "#2c2c2e" : token.colorFillSecondary),
                                            color: active ? "#fff" : (isDark ? "#ebebf5" : text),
                                            transition: "all 0.15s",
                                        }}>{label}</button>
                                    );
                                })}
                            </div>
                        </div>

                        <div style={{
                            flex: 1, minHeight: 0, overflowY: "auto", borderRadius: 14,
                            border: `1px solid ${border}`,
                            backgroundImage: isDark
                                ? "radial-gradient(rgba(255,255,255,0.07) 1.5px, transparent 1.5px)"
                                : "radial-gradient(rgba(0,0,0,0.05) 1.5px, transparent 1.5px)",
                            backgroundSize: "20px 20px", padding: 14,
                        }}>
                            <Droppable droppableId="qb">
                                {prov => (
                                    <div ref={prov.innerRef} {...prov.droppableProps}
                                         style={{ display: "flex", flexDirection: "column", alignItems: "center", minHeight: "100%" }}>
                                        {!blocks.length && (
                                            <div style={{
                                                border: `2px dashed ${border}`, borderRadius: 14,
                                                padding: 32, textAlign: "center", color: textSec,
                                                opacity: 0.5, fontSize: 13, marginBottom: 6,
                                                width: "100%", maxWidth: "640px", boxSizing: "border-box",
                                            }}>
                                                Перетащите блок сюда или нажмите кнопку справа →
                                            </div>
                                        )}
                                        {blocks.map((block, i) => (
                                            <Draggable key={block.id} draggableId={block.id} index={i}>
                                                {(p, snap) => (
                                                    <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps}
                                                         style={{ ...p.draggableProps.style, opacity: snap.isDragging ? 0.85 : 1, marginBottom: 6, width: "100%", maxWidth: "640px" }}>
                                                        <BlockCard block={block} rootEntity={rootEntity} isDark={isDark}
                                                                   onChange={changeBlock} onDelete={deleteBlock} />
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {prov.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    </div>

                    {/* Правая колонка */}
                    <div style={{ width: 200, flexShrink: 0, display: "flex", flexDirection: "column", gap: 12, overflow: "hidden" }}>
                        <div style={{
                            background: isDark ? "#1c1c1e" : token.colorBgElevated,
                            borderRadius: 14, padding: 14, border: `1px solid ${border}`,
                            display: "flex", flexDirection: "column", gap: 8, flexShrink: 0,
                        }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: textSec, marginBottom: 2, letterSpacing: 0.3 }}>ДОБАВИТЬ БЛОК</div>
                            <Droppable droppableId="sidebar" isDropDisabled renderClone={(provided, _snap, rubric) => {
                                const b = SIDEBAR_ITEMS[rubric.source.index];
                                return (
                                    <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
                                         style={{ ...provided.draggableProps.style, width: 172 }}>
                                        <div style={{ background: TYPE_COLOR[b.type], color: "#fff", borderRadius: 10, padding: "8px 0", fontSize: 13, fontWeight: 600, textAlign: "center" }}>{b.label}</div>
                                    </div>
                                );
                            }}>
                                {provided => (
                                    <div ref={provided.innerRef} {...provided.droppableProps} style={{ display: "flex", flexDirection: "column" }}>
                                        {SIDEBAR_ITEMS.map((b, i) => (
                                            <Draggable key={b.id} draggableId={b.id} index={i}>
                                                {(p) => (
                                                    <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps}
                                                         onClick={() => addBlock(b.type)}
                                                         style={{ ...p.draggableProps.style, cursor: "pointer", marginBottom: 8 }}>
                                                        <div style={{
                                                            background: TYPE_COLOR[b.type] + "18", color: TYPE_COLOR[b.type],
                                                            border: `1.5px solid ${TYPE_COLOR[b.type]}44`,
                                                            borderRadius: 10, padding: "7px 10px", fontSize: 13, fontWeight: 600,
                                                            display: "flex", justifyContent: "space-between", alignItems: "center",
                                                            transition: "background 0.15s",
                                                        }}
                                                             onMouseEnter={e => (e.currentTarget.style.background = TYPE_COLOR[b.type] + "30")}
                                                             onMouseLeave={e => (e.currentTarget.style.background = TYPE_COLOR[b.type] + "18")}>
                                                            <span>{b.label}</span>
                                                            <span style={{ fontSize: 10, opacity: 0.55, fontWeight: 400 }}>{b.hint}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </div>

                        <PresetsPanel username={username} currentBlocks={blocks} rootEntity={rootEntity}
                                      isDark={isDark} onLoad={loadPreset} />

                        <div style={{ flexShrink: 0, display: "flex", gap: 8 }}>
                            <button onClick={clear} style={{
                                background: isDark ? "#2c2c2e" : token.colorFillSecondary, border: "none",
                                borderRadius: 10, padding: "8px 0", cursor: "pointer", fontSize: 13, color: textSec, flex: 1, textAlign: "center",
                            }}>Очистить</button>
                            <button onClick={execute} disabled={!blocks.length} style={{
                                background: blocks.length ? token.colorPrimary : (isDark ? "#2c2c2e" : token.colorFillSecondary),
                                border: "none", borderRadius: 10, padding: "8px 0",
                                cursor: blocks.length ? "pointer" : "default",
                                fontSize: 13, fontWeight: 600,
                                color: blocks.length ? "#fff" : textSec,
                                transition: "background 0.15s", flex: 1, textAlign: "center",
                            }}>Фильтр</button>
                        </div>
                    </div>
                </div>

                {executed && (
                    <div style={{
                        flex: 1, overflowY: "auto",
                        background: isDark ? "#1c1c1e" : token.colorBgElevated,
                        borderRadius: 14, padding: 14, border: `1px solid ${border}`,
                    }}>
                        <ResultTable results={results} total={total} loading={loading}
                                     isDark={isDark} lastRequest={lastRequest} />
                    </div>
                )}
            </div>
        </DragDropContext>
    );
};

export default QueryBuilder;