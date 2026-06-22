mod installer;
mod commands {
    pub mod config;
    pub mod fs;
    pub mod spring;
}

use std::collections::hash_map::DefaultHasher;
use std::fmt::Write as FmtWrite;
use std::hash::{Hash, Hasher};
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use std::{fs, path::PathBuf};

use commands::spring::SharedProcess;

/// Возвращает путь к application.yml рядом с jar-файлом.
/// Если jar_path не передан — fallback на текущую директорию.
pub fn get_yml_path(jar_path: Option<&str>) -> PathBuf {
    if let Some(jar) = jar_path {
        let p = PathBuf::from(jar);
        if let Some(parent) = p.parent() {
            return parent.join("application.yml");
        }
    }
    std::env::current_dir()
        .unwrap_or_default()
        .join("application.yml")
}

/// Создаёт application.yml с дефолтными значениями, если он не существует.
pub fn ensure_yml_exists(jar_path: Option<&str>) {
    let yml_path = get_yml_path(jar_path);
    if yml_path.exists() { return; }

    // Создаём директорию если нужно
    if let Some(parent) = yml_path.parent() {
        let _ = fs::create_dir_all(parent);
    }

    let jwt_secret = generate_jwt_secret();
    let content = format!(
        r#"spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/students_db
    username: admin
    password: 1234
server:
  port: 8080
jwt:
  secret: {}
  access-token-expiration: 86400000
  refresh-token-expiration: 604800000
"#,
        jwt_secret
    );
    let _ = fs::write(&yml_path, content);
}

/// Генерирует случайный JWT-секрет на основе времени и PID.
pub fn generate_jwt_secret() -> String {
    let mut hasher = DefaultHasher::new();
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos()
        .hash(&mut hasher);
    std::process::id().hash(&mut hasher);
    let seed = hasher.finish();

    let mut bytes = Vec::with_capacity(64);
    for i in 0..8u64 {
        let mut h = DefaultHasher::new();
        (seed ^ i.wrapping_mul(0xdeadbeef)).hash(&mut h);
        bytes.extend_from_slice(&h.finish().to_le_bytes());
    }

    let mut hex = String::with_capacity(bytes.len() * 2);
    for b in &bytes {
        let _ = write!(hex, "{:02x}", b);
    }
    hex
}

/// Читает существующий jwt.secret из application.yml рядом с jar.
pub fn read_existing_jwt_secret(jar_path: Option<&str>) -> Option<String> {
    let content = fs::read_to_string(get_yml_path(jar_path)).ok()?;
    for line in content.lines() {
        let t = line.trim();
        if t.starts_with("secret:") {
            let s = t.split("secret:").nth(1)?.trim().to_string();
            if !s.is_empty() {
                return Some(s);
            }
        }
    }
    None
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .manage(SharedProcess(Arc::new(Mutex::new(None))))
        .invoke_handler(tauri::generate_handler![
            commands::config::save_config_to_yml,
            commands::config::load_config_from_yml,
            commands::fs::check_jar_exists,
            commands::fs::check_yml_exists,
            commands::fs::detect_server_jar,
            commands::spring::start_spring,
            commands::spring::stop_spring,
            installer::check_dependencies,
            installer::install_all,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}