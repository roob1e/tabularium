import React, { useState } from "react";
import { Layout, Menu } from "antd";
import StudentsTable from "./components/StudentsTable";
import GroupsTable from "./components/GroupsTable";
import AuthPage from "./pages/AuthPage";
import { TableOutlined, DatabaseOutlined, LogoutOutlined } from "@ant-design/icons";

const { Header, Sider, Content } = Layout;

const App: React.FC = () => {
    const [token, setToken] = useState<string | null>(localStorage.getItem('accessToken'));
    const [selectedKey, setSelectedKey] = useState("1");

    const handleLoginSuccess = (newToken: string) => {
        localStorage.setItem('accessToken', newToken);
        setToken(newToken);
    };

    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        setToken(null);
    };

    if (!token) {
        return <AuthPage onLoginSuccess={handleLoginSuccess} />;
    }

    return (
        <Layout style={{ height: "100vh" }}>
            <Header style={{ color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>Tabularium</span>
                <LogoutOutlined
                    onClick={handleLogout}
                    style={{ cursor: 'pointer', fontSize: '18px', color: '#ff4d4f' }}
                    title="Выйти"
                />
            </Header>
            <Layout style={{ height: "100%" }}>
                <Sider width={200} style={{ height: "100%" }}>
                    <Menu
                        mode="vertical"
                        selectedKeys={[selectedKey]}
                        onClick={(e) => setSelectedKey(e.key)}
                        items={[
                            { key: "1", icon: <TableOutlined />, label: "Учащиеся" },
                            { key: "2", icon: <DatabaseOutlined />, label: "Группы" },
                        ]}
                    />
                </Sider>
                <Content
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        minHeight: 0,
                        padding: "20px",
                        overflow: "auto",
                    }}
                >
                    {selectedKey === "1" && <StudentsTable />}
                    {selectedKey === "2" && <GroupsTable />}
                </Content>
            </Layout>
        </Layout>
    );
};

export default App;