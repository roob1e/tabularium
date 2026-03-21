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

pub fn get_yml_path() -> PathBuf {
    let cwd = std::env::current_dir().unwrap_or_default();
    cwd.parent().unwrap_or(&cwd).join("application.yml")
}

pub fn generate_jwt_secret() -> String {
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
    for b in &bytes { let _ = write!(hex, "{:02x}", b); }
    hex
}

pub fn read_existing_jwt_secret() -> Option<String> {
    let content = fs::read_to_string(get_yml_path()).ok()?;
    for line in content.lines() {
        let t = line.trim();
        if t.starts_with("secret:") {
            let s = t.split("secret:").nth(1)?.trim().to_string();
            if !s.is_empty() { return Some(s); }
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