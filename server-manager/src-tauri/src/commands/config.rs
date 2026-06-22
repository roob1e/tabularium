use serde::{Deserialize, Serialize};
use std::fs;
use crate::{generate_jwt_secret, get_yml_path, read_existing_jwt_secret, ensure_yml_exists};

#[derive(Serialize, Deserialize, Clone)]
pub struct SpringConfig {
    pub host: String,
    pub user: String,
    pub password: String,
    pub jar_path: String,
}

/// Сохраняет конфигурацию в application.yml рядом с jar-файлом.
#[tauri::command]
pub fn save_config_to_yml(config: SpringConfig) -> Result<(), String> {
    let yml_path = get_yml_path(Some(&config.jar_path));
    let jwt_secret = read_existing_jwt_secret(Some(&config.jar_path))
        .unwrap_or_else(generate_jwt_secret);

    let content = format!(
        r#"spring:
  datasource:
    url: jdbc:postgresql://{host}/students_db
    username: {user}
    password: {password}
server:
  port: 8080
jwt:
  secret: {jwt}
  access-token-expiration: 86400000
  refresh-token-expiration: 604800000
"#,
        host = config.host,
        user = config.user,
        password = config.password,
        jwt = jwt_secret,
    );

    fs::write(&yml_path, content)
        .map_err(|e| format!("Не удалось сохранить {}: {}", yml_path.display(), e))
}

/// Загружает конфигурацию из application.yml рядом с jar-файлом.
/// Если файл не существует — создаёт его с дефолтными значениями.
#[tauri::command]
pub fn load_config_from_yml(jar_path: String) -> Result<SpringConfig, String> {
    ensure_yml_exists(Some(&jar_path));
    let yml_path = get_yml_path(Some(&jar_path));

    if !yml_path.exists() {
        return Ok(SpringConfig {
            host: "localhost:5432".to_string(),
            user: "admin".to_string(),
            password: "1234".to_string(),
            jar_path,
        });
    }

    let content = fs::read_to_string(&yml_path)
        .map_err(|e| format!("Не удалось прочитать application.yml: {}", e))?;

    let mut config = SpringConfig {
        host: "localhost:5432".to_string(),
        user: "admin".to_string(),
        password: "1234".to_string(),
        jar_path,
    };

    for line in content.lines() {
        let t = line.trim();
        if t.starts_with("url:") && t.contains("jdbc:postgresql://") {
            if let Some(rest) = t.split("url:").nth(1) {
                if let Some(host_part) = rest.trim().strip_prefix("jdbc:postgresql://") {
                    if let Some(host) = host_part.split('/').next() {
                        config.host = host.to_string();
                    }
                }
            }
        } else if t.starts_with("username:") {
            if let Some(v) = t.split("username:").nth(1) {
                config.user = v.trim().to_string();
            }
        } else if t.starts_with("password:") {
            if let Some(v) = t.split("password:").nth(1) {
                config.password = v.trim().to_string();
            }
        }
    }

    Ok(config)
}