import React, { useState, useEffect, useRef } from "react";
import { Layout, Menu, Spin, Switch, ConfigProvider, theme } from "antd";
import { TableOutlined, DatabaseOutlined, LogoutOutlined, SunOutlined, MoonOutlined } from "@ant-design/icons";
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

    // Флаг для предотвращения двойного запуска в StrictMode и петель
    const isStarted = useRef(false);

    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setToken(null);
    };

    useEffect(() => {
        if (isStarted.current) return;
        isStarted.current = true;

        const handleForceLogout = () => handleLogout();
        window.addEventListener("force-logout", handleForceLogout);

        const initAuth = async () => {
            try {
                // 1. Проверка связи
                await pingServer();

                // 2. Проверка токена
                const currentToken = localStorage.getItem('accessToken');
                if (currentToken) {
                    // Если токен битый, интерцептор в api.ts сам сделает рефреш
                    // или кинет force-logout
                    await api.get("/auth/me");
                }
            } catch (err) {
                console.error("Initialization failed:", err);
                // Если мы упали здесь, значит сервер недоступен или рефреш сдох
                if (localStorage.getItem('accessToken')) handleLogout();
            } finally {
                setInitializing(false);
            }
        };

        initAuth();
        return () => window.removeEventListener("force-logout", handleForceLogout);
    }, []);

    const handleLoginSuccess = (newToken: string) => {
        setToken(newToken);
    };

    const toggleTheme = (checked: boolean) => {
        setIsDarkMode(checked);
        localStorage.setItem('theme', checked ? 'dark' : 'light');
    };

    if (initializing) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                background: isDarkMode ? "#141414" : "#fff"
            }}>
                <Spin size="large" tip="Загрузка..." />
            </div>
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
        <ConfigProvider theme={{ algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm }}>
            <Layout style={{ height: "100vh" }}>
                <Header style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0 20px"
                }}>
                    <span style={{ color: "white", fontSize: '18px', fontWeight: 'bold' }}>Tabularium</span>

                    <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                        <Switch
                            checked={isDarkMode}
                            onChange={toggleTheme}
                            checkedChildren={<MoonOutlined />}
                            unCheckedChildren={<SunOutlined />}
                        />
                        <LogoutOutlined
                            onClick={handleLogout}
                            style={{ cursor: 'pointer', fontSize: '18px', color: '#ff4d4f' }}
                        />
                    </div>
                </Header>

                <Layout style={{ overflow: 'hidden' }}>
                    <Sider width={200}>
                        <Menu
                            mode="vertical"
                            selectedKeys={[selectedKey]}
                            style={{ height: "100%" }}
                            onClick={(e) => setSelectedKey(e.key)}
                            items={[
                                { key: "1", icon: <TableOutlined />, label: "Учащиеся" },
                                { key: "2", icon: <DatabaseOutlined />, label: "Группы" },
                            ]}
                        />
                    </Sider>

                    <Content style={{
                        padding: "20px",
                        overflow: "auto",
                        background: isDarkMode ? "#141414" : "#f0f2f5",
                        display: "flex",
                        flexDirection: "column"
                    }}>
                        {selectedKey === "1" && <StudentsTable />}
                        {selectedKey === "2" && <GroupsTable />}
                    </Content>
                </Layout>
            </Layout>
        </ConfigProvider>
    );
};

export default App;