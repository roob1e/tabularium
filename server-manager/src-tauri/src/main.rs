#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod installer;

use serde::{Deserialize, Serialize};
use std::{
    fs,
    io::{BufRead, BufReader, Read, Write},
    net::TcpStream,
    process::{Child, Command, Stdio},
    sync::{Arc, Mutex},
    time::Duration,
};
use tauri::{AppHandle, Emitter, Manager};

struct SharedProcess(Arc<Mutex<Option<Child>>>);

#[derive(Serialize, Deserialize, Clone)]
struct SpringConfig {
    host: String,
    user: String,
    password: String,
    jar_path: String,
}

fn find_psql() -> &'static str {
    if std::path::Path::new("/opt/homebrew/bin/psql").exists() {
        "/opt/homebrew/bin/psql"
    } else if std::path::Path::new("/opt/homebrew/Cellar/postgresql@14/14.22/bin/psql").exists() {
        "/opt/homebrew/Cellar/postgresql@14/14.22/bin/psql"
    } else {
        "psql"
    }
}

fn find_java() -> &'static str {
    if std::path::Path::new("/opt/homebrew/opt/openjdk@17/bin/java").exists() {
        "/opt/homebrew/opt/openjdk@17/bin/java"
    } else if std::path::Path::new("/opt/homebrew/Cellar/openjdk@17/17.0.18/bin/java").exists() {
        "/opt/homebrew/Cellar/openjdk@17/17.0.18/bin/java"
    } else {
        "java"
    }
}

fn get_yml_path() -> std::path::PathBuf {
    let cwd = std::env::current_dir().unwrap_or_default();
    let root = cwd.parent().unwrap_or(&cwd).to_path_buf();
    root.join("application.yml")
}

fn generate_jwt_secret() -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::fmt::Write as FmtWrite;
    use std::hash::{Hash, Hasher};
    use std::time::{SystemTime, UNIX_EPOCH};

    let mut hasher = DefaultHasher::new();
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos()
        .hash(&mut hasher);
    std::process::id().hash(&mut hasher);

    let seed = hasher.finish();
    let mut bytes = Vec::new();
    for i in 0..8u64 {
        let mut h = DefaultHasher::new();
        (seed ^ i.wrapping_mul(0xdeadbeef)).hash(&mut h);
        bytes.extend_from_slice(&h.finish().to_le_bytes());
    }

    let mut hex = String::new();
    for b in &bytes {
        let _ = write!(hex, "{:02x}", b);
    }
    hex
}

fn read_existing_jwt_secret() -> Option<String> {
    let content = fs::read_to_string(get_yml_path()).ok()?;
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("secret:") {
            let secret = trimmed.split("secret:").nth(1)?.trim().to_string();
            if !secret.is_empty() {
                return Some(secret);
            }
        }
    }
    None
}

#[tauri::command]
fn save_config_to_yml(config: SpringConfig) -> Result<(), String> {
    let yml_path = get_yml_path();
    let jwt_secret = read_existing_jwt_secret().unwrap_or_else(generate_jwt_secret);

    let yaml_content = format!(
        r#"spring:
  datasource:
    url: jdbc:postgresql://{}/students_db
    username: {}
    password: {}
server:
  port: 8080
jwt:
  secret: {}
  access-token-expiration: 86400000
"#,
        config.host, config.user, config.password, jwt_secret,
    );

    fs::write(yml_path, yaml_content).map_err(|e| e.to_string())
}

