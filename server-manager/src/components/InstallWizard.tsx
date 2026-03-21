import React, { useState, useEffect, useRef } from "react";
import { core } from "@tauri-apps/api";
import { listen } from "@tauri-apps/api/event";
import { Button, Input } from "antd";

interface Props {
    onComplete: () => void;
}

const InstallWizard: React.FC<Props> = ({ onComplete }) => {
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const logEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let unlistenLog: (() => void) | null = null;
        let unlistenDone: (() => void) | null = null;

        const setup = async () => {
            unlistenLog = await listen<string>("install-log", (event) => {
                setLogs(prev => [...prev, event.payload]);
            });

            unlistenDone = await listen<string>("install-done", (event) => {
                setLoading(false);
                if (event.payload === "ok") {
                    onComplete();
                } else {
                    setError(event.payload);
                    setLogs(prev => [...prev, `❌ ${event.payload}`]);
                }
            });
        };

        setup();

        return () => {
            if (unlistenLog) unlistenLog();
            if (unlistenDone) unlistenDone();
        };
    }, []);

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    const runInstall = () => {
        if (!password) {
            setLogs(prev => [...prev, "⚠️ Введите пароль администратора"]);
            return;
        }
        setLoading(true);
        setError(null);
        core.invoke("install_all", { password }).catch((e: unknown) => {
            setLogs(prev => [...prev, `❌ ${e instanceof Error ? e.message : String(e)}`]);
            setLoading(false);
        });
    };

    return (
        <div style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.75)",
            display: "flex", alignItems: "center", justifyContent: "center",
        }}>
            <div style={{
                width: 560,
                background: "#1a1a1a",
                borderRadius: 12,
                border: "1px solid #2a2a2a",
                overflow: "hidden",
                boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
            }}>
                <div style={{
                    padding: "20px 24px 16px",
                    borderBottom: "1px solid #2a2a2a",
                }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "#e8e8e8", marginBottom: 4 }}>
                        Настройка системы
                    </div>
                    <div style={{ fontSize: 12, color: "#666" }}>
                        Требуется установка Java 17 и PostgreSQL
                    </div>
                </div>

                <div style={{ padding: "16px 24px" }}>
                    <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>
                        Пароль администратора системы
                    </div>
                    <Input.Password
                        placeholder="Введите пароль"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        onPressEnter={runInstall}
                        disabled={loading}
                        style={{
                            background: "#111",
                            borderColor: "#333",
                            color: "#e8e8e8",
                        }}
                    />
                </div>

                <div style={{
                    margin: "0 24px",
                    background: "#0d0d0d",
                    borderRadius: 8,
                    border: "1px solid #222",
                    height: 220,
                    overflowY: "auto",
                    padding: "10px 12px",
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    fontSize: 11,
                    lineHeight: 1.6,
                }}>
                    {logs.length === 0 ? (
                        <span style={{ color: "#444" }}>_ ожидание запуска...</span>
                    ) : (
                        logs.map((l, i) => (
                            <div key={i} style={{
                                color: l.startsWith("❌") ? "#ff4d4f"
                                    : l.startsWith("⚠️") ? "#faad14"
                                        : l.startsWith("✅") ? "#52c41a"
                                            : "#c8c8c8",
                                marginBottom: 1,
                            }}>
                                {l}
                            </div>
                        ))
                    )}
                    <div ref={logEndRef} />
                </div>

                <div style={{ padding: "16px 24px 20px" }}>
                    <Button
                        type="primary"
                        block
                        size="large"
                        onClick={runInstall}
                        loading={loading}
                        disabled={loading}
                        style={{ height: 40 }}
                    >
                        {loading ? "Установка..." : error ? "Повторить" : "Установить компоненты"}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default InstallWizard;