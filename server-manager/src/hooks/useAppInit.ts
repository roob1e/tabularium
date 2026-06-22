import { useCallback } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { SpringConfig } from "../types";

interface UseAppInitProps {
    setNeedsInstall: Dispatch<SetStateAction<boolean | null>>;
    setJarDetected: Dispatch<SetStateAction<boolean>>;
    setYmlDetected: Dispatch<SetStateAction<boolean>>;
    setConfig: Dispatch<SetStateAction<SpringConfig>>;
    formRef: MutableRefObject<any>;
}

export function useAppInit({
                               setNeedsInstall,
                               setJarDetected,
                               setYmlDetected,
                               setConfig,
                               formRef,
                           }: UseAppInitProps) {
    return useCallback(async () => {
        try {
            const isReady = await invoke<boolean>("check_dependencies");
            setNeedsInstall(!isReady);
            if (!isReady) return;

            const [jarExists, ymlExists] = await Promise.all([
                invoke<boolean>("check_jar_exists"),
                invoke<boolean>("check_yml_exists", { jarPath: "" }),
            ]);

            setJarDetected(jarExists);
            setYmlDetected(ymlExists);

            if (jarExists) {
                const jarPath = await invoke<string>("detect_server_jar");
                setConfig((prev) => ({ ...prev, jar_path: jarPath }));
                formRef.current?.setFieldsValue({ jar_path: jarPath });

                const yml = await invoke<boolean>("check_yml_exists", { jarPath });
                setYmlDetected(yml);

                if (yml) {
                    const cfg = await invoke<SpringConfig>("load_config_from_yml", { jarPath });
                    setConfig(cfg);
                    formRef.current?.setFieldsValue(cfg);
                }
            } else if (ymlExists) {
                const cfg = await invoke<SpringConfig>("load_config_from_yml", { jarPath: "" });
                setConfig(cfg);
                formRef.current?.setFieldsValue(cfg);
            }
        } catch (e) {
            console.error("[useAppInit]", e);
        }
    }, [formRef, setConfig, setJarDetected, setNeedsInstall, setYmlDetected]);
}