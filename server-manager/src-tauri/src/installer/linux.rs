#![cfg(target_os = "linux")]

use std::io::{BufRead, BufReader, Write};
use std::process::{Command, Stdio};
use tauri::{Emitter, Runtime, Window};

// ─── Тип пакетного менеджера ─────────────────────────────────────────────────

enum PkgManager { Apt, Dnf }

fn detect_pkg_manager() -> Option<PkgManager> {
    if which("apt-get") { return Some(PkgManager::Apt); }
    if which("dnf")     { return Some(PkgManager::Dnf); }
    None
}

fn which(cmd: &str) -> bool {
    Command::new("which").arg(cmd)
        .stdout(Stdio::null()).stderr(Stdio::null())
        .status().map(|s| s.success()).unwrap_or(false)
}

// ─── Поиск бинарников ────────────────────────────────────────────────────────

pub fn find_psql() -> String {
    for path in &["/usr/bin/psql", "/usr/lib/postgresql/14/bin/psql"] {
        if std::path::Path::new(path).exists() { return path.to_string(); }
    }
    "psql".to_string()
}

fn java_version_ok() -> bool {
    Command::new("java").arg("-version")
        .output()
        .map(|o| {
            let s = format!("{}{}", String::from_utf8_lossy(&o.stderr), String::from_utf8_lossy(&o.stdout));
            s.contains("\"17") || s.contains("openjdk 17")
        })
        .unwrap_or(false)
}

// ─── sudo с паролем + стриминг ───────────────────────────────────────────────

fn sudo_stream<R: Runtime>(window: &Window<R>, args: &[&str], pwd: &str) -> Result<bool, String> {
    let mut child = Command::new("sudo")
        .arg("-S")
        .args(args)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Не удалось запустить sudo: {}", e))?;

    if let Some(mut stdin) = child.stdin.take() {
        let _ = stdin.write_all(format!("{}\n", pwd).as_bytes());
    }
    if let Some(out) = child.stdout.take() {
        let w = window.clone();
        std::thread::spawn(move || {
            for line in BufReader::new(out).lines().flatten() { let _ = w.emit("install-log", line); }
        });
    }
    if let Some(err) = child.stderr.take() {
        let w = window.clone();
        std::thread::spawn(move || {
            for line in BufReader::new(err).lines().flatten() {
                if !line.contains("[sudo]") && !line.trim_start().starts_with("Password") {
                    let _ = w.emit("install-log", line);
                }
            }
        });
    }
    child.wait()
        .map(|s: std::process::ExitStatus| s.success())
        .map_err(|e: std::io::Error| e.to_string())
}

fn check_sudo(pwd: &str) -> bool {
    let Ok(mut child) = Command::new("sudo")
        .args(["-S", "true"])
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
    else { return false; };
    if let Some(mut stdin) = child.stdin.take() {
        let _ = stdin.write_all(format!("{}\n", pwd).as_bytes());
    }
    child.wait().map(|s| s.success()).unwrap_or(false)
}

// ─── Основная функция установки ──────────────────────────────────────────────

pub fn install<R: Runtime>(window: &Window<R>, password: &str) -> Result<(), String> {
    // 0. Определяем пакетный менеджер
    let pkg = detect_pkg_manager().ok_or_else(|| {
        "Не удалось определить пакетный менеджер. \
         Поддерживаются дистрибутивы на базе apt (Ubuntu, Debian, Mint) \
         и dnf (Fedora, RHEL, CentOS).".to_string()
    })?;

    // 1. Проверяем пароль sudo
    let _ = window.emit("install-log", "Проверка прав sudo...");
    if !check_sudo(password) {
        return Err("Неверный пароль администратора или sudo не настроен.".to_string());
    }
    let _ = window.emit("install-log", "✅ Права sudo подтверждены.");

    match pkg {
        PkgManager::Apt => install_apt(window, password),
        PkgManager::Dnf => install_dnf(window, password),
    }
}

// ── apt (Debian / Ubuntu / Mint) ─────────────────────────────────────────────

