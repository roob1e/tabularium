import React from "react";
import { Button, Input, Space, Typography } from "antd";
import { CopyOutlined, GlobalOutlined, PlayCircleOutlined, StopOutlined } from "@ant-design/icons";
import {type SpringStatus, STATUS_CONFIG } from "../types";

const { Text } = Typography;

interface StatusBarProps {
    status: SpringStatus;
    serverUrl: string;
    onStart: () => void;
    onStop: () => void;
    onCopy: () => void;
    onOpen: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
                                                        status, serverUrl, onStart, onStop, onCopy, onOpen,
                                                    }) => {
    const cfg = STATUS_CONFIG[status];

    return (
        <Space direction="vertical" style={{ width: "100%" }} size={8}>
            <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 12px", borderRadius: 8,
                background: cfg.bg,
                border: `1px solid ${cfg.color}33`,
            }}>
                <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: cfg.color, flexShrink: 0,
                    boxShadow: status === "running" ? `0 0 6px ${cfg.color}` : "none",
                }} />
                <Text style={{ color: cfg.color, fontWeight: 600, fontSize: 12, flex: 1 }}>
                    {cfg.text}
                </Text>
                <Button type="primary" icon={<PlayCircleOutlined />} size="small"
                        disabled={status !== "stopped"} onClick={onStart}>
                    Старт
                </Button>
                <Button danger icon={<StopOutlined />} size="small"
                        disabled={status === "stopped"} onClick={onStop}>
                    Стоп
                </Button>
            </div>

            {status === "running" && (
                <Space.Compact style={{ width: "100%" }}>
                    <Input value={serverUrl} readOnly style={{ fontSize: 12 }} />
                    <Button icon={<CopyOutlined />} onClick={onCopy} />
                    <Button icon={<GlobalOutlined />} onClick={onOpen} />
                </Space.Compact>
            )}
        </Space>
    );
};