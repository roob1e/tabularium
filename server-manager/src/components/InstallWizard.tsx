import React, { useState, useEffect } from "react";
import { Modal, Card, Button, Typography } from "antd";
import { core } from "@tauri-apps/api";
import { listen } from "@tauri-apps/api/event";

const { Title, Text } = Typography;

interface Props {
    onComplete: () => void;
}

const InstallWizard: React.FC<Props> = ({ onComplete }) => {
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

    useEffect(() => {
        let unlisten: any;
        const setup = async () => {
            unlisten = await listen<string>("install-log", (event) => {
                setLogs(prev => [...prev, event.payload]);
            });
        };
        setup();
        return () => {
            if (unlisten) unlisten.then((f: any) => f());
        };
    }, []);

    const runInstall = async () => {
        setLoading(true);
        try {
            await core.invoke("install_all");
            onComplete();
        } catch (e: any) {
            setLogs(prev => [...prev, `Error: ${e}`]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal open footer={null} closable={false} centered width={600}>
            <Card bordered={false}>
                <Title level={3}>Настройка системы</Title>
                <Text>Для работы необходимы Java 17 и PostgreSQL.</Text>

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