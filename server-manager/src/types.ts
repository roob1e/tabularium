export interface SpringConfig {
    host: string;
    user: string;
    password: string;
    jar_path: string;
}

export type SpringStatus = "stopped" | "starting" | "running";

export const STATUS_CONFIG = {
    stopped:  { color: "#ff4d4f", bg: "rgba(255,77,79,0.1)",  text: "ОСТАНОВЛЕН" },
    starting: { color: "#faad14", bg: "rgba(250,173,20,0.1)", text: "ЗАПУСКАЕТСЯ" },
    running:  { color: "#52c41a", bg: "rgba(82,196,26,0.1)",  text: "РАБОТАЕТ" },
} as const;