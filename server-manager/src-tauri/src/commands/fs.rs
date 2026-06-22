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
/// Порядок поиска: папка exe → current_dir → родитель current_dir.
#[tauri::command]
pub fn detect_server_jar() -> Result<String, String> {
    // Приоритет: папка рядом с исполняемым файлом (надёжно на Windows)
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.to_path_buf()));

    let cwd = std::env::current_dir().unwrap_or_default();
    let root = cwd.parent().unwrap_or(&cwd).to_path_buf();

    let mut search_dirs: Vec<std::path::PathBuf> = Vec::new();
    if let Some(dir) = exe_dir { search_dirs.push(dir); }
    search_dirs.push(cwd.clone());
    search_dirs.push(root.clone());

    // 1. Ищем server.jar точно
    for dir in &search_dirs {
        let candidate = dir.join("server.jar");
        if candidate.exists() {
            let path = candidate.to_string_lossy().to_string();
            ensure_yml_exists(Some(&path));
            return Ok(path);
        }
    }

    // 2. Ищем любой .jar в этих директориях
    for dir in &search_dirs {
        if let Ok(entries) = fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().and_then(|e| e.to_str()) == Some("jar") {
                    let path_str = path.to_string_lossy().to_string();
                    ensure_yml_exists(Some(&path_str));
                    return Ok(path_str);
                }
            }
        }
    }

    Err("JAR-файл не найден. Поместите server.jar рядом с приложением.".to_string())
}