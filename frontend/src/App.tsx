import React, { useState, useEffect, useRef } from "react";
import { Layout, Menu, Spin, Switch, ConfigProvider, theme, Button } from "antd";
import { LogoutOutlined, SunOutlined, MoonOutlined, UserOutlined } from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import StudentsTable from "./components/StudentsTable";
import GroupsTable from "./components/GroupsTable";
import AuthPage from "./pages/AuthPage";
import { pingServer } from "./api/auth.ts";
import api from "./api/api";

const { Header, Sider, Content } = Layout;

const App: React.FC = () => {
    const [token, setToken] = useState<string | null>(() => localStorage.getItem('accessToken'));
    const [selectedKey, setSelectedKey] = useState("1");
    const [initializing, setInitializing] = useState(true);
    const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
    const isStarted = useRef(false);
    const [fullname, setFullname] = useState<string | null>(() => localStorage.getItem('fullname'));

    const customBlue = "#1d39c4";
    const headerColor = isDarkMode ? customBlue : "#1677ff";
    const selectionBg = isDarkMode ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)";

    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('fullname');
        setToken(null);
        setFullname(null);
        setInitializing(false);
    };

    useEffect(() => {
        const handleForceLogout = () => handleLogout();
        const handleTokenRefreshed = (e: any) => setToken(e.detail);

        window.addEventListener("force-logout", handleForceLogout);
        window.addEventListener("token-refreshed", handleTokenRefreshed as EventListener);

        if (!isStarted.current) {
            isStarted.current = true;
            const initAuth = async () => {
                try {
                    await pingServer();
                    const currentToken = localStorage.getItem('accessToken');
                    if (currentToken) {
                        await api.get("/auth/me");
                    }
                } catch (err) {
                    if (!localStorage.getItem('accessToken')) {
                        handleLogout();
                    }
                } finally {
                    setInitializing(false);
                }
            };
            initAuth();
        }

        return () => {
            window.removeEventListener("force-logout", handleForceLogout);
            window.removeEventListener("token-refreshed", handleTokenRefreshed as EventListener);
        };
    }, []);

    const handleLoginSuccess = (data: { accessToken: string; fullname: string }) => {
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('fullname', data.fullname);
        setToken(data.accessToken);
        setFullname(data.fullname);
    };

    const toggleTheme = (checked: boolean) => {
        setIsDarkMode(checked);
        localStorage.setItem('theme', checked ? 'dark' : 'light');
    };

    useEffect(() => {
        const handleKeys = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if (e.key === "1") setSelectedKey("1");
            if (e.key === "2") setSelectedKey("2");
        };
        window.addEventListener("keydown", handleKeys);
        return () => window.removeEventListener("keydown", handleKeys);
    }, []);

    const menuItems = [
        {
            key: "1",
            label: (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Учащиеся</span>
                    <span style={{ opacity: 0.4, fontSize: '0.8em' }}>1</span>
                </div>
            )
        },
        {
            key: "2",
            label: (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Группы</span>
                    <span style={{ opacity: 0.4, fontSize: '0.8em' }}>2</span>
                </div>
            )
        }
    ];

    if (initializing) {
        return (
            <ConfigProvider theme={{ algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm }}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: isDarkMode ? "#141414" : "#f5f5f5" }}>
                    <Spin size="large" />
                </div>
            </ConfigProvider>
        );
    }

    if (!token) {
        return (
            <ConfigProvider theme={{ algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm }}>
                <AuthPage onLoginSuccess={handleLoginSuccess} />
            </ConfigProvider>
        );
    }

    return (
        <ConfigProvider
            theme={{
                algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
                token: {
                    colorPrimary: headerColor,
                },
                components: {
                    Menu: {
                        colorItemBgSelected: selectionBg,
                        colorItemBgHover: selectionBg,
                        colorItemTextSelected: isDarkMode ? "rgba(255, 255, 255, 0.65)" : "rgba(0, 0, 0, 0.88)",
                        colorItemTextHover: isDarkMode ? "rgba(255, 255, 255, 0.65)" : "rgba(0, 0, 0, 0.88)",
                    }
                }
            }}
        >
            <style>
                {`
                    .ant-table {
                        border-bottom-left-radius: 8px !important;
                        border-bottom-right-radius: 8px !important;
                        overflow: hidden !important;
                    }
                    .ant-table-container {
                        border-bottom-left-radius: 8px !important;
                        border-bottom-right-radius: 8px !important;
                    }
                    .ant-table-body::-webkit-scrollbar {
                        width: 6px;
                        height: 6px;
                    }
                    .ant-table-body::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    .ant-table-body::-webkit-scrollbar-thumb {
                        background: rgba(128, 128, 128, 0.3);
                        border-radius: 10px;
                    }
                    .ant-table-body::-webkit-scrollbar-thumb:hover {
                        background: rgba(128, 128, 128, 0.5);
                    }
                    .theme-fade-wrapper {
                        height: 100vh;
                        width: 100vw;
                        position: fixed;
                        top: 0;
                        left: 0;
                    }
                `}
            </style>

            <AnimatePresence mode="wait" initial={false}>
                <motion.div
                    key={isDarkMode ? "dark" : "light"}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6, ease: "easeInOut" }}
                    className="theme-fade-wrapper"
                    style={{ background: isDarkMode ? "#141414" : "#f5f5f5" }}
                >
                    <Layout style={{ height: "100vh", background: "transparent" }}>
                        <Header style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "0 20px",
                            background: headerColor,
                            zIndex: 1
                        }}>
                            <span style={{ color: "white", fontSize: '18px', fontWeight: 'bold' }}>Tabularium</span>
                            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                                <Switch
                                    checked={isDarkMode}
                                    onChange={toggleTheme}
                                    checkedChildren={<MoonOutlined />}
                                    unCheckedChildren={<SunOutlined />}
                                />

                                {fullname && (
                                    <span style={{
                                        color: "white",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px"
                                    }}>
                                        <UserOutlined style={{ fontSize: '16px' }} />
                                        {fullname.split(' ').slice(0, 2).join(' ')}
                                    </span>
                                )}

                                <Button
                                    type="text"
                                    icon={<LogoutOutlined />}
                                    onClick={handleLogout}
                                    size="middle"
                                    style={{
                                        color: "white",
                                        background: "rgba(255, 255, 255, 0.15)",
                                        border: "none",
                                        transition: "all 0.2s ease"
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.25)")}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)")}
                                >
                                    Выйти
                                </Button>
                            </div>
                        </Header>
                        <Layout style={{ overflow: 'hidden', background: "transparent" }}>
                            <Sider width={200} theme={isDarkMode ? "dark" : "light"} style={{ background: "transparent" }}>
                                <Menu
                                    mode="vertical"
                                    selectedKeys={[selectedKey]}
                                    style={{ height: "100%", borderRight: 0, background: "transparent" }}
                                    onClick={(e) => setSelectedKey(e.key)}
                                    items={menuItems}
                                />
                            </Sider>
                            <Content style={{
                                position: "relative",
                                overflow: "hidden",
                                background: "transparent",
                            }}>
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={selectedKey}
                                        initial={{ opacity: 0, filter: "blur(2px)" }}
                                        animate={{ opacity: 1, filter: "blur(0px)" }}
                                        exit={{ opacity: 0, filter: "blur(2px)" }}
                                        transition={{
                                            duration: 0.2,
                                            ease: "easeOut"
                                        }}
                                        style={{
                                            height: "100%",
                                            width: "100%",
                                            padding: "20px 20px 40px 20px",
                                            display: "flex",
                                            flexDirection: "column"
                                        }}
                                    >
                                        {selectedKey === "1" && <StudentsTable />}
                                        {selectedKey === "2" && <GroupsTable />}
                                    </motion.div>
                                </AnimatePresence>
                            </Content>
                        </Layout>
                    </Layout>
                </motion.div>
            </AnimatePresence>
        </ConfigProvider>
    );
};

export default App;