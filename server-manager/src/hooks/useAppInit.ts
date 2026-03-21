import { useCallback } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { core } from "@tauri-apps/api";
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
            const isReady = await core.invoke<boolean>("check_dependencies");
            setNeedsInstall(!isReady);
            if (!isReady) return;

            const jarExists = await core.invoke<boolean>("check_jar_exists");
            setJarDetected(jarExists);

            const ymlExists = await core.invoke<boolean>("check_yml_exists");
            setYmlDetected(ymlExists);

            if (ymlExists) {
                const cfg = await core.invoke<SpringConfig>("load_config_from_yml");
                setConfig(cfg);
                formRef.current?.setFieldsValue(cfg);
            }

            if (jarExists) {
                const jarPath = await core.invoke<string>("detect_server_jar");
                setConfig(prev => ({ ...prev, jar_path: jarPath }));
                formRef.current?.setFieldsValue({ jar_path: jarPath });
            }
        } catch (e) {
            console.error("[useAppInit]", e);
        }
    }, [formRef, setConfig, setJarDetected, setNeedsInstall, setYmlDetected]);
}