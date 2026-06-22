import { invoke } from "@tauri-apps/api/core";
import { message } from "antd";
import type { SpringConfig } from "../types";

export function useConfig(
    form: any,
    setConfig: (cfg: SpringConfig) => void,
    setYmlDetected: (v: boolean) => void,
) {
    const saveConfig = async () => {
        try {
            const values = await form.validateFields();
            await invoke("save_config_to_yml", { config: values });
            setConfig(values);
            setYmlDetected(true);
            message.success("Конфигурация сохранена");
        } catch (e) {
            message.error("Ошибка сохранения: " + e);
        }
    };

    const loadConfig = async () => {
        try {
            const jarPath = form.getFieldValue("jar_path") ?? "";
            const cfg = await invoke<SpringConfig>("load_config_from_yml", { jarPath });
            setConfig(cfg);
            form.setFieldsValue(cfg);
            message.success("Конфигурация загружена");
        } catch (e) {
            message.error("Ошибка загрузки: " + e);
        }
    };

    return { saveConfig, loadConfig };
}