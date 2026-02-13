import React, { useState, useRef} from "react";
import { Layout, Menu } from "antd";
import StudentsTable from "./components/StudentsTable";
import GroupsTable from "./components/GroupsTable";
import { TableOutlined, DatabaseOutlined } from "@ant-design/icons";

const { Header, Sider, Content } = Layout;

const App: React.FC = () => {
    const [selectedKey, setSelectedKey] = useState("1");
    const contentRef = useRef<HTMLDivElement>(null);

    return (
        <Layout style={{ height: "100vh" }}>
            <Header style={{ color: "white" }}>Tabularium</Header>
            <Layout style={{ height: "100%" }}>
                <Sider width={200} style={{ height: "100%" }}>
                    <Menu
                        mode="vertical"
                        defaultSelectedKeys={["1"]}
                        onClick={(e) => setSelectedKey(e.key)}
                        items={[
                            { key: "1", icon: <TableOutlined />, label: "Учащиеся" },
                            { key: "2", icon: <DatabaseOutlined />, label: "Группы" },
                        ]}
                    />
                </Sider>
                <Content
                    ref={contentRef}
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        minHeight: 0,
                        padding: "0px 20px 40px",
                        overflow: "hidden",
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