#[tauri::command]
fn load_config_from_yml() -> Result<SpringConfig, String> {
    let yml_path = get_yml_path();

    if !yml_path.exists() {
        return Ok(SpringConfig {
            host: "localhost:5432".to_string(),
            user: "postgres".to_string(),
            password: "password".to_string(),
            jar_path: "".to_string(),
        });
    }

    let content = fs::read_to_string(&yml_path)
        .map_err(|e| format!("Failed to read application.yml: {}", e))?;

    let mut config = SpringConfig {
        host: "localhost:5432".to_string(),
        user: "postgres".to_string(),
        password: "password".to_string(),
        jar_path: "".to_string(),
    };

    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("url:") && trimmed.contains("jdbc:postgresql://") {
            if let Some(url_part) = trimmed.split("url:").nth(1) {
                if let Some(host_part) = url_part.trim().strip_prefix("jdbc:postgresql://") {
                    if let Some(host) = host_part.split('/').next() {
                        config.host = host.to_string();
                    }
                }
            }
        } else if trimmed.starts_with("username:") {
            if let Some(user) = trimmed.split("username:").nth(1) {
                config.user = user.trim().to_string();
            }
        } else if trimmed.starts_with("password:") {
            if let Some(pass) = trimmed.split("password:").nth(1) {
                config.password = pass.trim().to_string();
            }
        }
    }

    Ok(config)
}

#[tauri::command]
fn check_jar_exists() -> bool {
    let cwd = std::env::current_dir().unwrap_or_default();
    let root = cwd.parent().unwrap_or(&cwd).to_path_buf();

    if root.join("server.jar").exists() || cwd.join("server.jar").exists() {
        return true;
    }

    if let Ok(entries) = fs::read_dir(&root) {
        for entry in entries.flatten() {
            if let Some(name) = entry.file_name().to_str() {
                if name.to_lowercase().ends_with(".jar") {
                    return true;
                }
            }
        }
    }

    false
}

#[tauri::command]
fn check_yml_exists() -> bool {
    get_yml_path().exists()
}

#[tauri::command]
fn detect_server_jar() -> Result<String, String> {
    let cwd = std::env::current_dir().map_err(|e| e.to_string())?;
    let root = cwd.parent().ok_or("Не удалось получить корневую директорию")?;

    let jar = root.join("server.jar");
    if jar.exists() {
        return Ok(jar.to_string_lossy().to_string());
    }

    if let Ok(entries) = fs::read_dir(root) {
        for entry in entries.flatten() {
            if let Some(name) = entry.file_name().to_str() {
                if name.to_lowercase().ends_with(".jar") {
                    return Ok(entry.path().to_string_lossy().to_string());
                }
            }
        }
    }

    Err("JAR файл не найден".to_string())
}

#[tauri::command]
fn start_spring(
    app_handle: AppHandle,
    shared: tauri::State<SharedProcess>,
    jar_path: String,
) -> Result<(), String> {
    let mut guard = shared.0.lock().unwrap();
    if guard.is_some() {
        return Err("Spring уже запущен".into());
    }

    let jar_path_buf = std::path::PathBuf::from(&jar_path);
    if !jar_path_buf.exists() {
        return Err(format!("Файл {} не найден", jar_path_buf.display()));
    }

    let java_bin = if cfg!(target_os = "macos") { find_java() } else { "java" };

    let mut child = Command::new(java_bin)
        .arg("-jar")
        .arg(&jar_path_buf)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();
    let window = app_handle.get_webview_window("main").ok_or("Window not found")?;

    if let Some(out) = stdout {
        let w = window.clone();
        std::thread::spawn(move || {
            for line in BufReader::new(out).lines() {
                if let Ok(l) = line {
                    if l.contains("Application started, application.yml is connected") {
                        let _ = w.emit("spring-status", "running");
                    }
                    let _ = w.emit("spring-log", l);
                }
            }
        });
    }

    if let Some(err) = stderr {
        let w = window.clone();
        std::thread::spawn(move || {
            for line in BufReader::new(err).lines() {
                if let Ok(l) = line {
                    let _ = w.emit("spring-log", l);
                }
            }
        });
    }

    *guard = Some(child);
    let _ = window.emit("spring-status", "starting");
    Ok(())
}

