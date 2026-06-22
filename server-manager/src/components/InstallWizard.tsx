import React, { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Button, Input } from "antd";

interface Props {
    onComplete: () => void;
}

type Phase = "idle" | "installing" | "done" | "error";

const InstallWizard: React.FC<Props> = ({ onComplete }) => {
    const [phase, setPhase] = useState<Phase>("idle");
    const [logs, setLogs] = useState<string[]>([]);
    const [password, setPassword] = useState("");
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const logEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const unlisteners: Array<() => void> = [];

        const setup = async () => {
            unlisteners.push(
                await listen<string>("install-log", (e) => {
                    setLogs((prev) => [...prev, e.payload]);
                }),
                await listen<string>("install-done", (e) => {
                    if (e.payload === "ok") {
                        setPhase("done");
                        setTimeout(onComplete, 800); // небольшая пауза для последнего лога
                    } else {
                        setErrorMsg(e.payload);
                        setPhase("error");
                    }
                })
            );
        };

        setup();
        return () => unlisteners.forEach((u) => u());
    }, [onComplete]);

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    const runInstall = async () => {
        if (!password.trim()) {
            setLogs((prev) => [...prev, "⚠️ Введите пароль администратора."]);
            return;
        }
        setPhase("installing");
        setErrorMsg(null);
        try {
            await invoke("install_all", { password });
        } catch (e) {
            setLogs((prev) => [...prev, `❌ ${e instanceof Error ? e.message : String(e)}`]);
            setPhase("error");
        }
    };

    const buttonLabel =
        phase === "installing" ? "Установка..."
            : phase === "error"    ? "Повторить"
                : phase === "done"     ? "✅ Готово"
                    : "Установить компоненты";

    return (
        <div style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.80)",
            display: "flex", alignItems: "center", justifyContent: "center",
        }}>
            <div style={{
                width: 560,
                background: "#1a1a1a",
                borderRadius: 12,
                border: "1px solid #2a2a2a",
                overflow: "hidden",
                boxShadow: "0 24px 60px rgba(0,0,0,0.7)",
            }}>
                {/* Заголовок */}
                <div style={{
                    padding: "20px 24px 16px",
                    borderBottom: "1px solid #2a2a2a",
                }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "#e8e8e8", marginBottom: 4 }}>
                        Первоначальная настройка
                    </div>
                    <div style={{ fontSize: 12, color: "#666" }}>
                        Будут установлены: Java 17, PostgreSQL 14. Создана база данных&nbsp;
                        <span style={{ color: "#4096ff" }}>students_db</span> и пользователь&nbsp;
                        <span style={{ color: "#4096ff" }}>admin</span>.
                    </div>
                </div>

                {/* Пароль */}
                <div style={{ padding: "16px 24px 12px" }}>
                    <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>
                        Пароль администратора системы (sudo / UAC)
                    </div>
                    <Input.Password
                        placeholder="Введите пароль"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onPressEnter={runInstall}
                        disabled={phase === "installing" || phase === "done"}
                        style={{ background: "#111", borderColor: "#333", color: "#e8e8e8" }}
                    />
                </div>

                {/* Лог */}
                <div style={{
                    margin: "0 24px",
                    background: "#0d0d0d",
                    borderRadius: 8,
                    border: "1px solid #222",
                    height: 230,
                    overflowY: "auto",
                    padding: "10px 12px",
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    fontSize: 11,
                    lineHeight: 1.65,
                }}>
                    {logs.length === 0 ? (
                        <span style={{ color: "#444" }}>_ ожидание запуска...</span>
                    ) : (
                        logs.map((line, i) => (
                            <div key={i} style={{
                                color: line.startsWith("❌") ? "#ff4d4f"
                                    : line.startsWith("⚠️") ? "#faad14"
                                        : line.startsWith("✅") ? "#52c41a"
                                            : "#c8c8c8",
                                marginBottom: 1,
                            }}>
                                {line}
                            </div>
                        ))
                    )}
                    <div ref={logEndRef} />
                </div>

                {/* Кнопка */}
                <div style={{ padding: "16px 24px 20px" }}>
                    {errorMsg && (
                        <div style={{
                            marginBottom: 10, padding: "8px 12px",
                            background: "rgba(255,77,79,0.1)", borderRadius: 6,
                            border: "1px solid rgba(255,77,79,0.3)",
                            fontSize: 12, color: "#ff4d4f",
                        }}>
                            {errorMsg}
                        </div>
                    )}
                    <Button
                        type="primary"
                        block
                        size="large"
                        onClick={runInstall}
                        loading={phase === "installing"}
                        disabled={phase === "installing" || phase === "done"}
                        style={{ height: 40 }}
                    >
                        {buttonLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default InstallWizard;