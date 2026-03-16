import React, { useState, useEffect } from "react";
import { Modal, Card, Button, Typography, Input } from "antd";
import { core } from "@tauri-apps/api";
import { listen } from "@tauri-apps/api/event";

const { Title, Text } = Typography;

interface Props {
    onComplete: () => void;
}

const InstallWizard: React.FC<Props> = ({ onComplete }) => {
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [password, setPassword] = useState("");

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
                    setLogs(prev => [...prev, `Error: ${event.payload}`]);
                }
            });
        };

        setup();

        return () => {
            if (unlistenLog) unlistenLog();
            if (unlistenDone) unlistenDone();
        };
    }, []);

    const runInstall = async () => {
        if (!password) {
            setLogs(prev => [...prev, "Введите пароль администратора"]);
            return;
        }
        setLoading(true);
        core.invoke("install_all", { password }).catch((e: unknown) => {
            setLogs(prev => [...prev, `Error: ${e instanceof Error ? e.message : String(e)}`]);
            setLoading(false);
        });
    };

    return (
        <Modal open footer={null} closable={false} centered width={600}>
            <Card bordered={false}>
                <Title level={3}>Настройка системы</Title>
                <Text>Для работы необходимы Java 17 и PostgreSQL.</Text>

                <Input.Password
                    placeholder="Пароль администратора"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={{ marginTop: "16px" }}
                />

                <div style={{
                    background: "#1e1e1e",
                    color: "#00ff00",
                    padding: "12px",
                    borderRadius: "8px",
                    marginTop: "16px",
                    height: "200px",
                    overflowY: "auto",
                    fontFamily: "monospace",
                    fontSize: "11px"
                }}>
                    {logs.length === 0 ? (
                        <div>{">"} Ожидание запуска...</div>
                    ) : (
                        logs.map((l, i) => <div key={i}>{`> ${l}`}</div>)
                    )}
                </div>

                <Button
                    type="primary"
                    block
                    size="large"
                    onClick={runInstall}
                    loading={loading}
                    style={{ marginTop: "16px" }}
                >
                    Установить компоненты
                </Button>
            </Card>
        </Modal>
    );
};

export default InstallWizard;