fn install_apt<R: Runtime>(window: &Window<R>, password: &str) -> Result<(), String> {
    // 2. apt-get update
    let _ = window.emit("install-log", "Обновление списка пакетов...");
    if !sudo_stream(window, &["apt-get", "update", "-y"], password)? {
        return Err("Ошибка при обновлении пакетов (apt-get update).".to_string());
    }

    // 3. Java 17
    if java_version_ok() {
        let _ = window.emit("install-log", "✅ Java 17 уже установлена, пропускаем.");
    } else {
        let _ = window.emit("install-log", "Установка Java 17 (openjdk-17-jdk)...");
        if !sudo_stream(window, &["apt-get", "install", "-y", "openjdk-17-jdk"], password)? {
            return Err("Не удалось установить Java 17.".to_string());
        }
        let _ = window.emit("install-log", "✅ Java 17 установлена.");
    }

    // 4. PostgreSQL 14
    let pg_installed = find_psql() != "psql"
        || std::path::Path::new("/usr/lib/postgresql").exists();
    if pg_installed {
        let _ = window.emit("install-log", "✅ PostgreSQL уже установлен, пропускаем.");
    } else {
        let _ = window.emit("install-log", "Установка PostgreSQL...");
        let ok = sudo_stream(window, &["apt-get", "install", "-y", "postgresql-14"], password)?
            || sudo_stream(window, &["apt-get", "install", "-y", "postgresql"], password)?;
        if !ok {
            return Err("Не удалось установить PostgreSQL.".to_string());
        }
        let _ = window.emit("install-log", "✅ PostgreSQL установлен.");
    }

    // 5. Запуск сервиса
    start_pg_systemd(window, password)
}

// ── dnf (Fedora / RHEL / CentOS) ─────────────────────────────────────────────

fn install_dnf<R: Runtime>(window: &Window<R>, password: &str) -> Result<(), String> {
    // 3. Java 17
    if java_version_ok() {
        let _ = window.emit("install-log", "✅ Java 17 уже установлена, пропускаем.");
    } else {
        let _ = window.emit("install-log", "Установка Java 17 (java-17-openjdk)...");
        if !sudo_stream(window, &["dnf", "install", "-y", "java-17-openjdk-devel"], password)? {
            return Err("Не удалось установить Java 17.".to_string());
        }
        let _ = window.emit("install-log", "✅ Java 17 установлена.");
    }

    // 4. PostgreSQL
    if find_psql() != "psql" {
        let _ = window.emit("install-log", "✅ PostgreSQL уже установлен, пропускаем.");
    } else {
        let _ = window.emit("install-log", "Установка PostgreSQL (postgresql-server)...");
        if !sudo_stream(window, &["dnf", "install", "-y", "postgresql-server", "postgresql"], password)? {
            return Err("Не удалось установить PostgreSQL.".to_string());
        }
        // Инициализация кластера (обязательно на RHEL/Fedora)
        let _ = window.emit("install-log", "Инициализация кластера PostgreSQL...");
        let _ = sudo_stream(window, &["postgresql-setup", "--initdb"], password);
        let _ = window.emit("install-log", "✅ PostgreSQL установлен.");
    }

    // 5. Запуск сервиса
    start_pg_systemd(window, password)
}

// ── Общий запуск через systemctl ─────────────────────────────────────────────

fn start_pg_systemd<R: Runtime>(window: &Window<R>, password: &str) -> Result<(), String> {
    let pg_running = Command::new("pg_isready")
        .output().map(|o| o.status.success()).unwrap_or(false)
        || Command::new(find_psql().as_str())
            .args(["-U", "postgres", "-c", "SELECT 1"])
            .env("PGPASSWORD", "postgres")
            .stdout(Stdio::null()).stderr(Stdio::null())
            .status().map(|s| s.success()).unwrap_or(false);

    if pg_running {
        let _ = window.emit("install-log", "✅ PostgreSQL уже запущен.");
        return Ok(());
    }

    let _ = window.emit("install-log", "Запуск PostgreSQL через systemctl...");

    let service_names = ["postgresql@14-main", "postgresql-14", "postgresql"];
    let mut started = false;
    for name in &service_names {
        let _ = sudo_stream(window, &["systemctl", "enable", name], password);
        if sudo_stream(window, &["systemctl", "start", name], password).unwrap_or(false) {
            let _ = window.emit("install-log", &format!("✅ Сервис {} запущен.", name));
            started = true;
            break;
        }
    }

    if !started {
        return Err("Не удалось запустить PostgreSQL. \
                    Попробуйте вручную: sudo systemctl start postgresql".to_string());
    }

    // Ожидание готовности и настройка БД — в mod.rs::setup_database
    Ok(())
}