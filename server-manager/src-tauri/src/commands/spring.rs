use std::io::{BufRead, BufReader};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};

pub struct SharedProcess(pub Arc<Mutex<Option<Child>>>);

use crate::installer::find_java;

// ─── Tauri-команды ───────────────────────────────────────────────────────────

#[tauri::command]
pub fn start_spring(
    app_handle: AppHandle,
    shared: tauri::State<SharedProcess>,
    jar_path: String,
) -> Result<(), String> {
    let mut guard = shared.0.lock().unwrap();
    if guard.is_some() {
        return Err("Spring уже запущен.".into());
    }

    let jar = std::path::PathBuf::from(&jar_path);
    if !jar.exists() {
        return Err(format!("Файл не найден: {}", jar.display()));
    }

    // Рабочая директория = папка с jar, там же лежит application.yml
    let jar_dir = jar
        .parent()
        .unwrap_or_else(|| std::path::Path::new("."))
        .to_path_buf();

    let java = find_java();
    let window = app_handle
        .get_webview_window("main")
        .ok_or("Окно приложения не найдено")?;

    let _ = window.emit("spring-log", &format!(
        "Запуск: {} -jar {} (cwd: {})",
        java, jar.display(), jar_dir.display()
    ));

    let mut cmd = Command::new(&java);
    cmd.arg("-jar")
        .arg(&jar)
        .current_dir(&jar_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    // На Windows скрываем консольное окно
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("Не удалось запустить java ({}): {}", java, e))?;

    if let Some(out) = child.stdout.take() {
        let w = window.clone();
        std::thread::spawn(move || {
            for line in BufReader::new(out).lines().flatten() {
                if line.contains("Application started") || line.contains("Started") {
                    let _ = w.emit("spring-status", "running");
                }
                let _ = w.emit("spring-log", &line);
            }
        });
    }

    if let Some(err) = child.stderr.take() {
        let w = window.clone();
        std::thread::spawn(move || {
            for line in BufReader::new(err).lines().flatten() {
                let _ = w.emit("spring-log", &line);
            }
        });
    }

    *guard = Some(child);
    let _ = window.emit("spring-status", "starting");
    Ok(())
}

#[tauri::command]
pub fn stop_spring(
    app_handle: AppHandle,
    shared: tauri::State<SharedProcess>,
) -> Result<(), String> {
    let child = {
        let mut guard = shared.0.lock().unwrap();
        guard.take()
    };

    std::thread::spawn(move || {
        emit(&app_handle, "spring-log", "=== Остановка Spring ===");

        if let Some(mut c) = child {
            let _ = c.kill();
            let _ = c.wait();
        }

        emit(&app_handle, "spring-status", "stopped");
        emit(&app_handle, "spring-log", "=== Spring остановлен ===");
    });

    Ok(())
}

fn emit(app_handle: &AppHandle, event: &str, msg: &str) {
    if let Some(w) = app_handle.get_webview_window("main") {
        let _ = w.emit(event, msg);
    }
}