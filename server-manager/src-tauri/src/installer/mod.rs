pub mod macos;
pub mod windows;
pub mod linux;

use std::process::Command;
use tauri::{Emitter, Runtime, Window};

fn find_psql() -> &'static str {
    #[cfg(target_os = "macos")]  { macos::find_psql() }
    #[cfg(target_os = "windows")] { windows::find_psql() }
    #[cfg(target_os = "linux")]   { linux::find_psql() }
    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    { "psql" }
}

fn find_java() -> &'static str {
    #[cfg(target_os = "macos")]  { macos::find_java() }
    #[cfg(not(target_os = "macos"))] { "java" }
}

#[tauri::command]
pub async fn check_dependencies() -> Result<bool, String> {
    let java_ok = Command::new(find_java()).arg("-version").output()
        .map(|o| {
            let s = format!("{}{}", String::from_utf8_lossy(&o.stderr), String::from_utf8_lossy(&o.stdout));
            s.contains("17")
        })
        .unwrap_or(false);

    let pg_ok = Command::new(find_psql()).arg("--version")
        .status().map(|s| s.success()).unwrap_or(false);

    Ok(java_ok && pg_ok)
}

#[tauri::command]
pub async fn install_all<R: Runtime>(
    window: Window<R>,
    password: String,
) -> Result<(), String> {
    std::thread::spawn(move || {
        let result = run_install(&window, &password);
        match result {
            Ok(_) => { let _ = window.emit("install-done", "ok"); }
            Err(e) => { let _ = window.emit("install-done", e); }
        }
    });
    Ok(())
}

fn run_install<R: Runtime>(window: &Window<R>, password: &str) -> Result<(), String> {
    #[cfg(target_os = "macos")]   macos::install(window, password)?;
    #[cfg(target_os = "windows")] windows::install(window, password)?;
    #[cfg(target_os = "linux")]   linux::install(window, password)?;

    setup_database(window)
}

fn setup_database<R: Runtime>(window: &Window<R>) -> Result<(), String> {
    let _ = window.emit("install-log", "Настройка базы данных...");
    let psql = find_psql();

    let user_exists = Command::new(psql)
        .args(["-U", "postgres", "-tAc", "SELECT 1 FROM pg_roles WHERE rolname='admin'"])
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim() == "1")
        .unwrap_or(false);

    if !user_exists {
        let _ = window.emit("install-log", "Создание пользователя admin...");
        let ok = Command::new(psql)
            .args(["-U", "postgres", "-c",
                "CREATE USER admin WITH PASSWORD '1234' SUPERUSER CREATEDB CREATEROLE;"])
            .status().map(|s| s.success()).unwrap_or(false);
        if !ok { return Err("Не удалось создать пользователя admin.".to_string()); }
        let _ = window.emit("install-log", "Пользователь admin создан.");
    } else {
        let _ = window.emit("install-log", "Пользователь admin уже существует, пропускаем.");
    }

    let db_exists = Command::new(psql)
        .args(["-U", "postgres", "-tAc",
            "SELECT 1 FROM pg_database WHERE datname='students_db'"])
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim() == "1")
        .unwrap_or(false);

    if !db_exists {
        let _ = window.emit("install-log", "Создание базы данных students_db...");
        let ok = Command::new(psql)
            .args(["-U", "postgres", "-c", "CREATE DATABASE students_db OWNER admin;"])
            .status().map(|s| s.success()).unwrap_or(false);
        if !ok { return Err("Не удалось создать базу данных.".to_string()); }
        let _ = window.emit("install-log", "База данных создана.");
    } else {
        let _ = window.emit("install-log", "База данных уже существует, пропускаем.");
    }

    let _ = window.emit("install-log", "Настройка прав доступа...");
    for grant in [
        "GRANT ALL PRIVILEGES ON DATABASE students_db TO admin;",
        "ALTER DATABASE students_db OWNER TO admin;",
    ] {
        let _ = Command::new(psql).args(["-U", "postgres", "-c", grant]).status();
    }
    for grant in [
        "GRANT ALL ON SCHEMA public TO admin;",
        "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin;",
        "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO admin;",
        "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO admin;",
        "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO admin;",
    ] {
        let _ = Command::new(psql).args(["-U", "admin", "-d", "students_db", "-c", grant]).status();
    }
    let _ = window.emit("install-log", "Права выданы.");
    let _ = window.emit("install-log", "Все компоненты готовы!");
    Ok(())
}