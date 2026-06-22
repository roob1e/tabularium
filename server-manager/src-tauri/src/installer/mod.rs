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
    #[cfg(not(target_os = "macos"))]
    { "java".to_string() }
}

// ─── Tauri-команды ───────────────────────────────────────────────────────────

/// Проверяет, установлены ли Java 17 и PostgreSQL.
/// Возвращает Ok(true) только если обе зависимости готовы.
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

/// Запускает полную установку в фоновом потоке.
/// Прогресс и результат передаются через события Tauri:
///   "install-log"  — строка лога
///   "install-done" — "ok" или сообщение об ошибке
#[tauri::command]
pub async fn install_all<R: Runtime>(
    window: Window<R>,
    password: String,
) -> Result<(), String> {
    std::thread::spawn(move || {
        match run_install(&window, &password) {
            Ok(_) => { let _ = window.emit("install-done", "ok"); }
            Err(e) => { let _ = window.emit("install-done", e); }
        }
    });
    Ok(())
}

// ─── Внутренняя логика ───────────────────────────────────────────────────────

fn run_install<R: Runtime>(window: &Window<R>, password: &str) -> Result<(), String> {
    // 1. Устанавливаем платформенные зависимости (Java + PostgreSQL)
    #[cfg(target_os = "macos")]
    macos::install(window, password)?;
    #[cfg(target_os = "windows")]
    windows::install(window, password)?;
    #[cfg(target_os = "linux")]
    linux::install(window, password)?;

    // 2. Ждём готовности PostgreSQL, затем создаём БД и пользователя
    setup_database(window)
}

/// Проверяет, что `java` — именно версия 17.
fn check_java_version(java_bin: &str) -> bool {
    Command::new(java_bin)
        .arg("-version")
        .output()
        .map(|o| {
            // Java пишет версию в stderr
            let out = format!(
                "{}{}",
                String::from_utf8_lossy(&o.stderr),
                String::from_utf8_lossy(&o.stdout)
            );
            // «version "17...»  или  «openjdk 17»
            out.contains("\"17") || out.contains("openjdk 17")
        })
        .unwrap_or(false)
}

/// Поллинг pg_isready / psql до готовности, максимум 30 секунд.
fn wait_for_postgres(psql: &str) -> bool {
    for _ in 0..30 {
        let ready = Command::new(psql)
            .args(["-U", "postgres", "-c", "SELECT 1"])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .map(|s| s.success())
            .unwrap_or(false);
        if ready { return true; }
        std::thread::sleep(Duration::from_secs(1));
    }
    false
}

/// Идемпотентно создаёт пользователя ADMIN (пароль 1234) и базу students_db,
/// затем выдаёт все необходимые привилегии.
fn setup_database<R: Runtime>(window: &Window<R>) -> Result<(), String> {
    emit(window, "Ожидание готовности PostgreSQL...");
    let psql = find_psql();

    if !wait_for_postgres(&psql) {
        return Err("PostgreSQL не отвечает в течение 30 секунд после запуска.".to_string());
    }
    emit(window, "✅ PostgreSQL готов.");

    // ── Пользователь ADMIN ───────────────────────────────────────────────────
    let user_exists = psql_query_bool(
        &psql,
        "postgres",
        None,
        "SELECT 1 FROM pg_roles WHERE rolname='admin'",
    );

    if user_exists {
        emit(window, "Пользователь admin уже существует, пропускаем.");
    } else {
        emit(window, "Создание пользователя admin...");
        psql_exec(
            &psql, "postgres", None,
            "CREATE USER admin WITH PASSWORD '1234' CREATEDB CREATEROLE;",
        ).map_err(|e| format!("Не удалось создать пользователя admin: {}", e))?;
        emit(window, "✅ Пользователь admin создан.");
    }

    // ── База данных students_db ──────────────────────────────────────────────
    let db_exists = psql_query_bool(
        &psql,
        "postgres",
        None,
        "SELECT 1 FROM pg_database WHERE datname='students_db'",
    );

    if db_exists {
        emit(window, "База данных students_db уже существует, пропускаем.");
    } else {
        emit(window, "Создание базы данных students_db...");
        // CREATE DATABASE нельзя выполнить внутри транзакции — используем отдельную команду
        psql_exec(&psql, "postgres", None, "CREATE DATABASE students_db OWNER admin;")
            .map_err(|e| format!("Не удалось создать базу данных: {}", e))?;
        emit(window, "✅ База данных students_db создана.");
    }

    // ── Привилегии (выполняем от postgres, чтобы не зависеть от pg_hba.conf) ─
    emit(window, "Настройка прав доступа...");
    let grants: &[&str] = &[
        "GRANT ALL PRIVILEGES ON DATABASE students_db TO admin;",
        "ALTER DATABASE students_db OWNER TO admin;",
    ];
    for sql in grants {
        // Некритичные — не прерываем при ошибке
        let _ = Command::new(&psql)
            .args(["-U", "postgres", "-d", "students_db", "-c", sql])
            .stdout(Stdio::null()).stderr(Stdio::null())
            .status();
    }

    // Права на схему и будущие объекты — тоже от postgres
    let schema_grants: &[&str] = &[
        "GRANT ALL ON SCHEMA public TO admin;",
        "GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public TO admin;",
        "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO admin;",
        "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES    TO admin;",
        "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO admin;",
    ];
    for sql in schema_grants {
        let _ = Command::new(&psql)
            .args(["-U", "postgres", "-d", "students_db", "-c", sql])
            .stdout(Stdio::null()).stderr(Stdio::null())
            .status();
    }

    emit(window, "✅ Права выданы.");
    emit(window, "✅ Все компоненты установлены и готовы к работе!");
    Ok(())
}

// ─── Утилиты ─────────────────────────────────────────────────────────────────

fn emit<R: Runtime>(window: &Window<R>, msg: &str) {
    let _ = window.emit("install-log", msg);
}

/// Выполняет SELECT и возвращает true, если результат == "1".
fn psql_query_bool(psql: &str, user: &str, db: Option<&str>, sql: &str) -> bool {
    let mut args = vec!["-U", user, "-tAc", sql];
    if let Some(d) = db { args.extend_from_slice(&["-d", d]); }
    Command::new(psql)
        .args(&args)
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim() == "1")
        .unwrap_or(false)
}

/// Выполняет DDL/DML команду, возвращает Err если процесс завершился с ненулевым кодом.
fn psql_exec(psql: &str, user: &str, db: Option<&str>, sql: &str) -> Result<(), String> {
    let mut args = vec!["-U", user, "-c", sql];
    if let Some(d) = db { args.extend_from_slice(&["-d", d]); }
    let out = Command::new(psql)
        .args(&args)
        .output()
        .map_err(|e| e.to_string())?;
    if out.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&out.stderr).trim().to_string())
    }
}