#[tauri::command]
fn stop_spring(app_handle: AppHandle, shared: tauri::State<SharedProcess>) -> Result<(), String> {
    let mut guard = shared.0.lock().unwrap();

    send_status(&app_handle, "spring-log", "=== Остановка Spring приложения ===");

    match attempt_actuator_shutdown(&app_handle) {
        Ok(_) => {
            send_status(&app_handle, "spring-log", "✅ Actuator принял команду shutdown");

            for i in 0..15 {
                std::thread::sleep(std::time::Duration::from_secs(1));
                if !is_port_open(8080) {
                    if let Some(mut child) = guard.take() { let _ = child.wait(); }
                    send_status(&app_handle, "spring-status", "stopped");
                    send_status(&app_handle, "spring-log", "=== Spring остановлен ===");
                    return Ok(());
                }
                send_status(&app_handle, "spring-log", &format!("Ожидание... {} сек", i + 1));
            }

            send_status(&app_handle, "spring-log", "⚠️ Таймаут, принудительное завершение");
            if let Some(mut child) = guard.take() { let _ = child.kill(); let _ = child.wait(); }
        }
        Err(e) => {
            send_status(&app_handle, "spring-log", &format!("❌ Ошибка Actuator: {}", e));
            if let Some(mut child) = guard.take() { let _ = child.kill(); let _ = child.wait(); }
        }
    }

    send_status(&app_handle, "spring-status", "stopped");
    send_status(&app_handle, "spring-log", "=== Spring остановлен ===");
    Ok(())
}

fn attempt_actuator_shutdown(app_handle: &AppHandle) -> Result<(), String> {
    let request = "POST /actuator/shutdown HTTP/1.1\r\n\
         Host: localhost:8080\r\n\
         User-Agent: Tauri-App/1.0\r\n\
         Accept: application/json\r\n\
         Content-Type: application/json\r\n\
         Content-Length: 0\r\n\
         Connection: close\r\n\
         \r\n";

    let response = send_http_request("localhost:8080", request, app_handle)?;

    if response.contains("200 OK") || response.contains("204 No Content") || response.contains("Shutting down") {
        Ok(())
    } else if response.contains("404 Not Found") {
        Err("Endpoint /actuator/shutdown не найден".to_string())
    } else if response.contains("405 Method Not Allowed") {
        Err("Метод POST не разрешен".to_string())
    } else if response.contains("401 Unauthorized") || response.contains("403 Forbidden") {
        Err("Требуется аутентификация".to_string())
    } else {
        let preview = if response.len() > 200 { &response[..200] } else { &response };
        Err(format!("Неожиданный ответ: {}", preview))
    }
}

fn send_http_request(host: &str, request: &str, app_handle: &AppHandle) -> Result<String, String> {
    send_status(app_handle, "spring-log", &format!("Подключение к {}...", host));

    let mut stream = TcpStream::connect(host)
        .map_err(|e| format!("Не удалось подключиться: {}", e))?;

    stream.set_read_timeout(Some(Duration::from_secs(5))).ok();
    stream.set_write_timeout(Some(Duration::from_secs(5))).ok();
    stream.write_all(request.as_bytes())
        .map_err(|e| format!("Ошибка отправки: {}", e))?;

    let mut response = Vec::new();
    let mut buffer = [0; 1024];

    loop {
        match stream.read(&mut buffer) {
            Ok(0) => break,
            Ok(n) => response.extend_from_slice(&buffer[..n]),
            Err(e) => {
                if e.kind() == std::io::ErrorKind::TimedOut { break; }
                return Err(format!("Ошибка чтения: {}", e));
            }
        }
    }

    String::from_utf8(response).map_err(|e| format!("Ошибка UTF-8: {}", e))
}

fn is_port_open(port: u32) -> bool {
    TcpStream::connect(format!("localhost:{}", port)).is_ok()
}

fn send_status(app_handle: &AppHandle, event: &str, message: &str) {
    if let Some(window) = app_handle.get_webview_window("main") {
        let _ = window.emit(event, message);
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(SharedProcess(Arc::new(Mutex::new(None))))
        .invoke_handler(tauri::generate_handler![
            save_config_to_yml,
            load_config_from_yml,
            start_spring,
            stop_spring,
            check_jar_exists,
            check_yml_exists,
            detect_server_jar,
            installer::check_dependencies,
            installer::install_all,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}