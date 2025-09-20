import React, { useState, useEffect, useRef } from "react";
import { Layout, Menu } from "antd";
import StudentsTable from "./components/StudentsTable";
import GroupsTable from "./components/GroupsTable";
import { TableOutlined, DatabaseOutlined } from "@ant-design/icons";

const { Header, Sider, Content } = Layout;

const App: React.FC = () => {
    const [selectedKey, setSelectedKey] = useState("1");
    const contentRef = useRef<HTMLDivElement>(null);
    const [tableHeight, setTableHeight] = useState<number>(0);

    // Вычисляем высоту таблицы после рендера
    useEffect(() => {
        const updateHeight = () => {
            if (contentRef.current) {
                const padding = 20 * 2; // сверху и снизу
                setTableHeight(contentRef.current.clientHeight - padding);
            }
        };
        updateHeight();
        window.addEventListener("resize", updateHeight);
        return () => window.removeEventListener("resize", updateHeight);
    }, []);

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
                    style={{ padding: 20, height: "100%", overflow: "hidden" }}
                >
                    {selectedKey === "1" && <StudentsTable tableHeight={tableHeight} />}
                    {selectedKey === "2" && <GroupsTable tableHeight={tableHeight} />}
                </Content>
            </Layout>
        </Layout>
    );
};

export default App;
