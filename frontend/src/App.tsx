import React, { useEffect, useRef, useState } from "react";
import { Layout, Menu, Spin, Switch, ConfigProvider, theme, Button, Input } from "antd";
import { LogoutOutlined, SunOutlined, MoonOutlined, UserOutlined, SearchOutlined } from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import StudentsTable from "./components/StudentsTable";
import GroupsTable from "./components/GroupsTable";
import SubjectsTable from "./components/SubjectsTable";
import TeachersTable from "./components/TeachersTable";
import GradesTable from "./components/GradesTable";
import AuthPage from "./pages/AuthPage";
import { pingServer } from "./api/auth.ts";
import { useThemeTransition } from "./hooks/useThemeTransition";
import "./styles/themeTransition.css";

const { Header, Sider, Content } = Layout;

const App: React.FC = () => {
    const { isDarkMode, toggleTheme } = useThemeTransition();
    const [token, setToken] = useState<string | null>(() => localStorage.getItem('accessToken'));
    const [selectedKey, setSelectedKey] = useState("1");
    const [initializing, setInitializing] = useState(true);
    const [fullname, setFullname] = useState<string | null>(() => localStorage.getItem('fullname'));
    const [searchQuery, setSearchQuery] = useState("");
    const isStarted = useRef(false);

    const [highlightId, setHighlightId] = useState<number | null>(null);
    const [highlightTable, setHighlightTable] = useState<string | null>(null);

    const darkBlue = "#1d39c4";
    const headerColor = isDarkMode ? darkBlue : "#1677ff";
    const selectionBg = isDarkMode ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)";

    // Стили поиска зависят от темы
    const searchBg = isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.92)";
    const searchBorder = isDarkMode ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)";
    const searchBorderFocus = isDarkMode ? "rgba(255,255,255,0.6)" : "#fff";
    const searchText = isDarkMode ? "rgba(255,255,255,0.85)" : "#1a1a1a";
    const searchPlaceholderColor = isDarkMode ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.35)";
    const searchIconColor = isDarkMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)";

    useEffect(() => {
        const initialTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', initialTheme);
    }, []);

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
                } catch (err) {
                    if (!localStorage.getItem('accessToken')) handleLogout();
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

    useEffect(() => {
        const handleKeys = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if (e.key === "1") setSelectedKey("1");
            if (e.key === "2") setSelectedKey("2");
            if (e.key === "3") setSelectedKey("3");
            if (e.key === "4") setSelectedKey("4");
            if (e.key === "5") setSelectedKey("5");
        };
        window.addEventListener("keydown", handleKeys);
        return () => window.removeEventListener("keydown", handleKeys);
    }, []);

    useEffect(() => {
        setSearchQuery("");
    }, [selectedKey]);

    const handleTagClick = (tableKey: string, id: number) => {
        setHighlightId(id);
        setHighlightTable(tableKey);
        setSelectedKey(tableKey);
    };

    const clearHighlight = () => {
        setHighlightId(null);
        setHighlightTable(null);
    };

    const searchPlaceholders: Record<string, string> = {
        "1": "Поиск по ФИО...",
        "2": "Поиск по названию...",
        "3": "Поиск по названию...",
        "4": "Поиск по ФИО...",
        "5": "Поиск по ФИО ученика...",
    };

    const menuItems = [
        { key: "1", label: <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span>Учащиеся</span><span style={{ opacity: 0.4, fontSize: '0.8em' }}>1</span></div> },
        { key: "2", label: <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span>Группы</span><span style={{ opacity: 0.4, fontSize: '0.8em' }}>2</span></div> },
        { key: "3", label: <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span>Предметы</span><span style={{ opacity: 0.4, fontSize: '0.8em' }}>3</span></div> },
        { key: "4", label: <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span>Учителя</span><span style={{ opacity: 0.4, fontSize: '0.8em' }}>4</span></div> },
        { key: "5", label: <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span>Оценки</span><span style={{ opacity: 0.4, fontSize: '0.8em' }}>5</span></div> },
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
                token: { colorPrimary: headerColor },
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
            <style>{`
                .ant-table { border-bottom-left-radius: 8px !important; border-bottom-right-radius: 8px !important; overflow: hidden !important; }
                .ant-table-container { border-bottom-left-radius: 8px !important; border-bottom-right-radius: 8px !important; }
                .ant-layout, .ant-layout-header, .ant-layout-sider, .ant-table, .ant-table-thead > tr > th, .ant-table-tbody > tr > td {
                    transition: background-color 0.4s ease !important;
                }
                .row-highlighted td {
                    background-color: rgba(22, 119, 255, 0.12) !important;
                    transition: background-color 0.3s ease !important;
                }

                .header-search .ant-input-affix-wrapper {
                    background: ${searchBg} !important;
                    border: 1px solid ${searchBorder} !important;
                    border-radius: 6px !important;
                    box-shadow: none !important;
                    transition: border-color 0.2s, background 0.4s !important;
                }
                .header-search .ant-input-affix-wrapper:hover {
                    border-color: ${searchBorderFocus} !important;
                }
                .header-search .ant-input-affix-wrapper-focused {
                    border-color: ${searchBorderFocus} !important;
                    box-shadow: 0 0 0 2px ${isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.5)"} !important;
                }
                .header-search .ant-input {
                    background: transparent !important;
                    color: ${searchText} !important;
                    transition: color 0.4s !important;
                }
                .header-search .ant-input::placeholder {
                    color: ${searchPlaceholderColor} !important;
                }
                .header-search .ant-input-prefix {
                    color: ${searchIconColor} !important;
                    margin-right: 6px;
                    transition: color 0.4s !important;
                }
                .header-search .ant-input-clear-icon {
                    color: ${searchIconColor} !important;
                }
                .header-search .ant-input-clear-icon:hover {
                    color: ${searchText} !important;
                }
            `}</style>

            <Layout style={{ height: "100vh" }}>
                <Header style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "0 20px",
                    background: headerColor,
                    zIndex: 1,
                    gap: 16,
                }}
                        data-tauri-drag-region
                        className="h-12 flex items-center px-4"
                >
                    <span style={{ color: "white", fontSize: '18px', fontWeight: 'bold', whiteSpace: 'nowrap', marginRight: 8 }}>
                        Tabularium
                    </span>

                    <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                        <Input
                            className="header-search"
                            prefix={<SearchOutlined />}
                            placeholder={searchPlaceholders[selectedKey]}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            allowClear
                            style={{ width: 300 }}
                        />
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 16, whiteSpace: 'nowrap' }}>
                        <Switch
                            checked={isDarkMode}
                            onChange={(checked, event) => toggleTheme(checked, event)}
                            checkedChildren={<MoonOutlined />}
                            unCheckedChildren={<SunOutlined />}
                        />
                        {fullname && (
                            <span style={{ color: "white", display: "flex", alignItems: "center", gap: 8 }}>
                                <UserOutlined style={{ fontSize: '16px' }} />
                                {fullname.split(' ').slice(0, 2).join(' ')}
                            </span>
                        )}
                        <Button
                            type="text"
                            icon={<LogoutOutlined />}
                            onClick={handleLogout}
                            style={{ color: "white", background: "rgba(255, 255, 255, 0.15)" }}
                        >
                            Выйти
                        </Button>
                    </div>
                </Header>

                <Layout>
                    <Sider width={250} theme={isDarkMode ? "dark" : "light"}>
                        <Menu
                            mode="inline"
                            selectedKeys={[selectedKey]}
                            style={{ height: "100%", borderRight: 0, paddingTop: "10px" }}
                            items={menuItems}
                            onClick={(e) => setSelectedKey(e.key)}
                        />
                    </Sider>
                    <Layout style={{ padding: "24px" }}>
                        <Content style={{ background: isDarkMode ? "#141414" : "#fff", padding: 24, margin: 0, minHeight: 280, borderRadius: 8 }}>
                            <AnimatePresence mode="wait">
                                {selectedKey === "1" && (
                                    <motion.div key="students" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} style={{ height: "100%" }}>
                                        <StudentsTable highlightId={highlightTable === "1" ? highlightId : null} onHighlightClear={clearHighlight} onTagClick={handleTagClick} searchQuery={searchQuery} />
                                    </motion.div>
                                )}
                                {selectedKey === "2" && (
                                    <motion.div key="groups" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} style={{ height: "100%" }}>
                                        <GroupsTable highlightId={highlightTable === "2" ? highlightId : null} onHighlightClear={clearHighlight} searchQuery={searchQuery} />
                                    </motion.div>
                                )}
                                {selectedKey === "3" && (
                                    <motion.div key="subjects" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} style={{ height: "100%" }}>
                                        <SubjectsTable highlightId={highlightTable === "3" ? highlightId : null} onHighlightClear={clearHighlight} onTagClick={handleTagClick} searchQuery={searchQuery} />
                                    </motion.div>
                                )}
                                {selectedKey === "4" && (
                                    <motion.div key="teachers" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} style={{ height: "100%" }}>
                                        <TeachersTable highlightId={highlightTable === "4" ? highlightId : null} onHighlightClear={clearHighlight} onTagClick={handleTagClick} searchQuery={searchQuery} />
                                    </motion.div>
                                )}
                                {selectedKey === "5" && (
                                    <motion.div key="grades" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} style={{ height: "100%" }}>
                                        <GradesTable highlightId={highlightTable === "5" ? highlightId : null} onHighlightClear={clearHighlight} onTagClick={handleTagClick} searchQuery={searchQuery} />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </Content>
                    </Layout>
                </Layout>
            </Layout>
        </ConfigProvider>
    );
};

export default App;