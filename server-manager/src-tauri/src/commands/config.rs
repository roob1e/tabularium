use serde::{Deserialize, Serialize};
use std::fs;
use crate::{get_yml_path, generate_jwt_secret, read_existing_jwt_secret};

#[derive(Serialize, Deserialize, Clone)]
pub struct SpringConfig {
    pub host: String,
    pub user: String,
    pub password: String,
    pub jar_path: String,
}

#[tauri::command]
pub fn save_config_to_yml(config: SpringConfig) -> Result<(), String> {
    let yml_path = get_yml_path();
    let jwt_secret = read_existing_jwt_secret().unwrap_or_else(generate_jwt_secret);

    let content = format!(
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

    fs::write(yml_path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn load_config_from_yml() -> Result<SpringConfig, String> {
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
            if let Some(v) = t.split("username:").nth(1) { config.user = v.trim().to_string(); }
        } else if t.starts_with("password:") {
            if let Some(v) = t.split("password:").nth(1) { config.password = v.trim().to_string(); }
        }
    }

    Ok(config)
}