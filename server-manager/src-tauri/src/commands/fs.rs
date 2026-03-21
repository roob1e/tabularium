use std::fs;
use crate::get_yml_path;

#[tauri::command]
pub fn check_jar_exists() -> bool {
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
pub fn check_yml_exists() -> bool {
    get_yml_path().exists()
}

#[tauri::command]
pub fn detect_server_jar() -> Result<String, String> {
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