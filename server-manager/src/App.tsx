import React, { useState, useEffect, useRef, useCallback } from "react";
import { core } from "@tauri-apps/api";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import {
    Button, Input, Typography,
    Space, message, Form, Alert, Grid
} from "antd";
import { CopyOutlined, GlobalOutlined, MenuOutlined, PlayCircleOutlined, StopOutlined, DeleteOutlined } from "@ant-design/icons";
import InstallWizard from "./components/InstallWizard";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

interface SpringConfig {
    host: string;
    user: string;
    password: string;
    jar_path: string;
}

const App: React.FC = () => {
    const [config, setConfig] = useState<SpringConfig>({ host: '', user: '', password: '', jar_path: '' });
    const [needsInstall, setNeedsInstall] = useState<boolean | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [status, setStatus] = useState<"stopped" | "starting" | "running">("stopped");
    const [jarDetected, setJarDetected] = useState<boolean>(false);
    const [ymlDetected, setYmlDetected] = useState<boolean>(false);
    const [serverUrl, setServerUrl] = useState<string>("http://localhost:8080");
    const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
    const [form] = Form.useForm();
    const logEndRef = useRef<HTMLDivElement>(null);
    const screens = useBreakpoint();
    const formRef = useRef(form);
    const isMobile = !screens.md;

    const initializeApp = useCallback(async () => {
        try {
            const isReady = await core.invoke<boolean>("check_dependencies");
            setNeedsInstall(!isReady);
            if (!isReady) return;

            const jarExists = await core.invoke<boolean>("check_jar_exists");
            setJarDetected(jarExists);

            const ymlExists = await core.invoke<boolean>("check_yml_exists");
            setYmlDetected(ymlExists);

            if (ymlExists) {
                const cfg = await core.invoke<SpringConfig>("load_config_from_yml");
                setConfig(cfg);
                formRef.current.setFieldsValue(cfg);
            }

            if (jarExists) {
                const jarPath = await core.invoke<string>("detect_server_jar");
                setConfig(prev => ({ ...prev, jar_path: jarPath }));
                formRef.current.setFieldsValue({ jar_path: jarPath });
            }
        } catch (error) {
            console.error("[App] init error:", error);
        }
    }, []);

    useEffect(() => {
        initializeApp();

        const setupListeners = async () => {
            const unlistenLog = await listen<string>("spring-log", (event) => {
                setLogs(prev => [...prev, event.payload].slice(-1000));
            });

            const unlistenStatus = await listen<string>("spring-status", (event) => {
                const s = event.payload as "stopped" | "starting" | "running";
                setStatus(s);
                if (s === "running") {
                    message.success("Spring приложение запущено");
                    setServerUrl("http://localhost:8080");
                } else if (s === "stopped") {
                    message.info("Spring приложение остановлено");
                }
            });

            return () => { unlistenLog(); unlistenStatus(); };
        };

        const cleanup = setupListeners();
        return () => { cleanup.then(fn => fn()); };
    }, []);

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    const handleInstallComplete = useCallback(() => {
        setNeedsInstall(false);
        initializeApp();
    }, [initializeApp]);

    const saveConfig = async () => {
        try {
            const values = await form.validateFields();
            await core.invoke("save_config_to_yml", { config: values });
            setConfig(values);
            setYmlDetected(true);
            message.success("Конфигурация сохранена");
        } catch (e) {
            message.error("Ошибка сохранения: " + e);
        }
    };

    const loadConfig = async () => {
        try {
            const cfg = await core.invoke<SpringConfig>("load_config_from_yml");
            setConfig(cfg);
            form.setFieldsValue(cfg);
            message.success("Конфигурация загружена");
        } catch (e) {
            message.error("Ошибка загрузки: " + e);
        }
    };

    const browseJar = async () => {
        try {
            const selected = await open({
                multiple: false,
                filters: [{ name: "JAR файл", extensions: ["jar"] }],
            });
            if (selected) {
                setConfig(prev => ({ ...prev, jar_path: selected }));
                form.setFieldsValue({ jar_path: selected });
                setJarDetected(true);
                message.success("Файл выбран");
            }
        } catch (e) {
            message.error("Не удалось открыть диалог: " + e);
        }
    };

    const startSpring = async () => {
        try {
            const values = await form.validateFields();
            if (!values.jar_path) { message.error("Укажите путь к server.jar"); return; }
            await core.invoke("start_spring", { jarPath: values.jar_path });
            setStatus("starting");
        } catch (e) {
            message.error("Не удалось запустить Spring: " + e);
        }
    };

    const stopSpring = async () => {
        try {
            await core.invoke("stop_spring");
        } catch (e) {
            message.error("Не удалось остановить Spring: " + e);
        }
    };

    const copyServerUrl = async () => {
        try {
            await navigator.clipboard.writeText(serverUrl);
            message.success("Скопировано");
        } catch (e) {
            message.error("Ошибка копирования");
        }
    };

    const statusConfig = {
        stopped:  { color: "#ff4d4f", bg: "rgba(255,77,79,0.1)",  text: "ОСТАНОВЛЕН" },
        starting: { color: "#faad14", bg: "rgba(250,173,20,0.1)", text: "ЗАПУСКАЕТСЯ" },
        running:  { color: "#52c41a", bg: "rgba(82,196,26,0.1)",  text: "РАБОТАЕТ" },
    } as const;

    const logColor = (log: string) => {
        const l = log.toLowerCase();
        if (l.includes("error")) return "#ff4d4f";
        if (l.includes("warn"))  return "#faad14";
        if (l.includes("info"))  return "#4096ff";
        return "#e6e6e6";
    };

    const sidebar = (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 12 }}>
            <Form form={form} layout="vertical" initialValues={config} style={{ flex: 1 }}>
                <Form.Item
                    label="Путь к server.jar"
                    name="jar_path"
                    rules={[{ required: true, message: "Укажите путь к server.jar" }]}
                    style={{ marginBottom: 10 }}
                >
                    <Input.Search
                        placeholder="/path/to/server.jar"
                        enterButton="Найти"
                        onSearch={browseJar}
                        readOnly
                    />
                </Form.Item>

                <Form.Item label="Хост БД" name="host" style={{ marginBottom: 10 }}>
                    <Input placeholder="localhost:5432" />
                </Form.Item>

                <Form.Item label="Пользователь БД" name="user" style={{ marginBottom: 10 }}>
                    <Input placeholder="postgres" />
                </Form.Item>

                <Form.Item label="Пароль БД" name="password" style={{ marginBottom: 10 }}>
                    <Input.Password placeholder="password" />
                </Form.Item>
            </Form>

            <Space direction="vertical" style={{ width: "100%" }} size={8}>
                <Space style={{ width: "100%" }} size={8}>
                    <Button type="primary" onClick={saveConfig} style={{ flex: 1 }}>
                        Сохранить
                    </Button>
                    <Button onClick={loadConfig} disabled={!ymlDetected} style={{ flex: 1 }}>
                        Загрузить
                    </Button>
                </Space>

                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: statusConfig[status].bg,
                    border: `1px solid ${statusConfig[status].color}22`,
                }}>
                    <div style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: statusConfig[status].color,
                        boxShadow: status === "running" ? `0 0 6px ${statusConfig[status].color}` : "none",
                    }} />
                    <Text style={{ color: statusConfig[status].color, fontWeight: 600, fontSize: 12, flex: 1 }}>
                        {statusConfig[status].text}
                    </Text>
                    <Button
                        type="primary"
                        icon={<PlayCircleOutlined />}
                        size="small"
                        disabled={status !== "stopped"}
                        onClick={startSpring}
                    >
                        Старт
                    </Button>
                    <Button
                        danger
                        icon={<StopOutlined />}
                        size="small"
                        disabled={status === "stopped"}
                        onClick={stopSpring}
                    >
                        Стоп
                    </Button>
                </div>

                {status === "running" && (
                    <Space.Compact style={{ width: "100%" }}>
                        <Input value={serverUrl} readOnly style={{ background: "#f5f5f5", fontSize: 12 }} />
                        <Button icon={<CopyOutlined />} onClick={copyServerUrl} />
                        <Button icon={<GlobalOutlined />} onClick={() => window.open(serverUrl, "_blank")} />
                    </Space.Compact>
                )}
            </Space>
        </div>
    );

    return (
        <div style={{
            width: "100vw", height: "100vh",
            display: "flex", flexDirection: "column",
            background: "#f0f2f5",
            overflow: "hidden",
        }}>
            {needsInstall === true && <InstallWizard onComplete={handleInstallComplete} />}

            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: isMobile ? "8px 12px" : "10px 20px",
                background: "#fff",
                borderBottom: "1px solid #e8e8e8",
                flexShrink: 0,
            }}>
                <Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>
                    Spring Manager
                </Title>
                {isMobile && (
                    <Button
                        icon={<MenuOutlined />}
                        type="text"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                    />
                )}
            </div>

            {!jarDetected && needsInstall === false && (
                <Alert
                    message="server.jar не найден"
                    type="warning"
                    showIcon
                    style={{ margin: isMobile ? "8px 8px 0" : "8px 12px 0", flexShrink: 0 }}
                    action={<Button size="small" onClick={browseJar}>Найти</Button>}
                />
            )}

            <div style={{ flex: 1, display: "flex", overflow: "hidden", padding: isMobile ? 8 : 12, gap: 12 }}>
                {(!isMobile || sidebarOpen) && (
                    <div style={{
                        width: isMobile ? "100%" : 300,
                        flexShrink: 0,
                        background: "#fff",
                        borderRadius: 10,
                        padding: 16,
                        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                        overflow: "auto",
                        ...(isMobile ? { position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 } : {}),
                    }}>
                        {isMobile && (
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                                <Text strong>Конфигурация</Text>
                                <Button size="small" type="text" onClick={() => setSidebarOpen(false)}>✕</Button>
                            </div>
                        )}
                        {sidebar}
                    </div>
                )}

                {(!isMobile || !sidebarOpen) && (
                    <div style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        background: "#141414",
                        borderRadius: 10,
                        overflow: "hidden",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
                        minWidth: 0,
                    }}>
                        <div style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "8px 14px",
                            borderBottom: "1px solid #2a2a2a",
                            flexShrink: 0,
                        }}>
                            <Text style={{ color: "#c8c8c8", fontSize: 12, fontFamily: "monospace", fontWeight: 500 }}>
                                spring.log
                            </Text>
                            <Space size={8}>
                                <Text style={{ color: "#888", fontSize: 11 }}>{logs.length} строк</Text>
                                <Button
                                    size="small"
                                    icon={<DeleteOutlined />}
                                    type="text"
                                    disabled={logs.length === 0}
                                    onClick={() => setLogs([])}
                                    style={{ color: logs.length === 0 ? "#444" : "#aaa" }}
                                />
                            </Space>
                        </div>

                        <div style={{
                            flex: 1, overflowY: "auto", overflowX: "hidden",
                            padding: "10px 14px",
                            fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
                            fontSize: isMobile ? 10 : 12,
                            lineHeight: 1.6,
                        }}>
                            {logs.length === 0 ? (
                                <Text style={{ color: "#444", fontFamily: "monospace" }}>
                                    _ ожидание запуска...
                                </Text>
                            ) : (
                                logs.map((log, idx) => (
                                    <div key={idx} style={{
                                        color: logColor(log),
                                        whiteSpace: "pre-wrap",
                                        wordBreak: "break-word",
                                        marginBottom: 1,
                                    }}>
                                        {log}
                                    </div>
                                ))
                            )}
                            <div ref={logEndRef} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default App;