import React from "react";
import { Button, Form, Input, Space, Typography } from "antd";
import { open } from "@tauri-apps/plugin-dialog";
import { message } from "antd";
import type {SpringStatus} from "../types";
import { StatusBar } from "./StatusBar";

const { Text } = Typography;

interface SidebarProps {
    form: any;
    status: SpringStatus;
    ymlDetected: boolean;
    serverUrl: string;
    isMobile: boolean;
    onClose?: () => void;
    onSave: () => void;
    onLoad: () => void;
    onStart: () => void;
    onStop: () => void;
    onCopy: () => void;
    onOpen: () => void;
    onJarSelected: (path: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
                                                    form, status, ymlDetected, serverUrl, isMobile, onClose,
                                                    onSave, onLoad, onStart, onStop, onCopy, onOpen, onJarSelected,
                                                }) => {
    const browseJar = async () => {
        try {
            const selected = await open({
                multiple: false,
                filters: [{ name: "JAR файл", extensions: ["jar"] }],
            });
            if (selected) {
                onJarSelected(selected);
                message.success("Файл выбран");
            }
        } catch (e) {
            message.error("Не удалось открыть диалог: " + e);
        }
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 12 }}>
            {isMobile && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <Text strong>Конфигурация</Text>
                    <Button size="small" type="text" onClick={onClose}>✕</Button>
                </div>
            )}

            <Form form={form} layout="vertical" style={{ flex: 1 }}>
                <Form.Item
                    label="Путь к server.jar" name="jar_path"
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
                    <Button type="primary" onClick={onSave} style={{ flex: 1 }}>Сохранить</Button>
                    <Button onClick={onLoad} disabled={!ymlDetected} style={{ flex: 1 }}>Загрузить</Button>
                </Space>

                <StatusBar
                    status={status}
                    serverUrl={serverUrl}
                    onStart={onStart}
                    onStop={onStop}
                    onCopy={onCopy}
                    onOpen={onOpen}
                />
            </Space>
        </div>
    );
};