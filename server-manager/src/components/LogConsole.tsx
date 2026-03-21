import React, { useRef, useEffect } from "react";
import { Button, Space, Typography } from "antd";
import { DeleteOutlined } from "@ant-design/icons";

const { Text } = Typography;

const logColor = (log: string): string => {
    const l = log.toLowerCase();
    if (l.includes("error")) return "#ff4d4f";
    if (l.includes("warn"))  return "#faad14";
    if (l.includes("info"))  return "#4096ff";
    return "#e6e6e6";
};

interface LogConsoleProps {
    logs: string[];
    onClear: () => void;
    fontSize?: number;
}

export const LogConsole: React.FC<LogConsoleProps> = ({ logs, onClear, fontSize = 12 }) => {
    const logEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    return (
        <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            background: "#141414", borderRadius: 10,
            overflow: "hidden", border: "1px solid #2a2a2a", minWidth: 0,
        }}>
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 14px", borderBottom: "1px solid #2a2a2a", flexShrink: 0,
            }}>
                <Text style={{ color: "#c8c8c8", fontSize: 12, fontFamily: "monospace", fontWeight: 500 }}>
                    spring.log
                </Text>
                <Space size={8}>
                    <Text style={{ color: "#888", fontSize: 11 }}>{logs.length} строк</Text>
                    <Button
                        size="small" icon={<DeleteOutlined />} type="text"
                        disabled={logs.length === 0} onClick={onClear}
                        style={{ color: logs.length === 0 ? "#444" : "#aaa" }}
                    />
                </Space>
            </div>

            <div style={{
                flex: 1, overflowY: "auto", overflowX: "hidden",
                padding: "10px 14px",
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
                fontSize, lineHeight: 1.6,
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
    );
};