import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export async function startJar(jarPath: string, args?: string[]) {
    return invoke("start_jar", { jarPath, args });
}

export async function stopJar() {
    return invoke("stop_jar");
}

export async function readYaml(path: string) {
    return invoke("read_yaml", { path });
}

export async function writeYaml(path: string, content: string) {
    return invoke("write_yaml", { path, content });
}

export function onJarLog(callback: (msg: string) => void) {
    return listen("jar-log", (event) => {
        callback(event.payload as string);
    });
}

export function onJarExit(callback: (msg: string) => void) {
    return listen("jar-exit", (event) => {
        callback(event.payload as string);
    });
}