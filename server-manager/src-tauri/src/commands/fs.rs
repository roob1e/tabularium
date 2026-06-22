use std::fs;
use crate::{get_yml_path, ensure_yml_exists};

#[tauri::command]
pub fn check_jar_exists() -> bool {
    detect_server_jar().is_ok()
}

/// Проверяет наличие application.yml рядом с jar.
#[tauri::command]
pub fn check_yml_exists(jar_path: String) -> bool {
    get_yml_path(Some(&jar_path)).exists()
}

/// Возвращает путь к .jar файлу.
/// Если yml рядом не существует — создаёт его автоматически.
#[tauri::command]
pub fn detect_server_jar() -> Result<String, String> {
    let cwd = std::env::current_dir().map_err(|e| e.to_string())?;
    let root = cwd.parent().unwrap_or(&cwd).to_path_buf();

    for dir in &[&root, &cwd] {
        let candidate = dir.join("server.jar");
        if candidate.exists() {
            let path = candidate.to_string_lossy().to_string();
            ensure_yml_exists(Some(&path));
            return Ok(path);
        }
    }

    if let Ok(entries) = fs::read_dir(&root) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) == Some("jar") {
                let path_str = path.to_string_lossy().to_string();
                ensure_yml_exists(Some(&path_str));
                return Ok(path_str);
            }
        }
    }

    Err("JAR-файл не найден. Поместите server.jar рядом с приложением.".to_string())
}