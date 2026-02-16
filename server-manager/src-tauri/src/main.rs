#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::{
    fs,
    io::{BufRead, BufReader, Read, Write},
    net::TcpStream,
    path::Path,
    process::{Child, Command, Stdio},
    sync::{Arc, Mutex},
    time::Duration,
};
use tauri::{AppHandle, Manager, Emitter};

struct SharedProcess(Arc<Mutex<Option<Child>>>);

#[derive(Serialize, Deserialize, Clone)]
struct SpringConfig {
    host: String,
    user: String,
    password: String,
    jar_path: String,
}

#[tauri::command]
fn save_config_to_yml(config: SpringConfig) -> Result<(), String> {
    let yaml_content = format!(
        r#"spring:
  datasource:
    url: jdbc:postgresql://{}/students_db
    username: {}
    password: {}
server:
  port: 8080
"#,
        config.host,
        config.user,
        config.password,
    );

    fs::write("application.yml", yaml_content).map_err(|e| e.to_string())
}

#[tauri::command]
fn load_config_from_yml() -> Result<SpringConfig, String> {
    if !Path::new("application.yml").exists() {
        return Ok(SpringConfig {
            host: "localhost:5432".to_string(),
            user: "postgres".to_string(),
            password: "password".to_string(),
            jar_path: "".to_string(),
        });
    }

    let content = fs::read_to_string("application.yml")
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
                let url = url_part.trim();
                if let Some(host_part) = url.strip_prefix("jdbc:postgresql://") {
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
    if Path::new("server.jar").exists() {
        return true;
    }

    if let Ok(current_dir) = std::env::current_dir() {
        if let Some(parent) = current_dir.parent() {
            if parent.join("server.jar").exists() {
                return true;
            }

            if let Ok(entries) = fs::read_dir(&parent) {
                for entry in entries {
                    if let Ok(entry) = entry {
                        if let Some(name) = entry.file_name().to_str() {
                            if name.to_lowercase().ends_with(".jar") {
                                return true;
                            }
                        }
                    }
                }
            }
        }
    }

    false
}

#[tauri::command]
fn check_yml_exists() -> bool {
    Path::new("application.yml").exists()
}

#[tauri::command]
fn detect_server_jar() -> Result<String, String> {
    if Path::new("server.jar").exists() {
        return Ok("server.jar".to_string());
    }

    let current_dir = std::env::current_dir().map_err(|e| e.to_string())?;

    if let Some(parent) = current_dir.parent() {
        if parent.join("server.jar").exists() {
            return Ok("../server.jar".to_string());
        }

        let entries = fs::read_dir(parent).map_err(|e| e.to_string())?;
        for entry in entries {
            if let Ok(entry) = entry {
                if let Some(name) = entry.file_name().to_str() {
                    if name.to_lowercase().ends_with(".jar") {
                        return Ok(format!("../{}", name));
                    }
                }
            }
        }
    }

    Err("JAR файл не найден".to_string())
}

#[tauri::command]
fn start_spring(app_handle: AppHandle, shared: tauri::State<SharedProcess>, jar_path: String) -> Result<(), String> {
    let mut guard = shared.0.lock().unwrap();
    if guard.is_some() {
        return Err("Spring уже запущен".into());
    }

    let jar_path_buf = if jar_path.starts_with("../") {
        std::env::current_dir()
            .map_err(|e| e.to_string())?
            .parent()
            .ok_or("Не удалось получить родительскую директорию")?
            .join(&jar_path[3..])
    } else {
        std::path::PathBuf::from(&jar_path)
    };

    if !jar_path_buf.exists() {
        return Err(format!("Файл {} не найден", jar_path_buf.display()));
    }

    let mut child = Command::new("java")
        .arg("-jar")
        .arg(&jar_path_buf)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();
    let window = app_handle
        .get_webview_window("main")
        .ok_or("Window not found")?;

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

    send_status(&app_handle, "spring-log", "=== Начало остановки Spring приложения ===");

    // 1. Пробуем graceful shutdown через Spring Actuator endpoint
    match attempt_actuator_shutdown(&app_handle) {
        Ok(_) => {
            send_status(&app_handle, "spring-log", "✅ Spring Actuator принял команду shutdown");

            // Ждем завершения Spring (максимум 15 секунд)
            for i in 0..15 {
                std::thread::sleep(std::time::Duration::from_secs(1));

                // Проверяем освободился ли порт
                if !is_port_open(8080) {
                    send_status(&app_handle, "spring-log", "✅ Порт 8080 освобожден - Spring завершился");
                    if let Some(mut child) = guard.take() {
                        let _ = child.wait();
                    }
                    send_status(&app_handle, "spring-status", "stopped");
                    send_status(&app_handle, "spring-log", "=== Spring приложение завершено через Actuator ===");
                    return Ok(());
                }

                send_status(&app_handle, "spring-log", &format!("Ожидание завершения Spring... {} сек", i + 1));
            }

            // Если таймаут, все равно считаем что остановлено
            send_status(&app_handle, "spring-log", "⚠️ Таймаут ожидания, принудительно завершаем");
            if let Some(mut child) = guard.take() {
                let _ = child.kill();
                let _ = child.wait();
            }
        }
        Err(e) => {
            send_status(&app_handle, "spring-log", &format!("❌ Ошибка Actuator: {}", e));
            // При ошибке Actuator просто убиваем процесс
            if let Some(mut child) = guard.take() {
                let _ = child.kill();
                let _ = child.wait();
            }
        }
    }

    send_status(&app_handle, "spring-status", "stopped");
    send_status(&app_handle, "spring-log", "=== Spring приложение остановлено ===");
    Ok(())
}

fn attempt_actuator_shutdown(app_handle: &AppHandle) -> Result<(), String> {
    send_status(app_handle, "spring-log", "Отправка запроса на /actuator/shutdown...");

    // Формируем HTTP POST запрос
    let request = format!(
        "POST /actuator/shutdown HTTP/1.1\r\n\
         Host: localhost:8080\r\n\
         User-Agent: Tauri-App/1.0\r\n\
         Accept: application/json\r\n\
         Content-Type: application/json\r\n\
         Content-Length: 0\r\n\
         Connection: close\r\n\
         \r\n"
    );

    // Отправляем запрос
    let response = send_http_request("localhost:8080", &request, app_handle)?;

    // Детально логируем ответ
    send_status(app_handle, "spring-log", &format!("Полный ответ от сервера:\n{}", response));

    // Проверяем различные возможные ответы
    if response.contains("200 OK") {
        Ok(())
    } else if response.contains("204 No Content") {
        Ok(())
    } else if response.contains("Shutting down") {
        Ok(())
    } else if response.contains("404 Not Found") {
        Err("Endpoint /actuator/shutdown не найден".to_string())
    } else if response.contains("405 Method Not Allowed") {
        Err("Метод POST не разрешен".to_string())
    } else if response.contains("401 Unauthorized") || response.contains("403 Forbidden") {
        Err("Требуется аутентификация для доступа к /actuator/shutdown".to_string())
    } else {
        // Логируем первые 200 символов ответа для диагностики
        let preview = if response.len() > 200 {
            &response[..200]
        } else {
            &response
        };
        Err(format!("Неожиданный ответ: {}", preview))
    }
}

fn send_http_request(host: &str, request: &str, app_handle: &AppHandle) -> Result<String, String> {
    send_status(app_handle, "spring-log", &format!("Подключение к {}...", host));

    let mut stream = TcpStream::connect(host)
        .map_err(|e| format!("Не удалось подключиться к {}: {}", host, e))?;

    send_status(app_handle, "spring-log", "Подключение установлено, отправка запроса...");

    // Устанавливаем таймауты
    stream.set_read_timeout(Some(Duration::from_secs(5)))
        .map_err(|e| format!("Не удалось установить таймаут чтения: {}", e))?;
    stream.set_write_timeout(Some(Duration::from_secs(5)))
        .map_err(|e| format!("Не удалось установить таймаут записи: {}", e))?;

    // Отправляем запрос
    stream.write_all(request.as_bytes())
        .map_err(|e| format!("Ошибка отправки запроса: {}", e))?;

    send_status(app_handle, "spring-log", "Запрос отправлен, чтение ответа...");

    // Читаем ответ
    let mut response = Vec::new();
    let mut buffer = [0; 1024];

    loop {
        match stream.read(&mut buffer) {
            Ok(0) => break, // Конец потока
            Ok(n) => {
                response.extend_from_slice(&buffer[..n]);
            }
            Err(e) => {
                if e.kind() == std::io::ErrorKind::TimedOut {
                    break;
                } else {
                    return Err(format!("Ошибка чтения ответа: {}", e));
                }
            }
        }
    }

    send_status(app_handle, "spring-log", &format!("Получено байт ответа: {}", response.len()));

    String::from_utf8(response)
        .map_err(|e| format!("Ошибка преобразования ответа в UTF-8: {}", e))
}

fn is_port_open(port: u32) -> bool {
    TcpStream::connect(format!("localhost:{}", port)).is_ok()
}

fn send_status(app_handle: &AppHandle, event: &str, message: &str) {
    if let Some(window) = app_handle.get_webview_window("main") {
        let _ = window.emit(event, message);
    }
    println!("[Spring App] {}", message);
}

fn main() {
    tauri::Builder::default()
        .manage(SharedProcess(Arc::new(Mutex::new(None))))
        .invoke_handler(tauri::generate_handler![
            save_config_to_yml,
            load_config_from_yml,
            start_spring,
            stop_spring,
            check_jar_exists,
            check_yml_exists,
            detect_server_jar
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}