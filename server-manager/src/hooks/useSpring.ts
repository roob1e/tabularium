import { core } from "@tauri-apps/api";
import { message } from "antd";
import type {SpringStatus} from "../types";

export function useSpring(
    form: any,
    setStatus: (s: SpringStatus) => void,
) {
    const startSpring = async () => {
        try {
            const values = await form.validateFields();
            if (!values.jar_path) { message.error("Укажите путь к server.jar"); return; }
            await core.invoke("start_spring", { jarPath: values.jar_path });
            setStatus("starting");
        } catch (e) {
            message.error("Не удалось запустить Spring: " + e);
        }
    };

    const stopSpring = async () => {
        try {
            await core.invoke("stop_spring");
        } catch (e) {
            message.error("Не удалось остановить Spring: " + e);
        }
    };

    return { startSpring, stopSpring };
}