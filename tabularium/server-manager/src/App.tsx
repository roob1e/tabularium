import React, { useState, useEffect, useRef, useCallback } from "react";
import { core } from "@tauri-apps/api";
import { listen } from "@tauri-apps/api/event";
import {
    Button,
    Input,
    Card,
    Row,
    Col,
    Typography,
    Space,
    message,
    Tag,
    Form,
    Alert,
    Grid
} from "antd";
import { CopyOutlined, GlobalOutlined, MenuOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

interface SpringConfig {
    host: string;
    user: string;
    password: string;
    jar_path: string;
}

const App: React.FC = () => {
    const [config, setConfig] = useState<SpringConfig>({
        host: '',
        user: '',
        password: '',
        jar_path: '',
    });
    const [logs, setLogs] = useState<string[]>([]);
    const [status, setStatus] = useState<"stopped" | "starting" | "running">("stopped");
    const [jarDetected, setJarDetected] = useState<boolean>(false);
    const [ymlDetected, setYmlDetected] = useState<boolean>(false);
    const [serverUrl, setServerUrl] = useState<string>("http://localhost:8080");
    const [mobileMenuVisible, setMobileMenuVisible] = useState<boolean>(false);
    const [form] = Form.useForm();
    const logEndRef = useRef<HTMLDivElement>(null);
    const screens = useBreakpoint();

    useEffect(() => {
        const initializeApp = async () => {
            try {
                const jarExists = await core.invoke<boolean>("check_jar_exists");
                setJarDetected(jarExists);

                const ymlExists = await core.invoke<boolean>("check_yml_exists");
                setYmlDetected(ymlExists);

                if (ymlExists) {
                    const cfg = await core.invoke<SpringConfig>("load_config_from_yml");
                    setConfig(cfg);
                    form.setFieldsValue(cfg);
                }

                if (jarExists) {
                    const jarPath = await core.invoke<string>("detect_server_jar");
                    setConfig(prev => ({ ...prev, jar_path: jarPath }));
                    form.setFieldsValue({ jar_path: jarPath });
                }

            } catch (error) {
                console.error("Ошибка инициализации:", error);
            }
        };

        initializeApp();

        const setupListeners = async () => {
            const unlistenLog = await listen<string>("spring-log", (event) => {
                setLogs(prev => {
                    const newLogs = [...prev, event.payload];
                    return newLogs.slice(-1000);
                });
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

            return () => {
                unlistenLog();
                unlistenStatus();
            };
        };

        const cleanupPromise = setupListeners();

        return () => {
            cleanupPromise.then(cleanup => cleanup());
        };
    }, [form]);

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    const saveConfig = async () => {
        try {
            const values = await form.validateFields();
            await core.invoke("save_config_to_yml", values);
            setConfig(values);
            message.success("Конфигурация сохранена в application.yml");
        } catch (e) {
            message.error("Не удалось сохранить конфигурацию: " + e);
        }
    };

    const loadConfig = async () => {
        try {
            const cfg = await core.invoke<SpringConfig>("load_config_from_yml");
            setConfig(cfg);
            form.setFieldsValue(cfg);
            message.success("Конфигурация загружена из application.yml");
        } catch (e) {
            message.error("Не удалось загрузить конфигурацию: " + e);
        }
    };

    const detectServerJar = async () => {
        try {
            const jarPath = await core.invoke<string>("detect_server_jar");
            setConfig(prev => ({ ...prev, jar_path: jarPath }));
            form.setFieldsValue({ jar_path: jarPath });
            setJarDetected(true);
            message.success("server.jar обнаружен");
        } catch (e) {
            message.error("Не удалось найти server.jar: " + e);
        }
    };

    const startSpring = async () => {
        try {
            const values = await form.validateFields();
            if (!values.jar_path) {
                message.error("Укажите путь к server.jar");
                return;
            }
            await core.invoke("start_spring", { jarPath: values.jar_path });
            setStatus("starting");
        } catch (e) {
            message.error("Не удалось запустить Spring: " + e);
        }
    };

    const stopSpring = async () => {
        try {
            await core.invoke("stop_spring");
            setStatus("stopped");
        } catch (e) {
            message.error("Не удалось остановить Spring: " + e);
        }
    };

    const copyServerUrl = async () => {
        try {
            await navigator.clipboard.writeText(serverUrl);
            message.success('Ссылка скопирована в буфер обмена');
        } catch (e) {
            message.error('Не удалось скопировать ссылку');
        }
    };

    const openServerUrl = () => {
        window.open(serverUrl, '_blank');
    };

    const clearLogs = useCallback(() => {
        setLogs([]);
    }, []);

    const toggleMobileMenu = () => {
        setMobileMenuVisible(!mobileMenuVisible);
    };

    const statusColor = {
        stopped: "red",
        starting: "orange",
        running: "green",
    } as const;

    const statusText = {
        stopped: "ОСТАНОВЛЕН",
        starting: "ЗАПУСКАЕТСЯ",
        running: "РАБОТАЕТ",
    } as const;

    // Адаптивные настройки
    const isMobile = !screens.md;
    const cardPadding = isMobile ? 12 : 16;
    const formLayout = "vertical";
    const buttonSize = isMobile ? "middle" : "large";

    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            padding: isMobile ? 8 : 16,
            background: "#f5f5f5",
            boxSizing: 'border-box',
            overflow: 'hidden'
        }}>
            {/* Хедер для мобильных устройств */}
            {isMobile && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                    height: '32px'
                }}>
                    <Title level={4} style={{ margin: 0, fontSize: '16px' }}>Spring Manager</Title>
                    <Button
                        icon={<MenuOutlined />}
                        onClick={toggleMobileMenu}
                        type="text"
                        size="small"
                    />
                </div>
            )}

            {!isMobile && (
                <Title level={2} style={{
                    textAlign: "center",
                    marginBottom: 16,
                    fontSize: '24px',
                    lineHeight: '32px'
                }}>
                    Менеджер Spring приложения
                </Title>
            )}

            {!jarDetected && (
                <Alert
                    message="server.jar не найден"
                    type="warning"
                    showIcon
                    style={{ marginBottom: 8 }}
                    action={
                        <Button size="small" onClick={detectServerJar}>
                            Проверить
                        </Button>
                    }
                />
            )}

            <Row
                gutter={[isMobile ? 8 : 16, isMobile ? 8 : 16]}
                style={{
                    height: isMobile ? 'calc(100vh - 60px)' : 'calc(100vh - 80px)',
                    margin: 0
                }}
            >
                {/* Панель конфигурации */}
                <Col
                    xs={24}
                    md={8}
                    style={{
                        display: isMobile && !mobileMenuVisible ? 'none' : 'block',
                        height: '100%'
                    }}
                >
                    <Card
                        title={isMobile ? "Конфигурация" : "Конфигурация Spring"}
                        bordered={false}
                        style={{
                            borderRadius: 8,
                            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                        bodyStyle={{
                            padding: cardPadding,
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden'
                        }}
                    >
                        <Form
                            form={form}
                            layout={formLayout}
                            initialValues={config}
                            style={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden'
                            }}
                        >
                            <Space
                                direction="vertical"
                                style={{
                                    width: "100%",
                                    flex: 1,
                                    display: 'flex'
                                }}
                                size="small"
                            >
                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <Space direction="vertical" style={{ width: "100%" }} size="small">
                                        <Form.Item
                                            label="Путь к server.jar"
                                            name="jar_path"
                                            rules={[{ required: true, message: 'Укажите путь к server.jar' }]}
                                            style={{ marginBottom: 8 }}
                                        >
                                            <Input
                                                placeholder="server.jar"
                                                addonAfter={
                                                    <Button
                                                        type="link"
                                                        onClick={detectServerJar}
                                                        size="small"
                                                        style={{ padding: '0 8px' }}
                                                    >
                                                        Найти
                                                    </Button>
                                                }
                                                size={isMobile ? "small" : "middle"}
                                            />
                                        </Form.Item>

                                        <Form.Item label="Хост БД" name="host" style={{ marginBottom: 8 }}>
                                            <Input
                                                placeholder="localhost:5432"
                                                size={isMobile ? "small" : "middle"}
                                            />
                                        </Form.Item>

                                        <Form.Item label="Пользователь БД" name="user" style={{ marginBottom: 8 }}>
                                            <Input
                                                placeholder="postgres"
                                                size={isMobile ? "small" : "middle"}
                                            />
                                        </Form.Item>

                                        <Form.Item label="Пароль БД" name="password" style={{ marginBottom: 8 }}>
                                            <Input.Password
                                                placeholder="password"
                                                size={isMobile ? "small" : "middle"}
                                            />
                                        </Form.Item>
                                    </Space>
                                </div>

                                {/* Кнопки управления */}
                                <div>
                                    <Space
                                        direction={isMobile ? "vertical" : "horizontal"}
                                        style={{ width: "100%" }}
                                        size="small"
                                    >
                                        <Button
                                            type="primary"
                                            onClick={saveConfig}
                                            block={isMobile}
                                            size={buttonSize}
                                        >
                                            Сохранить в YML
                                        </Button>
                                        <Button
                                            onClick={loadConfig}
                                            disabled={!ymlDetected}
                                            block={isMobile}
                                            size={buttonSize}
                                        >
                                            Загрузить из YML
                                        </Button>
                                    </Space>

                                    <Space
                                        direction={isMobile ? "vertical" : "horizontal"}
                                        style={{ width: "100%", marginTop: 12 }}
                                        size="small"
                                    >
                                        <Button
                                            type="primary"
                                            onClick={startSpring}
                                            disabled={status !== "stopped" || !jarDetected}
                                            size={buttonSize}
                                            block={isMobile}
                                        >
                                            Запустить Spring
                                        </Button>
                                        <Button
                                            danger
                                            onClick={stopSpring}
                                            disabled={status === "stopped"}
                                            size={buttonSize}
                                            block={isMobile}
                                        >
                                            Остановить
                                        </Button>
                                        <Tag
                                            color={statusColor[status]}
                                            style={{
                                                fontWeight: "bold",
                                                fontSize: isMobile ? '11px' : '12px',
                                                margin: isMobile ? '4px auto' : '0',
                                                display: 'block',
                                                textAlign: 'center',
                                                padding: '2px 8px'
                                            }}
                                        >
                                            {statusText[status]}
                                        </Tag>
                                    </Space>

                                    {/* Ссылка на сервер */}
                                    {status === "running" && (
                                        <Card
                                            size="small"
                                            title={
                                                <Space size="small">
                                                    <GlobalOutlined />
                                                    <Text strong style={{ fontSize: isMobile ? '12px' : '14px' }}>Сервер запущен</Text>
                                                </Space>
                                            }
                                            style={{ marginTop: 12 }}
                                            bodyStyle={{ padding: '8px' }}
                                        >
                                            <Space.Compact style={{ width: '100%' }} block={isMobile}>
                                                <Input
                                                    value={serverUrl}
                                                    readOnly
                                                    style={{ background: '#f0f0f0' }}
                                                    size={isMobile ? "small" : "middle"}
                                                />
                                                <Button
                                                    icon={<CopyOutlined />}
                                                    onClick={copyServerUrl}
                                                    type="primary"
                                                    size={isMobile ? "small" : "middle"}
                                                >
                                                    {isMobile ? '' : 'Копировать'}
                                                </Button>
                                                <Button
                                                    icon={<GlobalOutlined />}
                                                    onClick={openServerUrl}
                                                    size={isMobile ? "small" : "middle"}
                                                >
                                                    {isMobile ? '' : 'Открыть'}
                                                </Button>
                                            </Space.Compact>
                                        </Card>
                                    )}
                                </div>
                            </Space>
                        </Form>
                    </Card>
                </Col>

                {/* Панель логов - ЕДИНСТВЕННЫЙ скролл */}
                <Col xs={24} md={16} style={{ height: '100%' }}>
                    <Card
                        title={
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'nowrap',
                                gap: 8
                            }}>
                                <span style={{
                                    fontSize: isMobile ? '14px' : '16px',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    color: "#fff"
                                }}>
                                    {isMobile ? 'Логи' : 'Логи Spring приложения'}
                                </span>
                                <Space size="small" style={{ flexShrink: 0 }}>
                                    <Text type="secondary" style={{ fontSize: isMobile ? '10px' : '12px', color: "white" }}>
                                        {logs.length} сообщ.
                                    </Text>
                                    <Button
                                        size="small"
                                        onClick={clearLogs}
                                        disabled={logs.length === 0}
                                        style={{ color: "#fff" }}
                                    >
                                        Очистить
                                    </Button>
                                    {isMobile && (
                                        <Button
                                            size="small"
                                            onClick={toggleMobileMenu}
                                            type={mobileMenuVisible ? "primary" : "default"}
                                        >
                                            Конфиг
                                        </Button>
                                    )}
                                </Space>
                            </div>
                        }
                        bordered={false}
                        style={{
                            borderRadius: 8,
                            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            background: "#1e1e1e",
                            color: "#fff",
                            fontFamily: "monospace",
                        }}
                        bodyStyle={{
                            padding: isMobile ? 4 : 8,
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden'
                        }}
                    >
                        <div style={{
                            flex: 1,
                            overflowY: 'auto',
                            overflowX: 'hidden'
                        }}>
                            {logs.length === 0 ? (
                                <Text style={{ color: "#888" }}>
                                    Логи появятся здесь после запуска приложения...
                                </Text>
                            ) : (
                                logs.map((log, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            marginBottom: 2,
                                            whiteSpace: "pre-wrap",
                                            color: log.toLowerCase().includes("error") ? "#ff4d4f" :
                                                log.toLowerCase().includes("warn") ? "#faad14" :
                                                    log.toLowerCase().includes("info") ? "#1890ff" : "#fff",
                                            fontSize: isMobile ? "10px" : "12px",
                                            lineHeight: "1.3",
                                            wordBreak: "break-word"
                                        }}
                                    >
                                        {log}
                                    </div>
                                ))
                            )}
                            <div ref={logEndRef} />
                        </div>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default App;