pub mod macos;
pub mod windows;
pub mod linux;

use std::process::{Command, Stdio};
use std::time::Duration;
use tauri::{Emitter, Runtime, Window};

// ─── Поиск бинарников (делегируем платформе) ────────────────────────────────

fn find_psql() -> String {
    #[cfg(target_os = "macos")]
    { macos::find_psql() }
    #[cfg(target_os = "windows")]
    { windows::find_psql() }
    #[cfg(target_os = "linux")]
    { linux::find_psql() }
    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    { "psql".to_string() }
}

pub fn find_java() -> String {
    #[cfg(target_os = "macos")]
    { macos::find_java() }
    #[cfg(target_os = "windows")]
    { windows::find_java() }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    { "java".to_string() }
}

/// Возвращает переменные окружения для запуска psql от имени postgres.
/// - Windows: PGPASSWORD=postgres (winget ставит с этим паролем по умолчанию)
/// - macOS/Linux: пустой список (peer / trust аутентификация)
fn psql_env() -> Vec<(&'static str, &'static str)> {
    #[cfg(target_os = "windows")]
    { vec![("PGPASSWORD", "postgres")] }
    #[cfg(not(target_os = "windows"))]
    { vec![] }
}

// ─── Tauri-команды ───────────────────────────────────────────────────────────

#[tauri::command]
pub async fn check_dependencies() -> Result<bool, String> {
    let java_ok = check_java_version(&find_java());
    let pg_ok = Command::new(find_psql())
        .arg("--version")
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false);
    Ok(java_ok && pg_ok)
}

#[tauri::command]
pub async fn install_all<R: Runtime>(
    window: Window<R>,
    password: String,
) -> Result<(), String> {
    std::thread::spawn(move || {
        match run_install(&window, &password) {
            Ok(_)  => { let _ = window.emit("install-done", "ok"); }
            Err(e) => { let _ = window.emit("install-done", e); }
        }
    });
    Ok(())
}

// ─── Внутренняя логика ───────────────────────────────────────────────────────

fn run_install<R: Runtime>(window: &Window<R>, password: &str) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    macos::install(window, password)?;
    #[cfg(target_os = "windows")]
    windows::install(window, password)?;
    #[cfg(target_os = "linux")]
    linux::install(window, password)?;

    setup_database(window)
}

fn check_java_version(java_bin: &str) -> bool {
    Command::new(java_bin)
        .arg("-version")
        .output()
        .map(|o| {
            let out = format!(
                "{}{}",
                String::from_utf8_lossy(&o.stderr),
                String::from_utf8_lossy(&o.stdout)
            );
            out.contains("\"17") || out.contains("openjdk 17")
        })
        .unwrap_or(false)
}

/// Поллинг psql до готовности PostgreSQL, максимум 30 секунд.
fn wait_for_postgres(psql: &str) -> bool {
    for _ in 0..30 {
        let mut cmd = Command::new(psql);
        cmd.args(["-U", "postgres", "-c", "SELECT 1"])
            .stdout(Stdio::null())
            .stderr(Stdio::null());
        for (k, v) in psql_env() { cmd.env(k, v); }
        if cmd.status().map(|s| s.success()).unwrap_or(false) {
            return true;
        }
        std::thread::sleep(Duration::from_secs(1));
    }
    false
}

/// Идемпотентно создаёт пользователя admin (пароль 1234) и базу students_db.
fn setup_database<R: Runtime>(window: &Window<R>) -> Result<(), String> {
    emit(window, "Ожидание готовности PostgreSQL...");
    let psql = find_psql();

    if !wait_for_postgres(&psql) {
        return Err("PostgreSQL не отвечает в течение 30 секунд после запуска.".to_string());
    }
    emit(window, "✅ PostgreSQL готов.");

    // ── Пользователь admin ───────────────────────────────────────────────────
    let user_exists = psql_query_bool(
        &psql, "postgres", None,
        "SELECT 1 FROM pg_roles WHERE rolname='admin'",
    );
    if user_exists {
        emit(window, "Пользователь admin уже существует, пропускаем.");
    } else {
        emit(window, "Создание пользователя admin...");
        psql_exec(&psql, "postgres", None,
            "CREATE USER admin WITH PASSWORD '1234' CREATEDB CREATEROLE;",
        ).map_err(|e| format!("Не удалось создать пользователя admin: {}", e))?;
        emit(window, "✅ Пользователь admin создан.");
    }

    // ── База данных students_db ──────────────────────────────────────────────
    let db_exists = psql_query_bool(
        &psql, "postgres", None,
        "SELECT 1 FROM pg_database WHERE datname='students_db'",
    );
    if db_exists {
        emit(window, "База данных students_db уже существует, пропускаем.");
    } else {
        emit(window, "Создание базы данных students_db...");
        psql_exec(&psql, "postgres", None,
            "CREATE DATABASE students_db OWNER admin;",
        ).map_err(|e| format!("Не удалось создать базу данных: {}", e))?;
        emit(window, "✅ База данных students_db создана.");
    }

    // ── Привилегии ───────────────────────────────────────────────────────────
    emit(window, "Настройка прав доступа...");
    for sql in &[
        "GRANT ALL PRIVILEGES ON DATABASE students_db TO admin;",
        "ALTER DATABASE students_db OWNER TO admin;",
    ] {
        let mut cmd = Command::new(&psql);
        cmd.args(["-U", "postgres", "-d", "students_db", "-c", sql])
            .stdout(Stdio::null()).stderr(Stdio::null());
        for (k, v) in psql_env() { cmd.env(k, v); }
        let _ = cmd.status();
    }

    for sql in &[
        "GRANT ALL ON SCHEMA public TO admin;",
        "GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public TO admin;",
        "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO admin;",
        "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES    TO admin;",
        "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO admin;",
    ] {
        let mut cmd = Command::new(&psql);
        cmd.args(["-U", "postgres", "-d", "students_db", "-c", sql])
            .stdout(Stdio::null()).stderr(Stdio::null());
        for (k, v) in psql_env() { cmd.env(k, v); }
        let _ = cmd.status();
    }

    emit(window, "✅ Права выданы.");
    emit(window, "✅ Все компоненты установлены и готовы к работе!");
    Ok(())
}

// ─── Утилиты ─────────────────────────────────────────────────────────────────

fn emit<R: Runtime>(window: &Window<R>, msg: &str) {
    let _ = window.emit("install-log", msg);
}

fn psql_query_bool(psql: &str, user: &str, db: Option<&str>, sql: &str) -> bool {
    let mut args = vec!["-U", user, "-tAc", sql];
    if let Some(d) = db { args.extend_from_slice(&["-d", d]); }
    let mut cmd = Command::new(psql);
    cmd.args(&args);
    for (k, v) in psql_env() { cmd.env(k, v); }
    cmd.output()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim() == "1")
        .unwrap_or(false)
}

fn psql_exec(psql: &str, user: &str, db: Option<&str>, sql: &str) -> Result<(), String> {
    let mut args = vec!["-U", user, "-c", sql];
    if let Some(d) = db { args.extend_from_slice(&["-d", d]); }
    let mut cmd = Command::new(psql);
    cmd.args(&args);
    for (k, v) in psql_env() { cmd.env(k, v); }
    let out = cmd.output().map_err(|e| e.to_string())?;
    if out.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&out.stderr).trim().to_string())
    }
}