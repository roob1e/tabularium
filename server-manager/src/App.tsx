import React, { useState, useEffect, useRef, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import { ConfigProvider, theme, Typography, Button, Alert, Form, message, Grid } from "antd";
import { MenuOutlined } from "@ant-design/icons";
import type {SpringConfig, SpringStatus} from "./types";
import { useAppInit } from "./hooks/useAppInit";
import { useConfig } from "./hooks/useConfig";
import { useSpring } from "./hooks/useSpring";
import { Sidebar } from "./components/Sidebar";
import { LogConsole } from "./components/LogConsole";
import InstallWizard from "./components/InstallWizard";

const { Title } = Typography;
const { useBreakpoint } = Grid;

const App: React.FC = () => {
    const [config, setConfig] = useState<SpringConfig>({ host: "", user: "", password: "", jar_path: "" });
    const [needsInstall, setNeedsInstall] = useState<boolean | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [status, setStatus] = useState<SpringStatus>("stopped");
    const [jarDetected, setJarDetected] = useState(false);
    const [ymlDetected, setYmlDetected] = useState(false);
    const [serverUrl, setServerUrl] = useState("http://localhost:8080");
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [form] = Form.useForm();
    const formRef = useRef(form);
    const screens = useBreakpoint();
    const isMobile = !screens.md;

    const initializeApp = useAppInit({ setNeedsInstall, setJarDetected, setYmlDetected, setConfig, formRef });
    const { saveConfig, loadConfig } = useConfig(form, setConfig, setYmlDetected);
    const { startSpring, stopSpring } = useSpring(form, setStatus);

    useEffect(() => {
        initializeApp();

        const setup = async () => {
            const unlistenLog = await listen<string>("spring-log", (e) => {
                setLogs(prev => [...prev, e.payload].slice(-1000));
            });
            const unlistenStatus = await listen<string>("spring-status", (e) => {
                const s = e.payload as SpringStatus;
                setStatus(s);
                if (s === "running") { message.success("Spring запущен"); setServerUrl("http://localhost:8080"); }
                if (s === "stopped") message.info("Spring остановлен");
            });
            return () => { unlistenLog(); unlistenStatus(); };
        };

        const cleanup = setup();
        return () => { cleanup.then(fn => fn()); };
    }, []);

    const handleInstallComplete = useCallback(() => {
        setNeedsInstall(false);
        initializeApp();
    }, [initializeApp]);

    const handleJarSelected = (path: string) => {
        setConfig(prev => ({ ...prev, jar_path: path }));
        form.setFieldsValue({ jar_path: path });
        setJarDetected(true);
    };

    const copyServerUrl = async () => {
        try { await navigator.clipboard.writeText(serverUrl); message.success("Скопировано"); }
        catch { message.error("Ошибка копирования"); }
    };

    return (
        <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
            <div style={{
                width: "100vw", height: "100vh", display: "flex", flexDirection: "column",
                background: "#0f0f0f", overflow: "hidden",
            }}>
                {needsInstall === true && <InstallWizard onComplete={handleInstallComplete} />}

                <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: isMobile ? "8px 12px" : "10px 20px",
                    background: "#141414", borderBottom: "1px solid #2a2a2a", flexShrink: 0,
                }}>
                    <Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>Spring Manager</Title>
                    {isMobile && (
                        <Button icon={<MenuOutlined />} type="text" onClick={() => setSidebarOpen(!sidebarOpen)} />
                    )}
                </div>

                {!jarDetected && needsInstall === false && (
                    <Alert
                        message="server.jar не найден" type="warning" showIcon
                        style={{ margin: isMobile ? "8px 8px 0" : "8px 12px 0", flexShrink: 0 }}
                        action={<Button size="small" onClick={() => setSidebarOpen(true)}>Найти</Button>}
                    />
                )}

                <div style={{ flex: 1, display: "flex", overflow: "hidden", padding: isMobile ? 8 : 12, gap: 12 }}>
                    {(!isMobile || sidebarOpen) && (
                        <div style={{
                            width: isMobile ? "100%" : 300, flexShrink: 0,
                            background: "#1a1a1a", borderRadius: 10, padding: 16,
                            border: "1px solid #2a2a2a", overflow: "auto",
                            ...(isMobile ? { position: "absolute" as const, inset: 0, zIndex: 100 } : {}),
                        }}>
                            <Sidebar
                                form={form}
                                status={status}
                                ymlDetected={ymlDetected}
                                serverUrl={serverUrl}
                                isMobile={isMobile}
                                onClose={() => setSidebarOpen(false)}
                                onSave={saveConfig}
                                onLoad={loadConfig}
                                onStart={startSpring}
                                onStop={stopSpring}
                                onCopy={copyServerUrl}
                                onOpen={() => window.open(serverUrl, "_blank")}
                                onJarSelected={handleJarSelected}
                            />
                        </div>
                    )}

                    {(!isMobile || !sidebarOpen) && (
                        <LogConsole
                            logs={logs}
                            onClear={() => setLogs([])}
                            fontSize={isMobile ? 10 : 12}
                        />
                    )}
                </div>
            </div>
        </ConfigProvider>
    );
};

export default App;