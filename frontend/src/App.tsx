import React, { useState, useEffect, useRef } from "react";
import { Layout, Menu, Spin, Switch, ConfigProvider, theme } from "antd";
import { TableOutlined, DatabaseOutlined, LogoutOutlined, SunOutlined, MoonOutlined, UserOutlined } from "@ant-design/icons";
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

    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setToken(null);
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
        localStorage.setItem('theme', checked ? "#001529" : "#1677ff");
    };

    if (initializing) {
        return (
            <ConfigProvider theme={{ algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm }}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: isDarkMode ? "#141414" : "#fff" }}>
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
        <ConfigProvider theme={{ algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm }}>
            <Layout style={{ height: "100vh" }}>
                <Header style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0 20px",
                    background: isDarkMode ? "#001529" : "#1677ff"
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

                        <LogoutOutlined
                            onClick={handleLogout}
                            style={{ cursor: 'pointer', fontSize: '18px', color: '#ff4d4f' }}
                        />
                    </div>
                </Header>
                <Layout style={{ overflow: 'hidden' }}>
                    <Sider width={200}>
                        <Menu mode="vertical" selectedKeys={[selectedKey]} style={{ height: "100%" }} onClick={(e) => setSelectedKey(e.key)}
                              items={[{ key: "1", icon: <TableOutlined />, label: "Учащиеся" }, { key: "2", icon: <DatabaseOutlined />, label: "Группы" }]} />
                    </Sider>
                    <Content style={{ padding: "20px", overflow: "auto", background: isDarkMode ? "#141414" : "#f0f2f5", display: "flex", flexDirection: "column" }}>
                        {selectedKey === "1" && <StudentsTable />}
                        {selectedKey === "2" && <GroupsTable />}
                    </Content>
                </Layout>
            </Layout>
        </ConfigProvider>
    );
};

export default App;