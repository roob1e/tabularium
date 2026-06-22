import React, { useEffect, useRef, useState } from "react";
import {
    Layout, Menu, Spin, Switch, ConfigProvider, theme,
    Button, Input, Modal, Form
} from "antd";
import {
    LogoutOutlined, SunOutlined, MoonOutlined, UserOutlined,
    SearchOutlined, GlobalOutlined, SettingOutlined
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import { ToastContainer, toast } from "react-toastify";
import axios from "axios";
import "react-toastify/dist/ReactToastify.css";

import ClassroomExplorer from "./components/ClassroomExplorer";
import SubjectsTable from "./components/SubjectsTable";
import TeachersTable from "./components/TeachersTable";
import GradesTable from "./components/GradesTable";
import AttendanceTable from "./components/AttendanceTable";
import ScheduleTable from "./components/ScheduleTable";
import ExportPanel from "./components/ExportPanel";
import QueryBuilder from "./components/QueryBuilder";
import AdminPanel from "./components/AdminPanel";
import AuthPage from "./pages/AuthPage";
import { useThemeTransition } from "./hooks/useThemeTransition";
import "./styles/themeTransition.css";

const { Header, Sider, Content } = Layout;
type Role = "ADMIN" | "TEACHER";

const App: React.FC = () => {
    const { isDarkMode, toggleTheme } = useThemeTransition();
    const [token, setToken] = useState<string | null>(() => localStorage.getItem("accessToken"));
    const [selectedKey, setSelectedKey] = useState("1");
    const [initializing, setInitializing] = useState(true);
    const [fullname, setFullname] = useState<string | null>(() => localStorage.getItem("fullname"));
    const [role, setRole] = useState<Role | null>(() => localStorage.getItem("role") as Role | null);
    const [searchQuery, setSearchQuery] = useState("");
    const [isAdminOpen, setIsAdminOpen] = useState(false);
    const [serverUrl, setServerUrl] = useState<string | null>(() => localStorage.getItem("server"));
    const [isServerModalOpen, setIsServerModalOpen] = useState(false);
    const [serverForm] = Form.useForm();
    const isStarted = useRef(false);

    const [highlightId, setHighlightId] = useState<number | null>(null);
    const [highlightTable, setHighlightTable] = useState<string | null>(null);

    const darkBlue = "#1d39c4";
    const headerColor = isDarkMode ? darkBlue : "#1677ff";
    const selectionBg = isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)";
    const searchBg = isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.92)";
    const searchBorder = isDarkMode ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)";
    const searchBorderFocus = isDarkMode ? "rgba(255,255,255,0.6)" : "#fff";
    const searchText = isDarkMode ? "rgba(255,255,255,0.85)" : "#1a1a1a";
    const searchPlaceholderColor = isDarkMode ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.35)";
    const searchIconColor = isDarkMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)";

    useEffect(() => {
        const t = localStorage.getItem("theme") || "light";
        document.documentElement.setAttribute("data-theme", t);
    }, []);

    const handleLogout = (expired = false) => {
        ["accessToken", "refreshToken", "fullname", "role"].forEach(k => localStorage.removeItem(k));
        setToken(null); setFullname(null); setRole(null);
        if (expired) toast.warning("Сессия истекла. Войдите снова.");
    };

    const handleServerSubmit = async (values: { url: string }) => {
        let url = values.url.trim();
        if (!/^https?:\/\//i.test(url)) url = `http://${url}`;
        if (!url.endsWith("/")) url += "/";
        try {
            setInitializing(true);
            await axios.get(url, { timeout: 3000 });
            localStorage.setItem("server", url);
            setServerUrl(url);
            setIsServerModalOpen(false);
            toast.success("Сервер доступен");
        } catch (err: any) {
            if (err.response) {
                localStorage.setItem("server", url);
                setServerUrl(url);
                setIsServerModalOpen(false);
                toast.success("Сервер найден");
            } else {
                localStorage.removeItem("server");
                setServerUrl(null);
                toast.error("Сервер не отвечает");
            }
        } finally {
            setInitializing(false);
        }
    };

    useEffect(() => {
        const onLogout = () => handleLogout(true);
        const onRefresh = (e: any) => setToken(e.detail);
        window.addEventListener("force-logout", onLogout);
        window.addEventListener("token-refreshed", onRefresh as EventListener);
        if (!isStarted.current) {
            isStarted.current = true;
            (async () => {
                if (!serverUrl) { setIsServerModalOpen(true); setInitializing(false); return; }
                try {
                    await axios.get(serverUrl, { timeout: 3000 });
                } catch (err: any) {
                    if (!err.response) {
                        toast.error("Сервер недоступен");
                        setServerUrl(null);
                        localStorage.removeItem("server");
                        setIsServerModalOpen(true);
                    }
                } finally { setInitializing(false); }
            })();
        }
        return () => {
            window.removeEventListener("force-logout", onLogout);
            window.removeEventListener("token-refreshed", onRefresh as EventListener);
        };
    }, [serverUrl]);

    const handleLoginSuccess = (data: { accessToken: string; fullname: string; role: string }) => {
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("fullname", data.fullname);
        localStorage.setItem("role", data.role);
        setToken(data.accessToken);
        setFullname(data.fullname);
        setRole(data.role as Role);
    };

    useEffect(() => {
        const handle = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            const num = ["1", "2", "3", "4", "5", "6", "7", "8"];
            if (num.includes(e.key)) setSelectedKey(e.key);
            if (e.key.toLowerCase() === "g" && e.ctrlKey) { e.preventDefault(); setIsServerModalOpen(true); }
        };
        window.addEventListener("keydown", handle);
        return () => window.removeEventListener("keydown", handle);
    }, []);

    useEffect(() => { setSearchQuery(""); }, [selectedKey]);

    const handleTagClick = (tableKey: string, id: number) => {
        setHighlightId(id); setHighlightTable(tableKey); setSelectedKey(tableKey);
    };
    const clearHighlight = () => { setHighlightId(null); setHighlightTable(null); };

    const searchPlaceholders: Record<string, string> = {
        "1": "Поиск по ФИО / группе...",
        "2": "Поиск по названию...",
        "3": "Поиск по ФИО...",
        "4": "Поиск по ФИО ученика...",
        "5": "Поиск по ФИО...",
        "6": "Поиск по группе / предмету...",
        "7": "",
        "8": "",
    };

    const menuItems = [
        { key: "1", label: <div style={{ display: "flex", justifyContent: "space-between" }}><span>Классы и учащиеся</span><span style={{ opacity: 0.4, fontSize: "0.8em" }}>1</span></div> },
        { key: "2", label: <div style={{ display: "flex", justifyContent: "space-between" }}><span>Предметы</span><span style={{ opacity: 0.4, fontSize: "0.8em" }}>2</span></div> },
        { key: "3", label: <div style={{ display: "flex", justifyContent: "space-between" }}><span>Учителя</span><span style={{ opacity: 0.4, fontSize: "0.8em" }}>3</span></div> },
        { key: "4", label: <div style={{ display: "flex", justifyContent: "space-between" }}><span>Оценки</span><span style={{ opacity: 0.4, fontSize: "0.8em" }}>4</span></div> },
        { key: "5", label: <div style={{ display: "flex", justifyContent: "space-between" }}><span>Посещаемость</span><span style={{ opacity: 0.4, fontSize: "0.8em" }}>5</span></div> },
        { key: "6", label: <div style={{ display: "flex", justifyContent: "space-between" }}><span>Расписание</span><span style={{ opacity: 0.4, fontSize: "0.8em" }}>6</span></div> },
        { key: "7", label: <div style={{ display: "flex", justifyContent: "space-between" }}><span>Аналитика</span><span style={{ opacity: 0.4, fontSize: "0.8em" }}>7</span></div> },
        { key: "8", label: <div style={{ display: "flex", justifyContent: "space-between" }}><span>Фильтры</span><span style={{ opacity: 0.4, fontSize: "0.8em" }}>8</span></div> },
    ];

    const serverModal = (
        <Modal title="Настройка сервера" open={isServerModalOpen}
               onCancel={() => serverUrl && setIsServerModalOpen(false)} footer={null} centered>
            <Form form={serverForm} onFinish={handleServerSubmit} layout="vertical" initialValues={{ url: serverUrl }}>
                <Form.Item name="url" label="Адрес API сервера" rules={[{ required: true }]}>
                    <Input prefix={<GlobalOutlined />} placeholder="http://localhost:8080" />
                </Form.Item>
                <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
                    <Button onClick={() => setIsServerModalOpen(false)} style={{ marginRight: 8 }} disabled={!serverUrl || initializing}>Отмена</Button>
                    <Button type="primary" htmlType="submit" loading={initializing}>Сохранить</Button>
                </Form.Item>
            </Form>
        </Modal>
    );

    if (!serverUrl) return (
        <ConfigProvider theme={{ algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm }}>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
                {serverModal}
            </div>
            <ToastContainer position="top-right" theme={isDarkMode ? "dark" : "light"} />
        </ConfigProvider>
    );

    if (initializing) return (
        <ConfigProvider theme={{ algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm }}>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
                <Spin size="large" />
            </div>
        </ConfigProvider>
    );

    if (!token) return (
        <ConfigProvider theme={{ algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm }}>
            <AuthPage onLoginSuccess={handleLoginSuccess} />
            <ToastContainer position="top-right" theme={isDarkMode ? "dark" : "light"} />
        </ConfigProvider>
    );

    const fade = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 }, transition: { duration: 0.18 } };

    return (
        <ConfigProvider theme={{
            algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
            token: { colorPrimary: headerColor },
            components: {
                Menu: {
                    colorItemBgSelected: selectionBg,
                    colorItemBgHover: selectionBg,
                    colorItemTextSelected: isDarkMode ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.88)",
                    colorItemTextHover: isDarkMode ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.88)",
                },
            },
        }}>
            <ToastContainer position="top-right" theme={isDarkMode ? "dark" : "light"} />
            <style>{`
                .ant-table { border-bottom-left-radius: 8px !important; border-bottom-right-radius: 8px !important; overflow: hidden !important; }
                .row-highlighted td { background-color: rgba(22,119,255,0.12) !important; transition: background-color 0.3s !important; }
                .header-search .ant-input-affix-wrapper { background: ${searchBg} !important; border: 1px solid ${searchBorder} !important; border-radius: 6px !important; box-shadow: none !important; }
                .header-search .ant-input-affix-wrapper-focused { border-color: ${searchBorderFocus} !important; }
                .header-search .ant-input { background: transparent !important; color: ${searchText} !important; }
                .header-search .ant-input::placeholder { color: ${searchPlaceholderColor} !important; }
                .header-search .ant-input-prefix, .header-search .ant-input-clear-icon { color: ${searchIconColor} !important; }
                .delete-btn { color: #ff4d4f !important; border: 1px solid #ff4d4f !important; background: transparent !important; }
                .delete-btn:hover { background: #ff4d4f !important; color: #fff !important; }
                .edit-btn { color: #1677ff !important; border: 1px solid #1677ff !important; background: transparent !important; }
                .edit-btn:hover { background: #1677ff !important; color: #fff !important; }
            `}</style>

            <Layout style={{ height: "100vh" }}>
                <Header style={{ display: "flex", alignItems: "center", padding: "0 20px", background: headerColor, zIndex: 1, gap: 16 }} data-tauri-drag-region>
                    <span style={{ color: "white", fontSize: 18, fontWeight: "bold", whiteSpace: "nowrap", marginRight: 8 }}>
                        Tabularium
                    </span>
                    <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
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
                    <div style={{ display: "flex", alignItems: "center", gap: 16, whiteSpace: "nowrap" }}>
                        <Switch checked={isDarkMode} onChange={(c, e) => toggleTheme(c, e)}
                                checkedChildren={<MoonOutlined />} unCheckedChildren={<SunOutlined />} />
                        {fullname && (
                            <span style={{ color: "white", display: "flex", alignItems: "center", gap: 8 }}>
                                <UserOutlined style={{ fontSize: 16 }} />
                                {fullname.split(" ").slice(0, 2).join(" ")}
                            </span>
                        )}
                        {role === "ADMIN" && (
                            <Button type="text" icon={<SettingOutlined />} onClick={() => setIsAdminOpen(true)}
                                    style={{ color: "white", background: "rgba(255,255,255,0.15)" }}>
                                Админ
                            </Button>
                        )}
                        <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout}
                                style={{ color: "white", background: "rgba(255,255,255,0.15)" }}>
                            Выйти
                        </Button>
                    </div>
                </Header>

                <Layout>
                    <Sider width={250} theme={isDarkMode ? "dark" : "light"}>
                        <Menu mode="inline" selectedKeys={[selectedKey]}
                              style={{ height: "100%", borderRight: 0, paddingTop: 10 }}
                              items={menuItems} onClick={e => setSelectedKey(e.key)} />
                        <div style={{ position: "absolute", bottom: 20, width: "100%", padding: "0 20px" }}>
                            <Button block type="primary" icon={<GlobalOutlined />}
                                    onClick={() => setIsServerModalOpen(true)}
                                    style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                                Сменить сервер
                            </Button>
                        </div>
                    </Sider>

                    <Layout style={{ padding: 24, overflow: "hidden", flex: 1, minHeight: 0 }}>
                        <Content style={{
                            background: isDarkMode ? "#141414" : "#fff",
                            padding: 24,
                            borderRadius: 8,
                            height: "100%",
                            overflow: "hidden",
                            display: "flex",
                            flexDirection: "column",
                        }}>
                            <AnimatePresence mode="wait">
                                {selectedKey === "1" && (
                                    <motion.div key="1" {...fade} style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                                        <ClassroomExplorer searchQuery={searchQuery} />
                                    </motion.div>
                                )}
                                {selectedKey === "2" && (
                                    <motion.div key="2" {...fade} style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                                        <SubjectsTable highlightId={highlightTable === "2" ? highlightId : null} onHighlightClear={clearHighlight} onTagClick={handleTagClick} searchQuery={searchQuery} />
                                    </motion.div>
                                )}
                                {selectedKey === "3" && (
                                    <motion.div key="3" {...fade} style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                                        <TeachersTable highlightId={highlightTable === "3" ? highlightId : null} onHighlightClear={clearHighlight} onTagClick={handleTagClick} searchQuery={searchQuery} />
                                    </motion.div>
                                )}
                                {selectedKey === "4" && (
                                    <motion.div key="4" {...fade} style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                                        <GradesTable highlightId={highlightTable === "4" ? highlightId : null} onHighlightClear={clearHighlight} onTagClick={handleTagClick} searchQuery={searchQuery} />
                                    </motion.div>
                                )}
                                {selectedKey === "5" && (
                                    <motion.div key="5" {...fade} style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                                        <AttendanceTable searchQuery={searchQuery} onTagClick={handleTagClick} />
                                    </motion.div>
                                )}
                                {selectedKey === "6" && (
                                    <motion.div key="6" {...fade} style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                                        <ScheduleTable searchQuery={searchQuery} onTagClick={handleTagClick} />
                                    </motion.div>
                                )}
                                {selectedKey === "7" && (
                                    <motion.div key="7" {...fade} style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                                        <ExportPanel />
                                    </motion.div>
                                )}
                                {selectedKey === "8" && (
                                    <motion.div key="8" {...fade} style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                                        <QueryBuilder username={fullname ?? "default"} />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </Content>
                    </Layout>
                </Layout>

                {serverModal}

                <Modal title="Панель администратора" open={isAdminOpen}
                       onCancel={() => setIsAdminOpen(false)} footer={null} width={850} centered>
                    <AdminPanel />
                </Modal>
            </Layout>
        </ConfigProvider>
    );
};

export default App;