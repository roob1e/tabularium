use std::io::{BufRead, BufReader, Read, Write};
use std::net::TcpStream;
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

    let mut child = Command::new(&java)
        .arg("-jar")
        .arg(&jar)
        .current_dir(&jar_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
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
    let mut guard = shared.0.lock().unwrap();
    emit(&app_handle, "spring-log", "=== Остановка Spring ===");

    match actuator_shutdown() {
        Ok(_) => {
            emit(&app_handle, "spring-log", "✅ Actuator принял команду shutdown.");
            for i in 0..15 {
                std::thread::sleep(Duration::from_secs(1));
                if !port_open(8080) {
                    if let Some(mut c) = guard.take() { let _ = c.wait(); }
                    emit(&app_handle, "spring-status", "stopped");
                    emit(&app_handle, "spring-log", "=== Spring остановлен ===");
                    return Ok(());
                }
                emit(&app_handle, "spring-log", &format!("Ожидание... {} сек", i + 1));
            }
            emit(&app_handle, "spring-log", "⚠️ Таймаут — принудительное завершение.");
            kill_process(&mut guard);
        }
        Err(e) => {
            emit(&app_handle, "spring-log", &format!("❌ Actuator недоступен: {}", e));
            emit(&app_handle, "spring-log", "Принудительное завершение процесса...");
            kill_process(&mut guard);
        }
    }

    emit(&app_handle, "spring-status", "stopped");
    emit(&app_handle, "spring-log", "=== Spring остановлен ===");
    Ok(())
}

// ─── Вспомогательные функции ─────────────────────────────────────────────────

fn kill_process(guard: &mut std::sync::MutexGuard<Option<Child>>) {
    if let Some(mut c) = guard.take() {
        let _ = c.kill();
        let _ = c.wait();
    }
}

fn actuator_shutdown() -> Result<(), String> {
    let req = "POST /actuator/shutdown HTTP/1.1\r\n\
        Host: localhost:8080\r\n\
        User-Agent: Tabularium-Manager/1.0\r\n\
        Accept: application/json\r\n\
        Content-Type: application/json\r\n\
        Content-Length: 0\r\n\
        Connection: close\r\n\r\n";

    let mut stream = TcpStream::connect("localhost:8080")
        .map_err(|e| format!("Не удалось подключиться к localhost:8080 — {}", e))?;
    stream.set_read_timeout(Some(Duration::from_secs(5))).ok();
    stream.set_write_timeout(Some(Duration::from_secs(5))).ok();
    stream.write_all(req.as_bytes()).map_err(|e| e.to_string())?;

    let mut resp = Vec::new();
    let mut buf = [0u8; 1024];
    loop {
        match stream.read(&mut buf) {
            Ok(0) => break,
            Ok(n) => resp.extend_from_slice(&buf[..n]),
            Err(e) if e.kind() == std::io::ErrorKind::TimedOut => break,
            Err(e) => return Err(e.to_string()),
        }
    }

    let r = String::from_utf8_lossy(&resp);
    if r.contains("200 OK") || r.contains("204") || r.contains("Shutting down") {
        Ok(())
    } else if r.contains("404") {
        Err("/actuator/shutdown не настроен на сервере".into())
    } else if r.contains("401") || r.contains("403") {
        Err("Требуется аутентификация для /actuator/shutdown".into())
    } else {
        Err(format!("Неожиданный ответ: {}", &r[..r.len().min(200)]))
    }
}

fn port_open(port: u16) -> bool {
    TcpStream::connect_timeout(
        &format!("127.0.0.1:{}", port).parse().unwrap(),
        Duration::from_millis(200),
    ).is_ok()
}

fn emit(app_handle: &AppHandle, event: &str, msg: &str) {
    if let Some(w) = app_handle.get_webview_window("main") {
        let _ = w.emit(event, msg);
    }
}