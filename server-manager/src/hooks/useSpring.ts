import { invoke } from "@tauri-apps/api/core";
import { message } from "antd";
import type { SpringStatus } from "../types";

export function useSpring(
    form: any,
    setStatus: (s: SpringStatus) => void,
) {
    const startSpring = async () => {
        try {
            const values = await form.validateFields();
            if (!values.jar_path) {
                message.error("Укажите путь к server.jar");
                return;
            }
            setStatus("starting");
            await invoke("start_spring", { jarPath: values.jar_path });
        } catch (e) {
            message.error("Не удалось запустить Spring: " + e);
            setStatus("stopped");
        }
    };

    const stopSpring = async () => {
        try {
            await invoke("stop_spring");
        } catch (e) {
            message.error("Не удалось остановить Spring: " + e);
        }
    };

    return { startSpring, stopSpring };
}