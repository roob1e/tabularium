use std::io::Write;
use std::process::{Command, Stdio};
use tauri::{Emitter, Runtime, Window};

fn sudo_run(args: &[&str], pwd: &str) -> bool {
    let Ok(mut child) = Command::new("sudo")
        .arg("-S").args(args)
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
    else { return false; };
    if let Some(stdin) = child.stdin.as_mut() {
        let _ = stdin.write_all(format!("{}\n", pwd).as_bytes());
    }
    child.wait().map(|s| s.success()).unwrap_or(false)
}

pub fn find_psql() -> &'static str {
    if std::path::Path::new("/usr/bin/psql").exists() { "/usr/bin/psql" } else { "psql" }
}

pub fn install<R: Runtime>(window: &Window<R>, password: &str) -> Result<(), String> {
    if !Command::new("which").arg("apt-get").status().map(|s| s.success()).unwrap_or(false) {
        return Err("Поддерживается только Debian/Ubuntu (apt-get не найден)".to_string());
    }

    let _ = window.emit("install-log", "Обновление пакетов...");
    if !sudo_run(&["apt-get", "update", "-y"], password) {
        return Err("Отказ в аутентификации или ошибка обновления пакетов".to_string());
    }

    if Command::new("which").arg("java").status().map(|s| s.success()).unwrap_or(false) {
        let _ = window.emit("install-log", "Java 17 уже установлена, пропускаем.");
    } else {
        let _ = window.emit("install-log", "Установка Java 17...");
        if !sudo_run(&["apt-get", "install", "-y", "openjdk-17-jdk"], password) {
            return Err("Не удалось установить Java 17".to_string());
        }
    }

    if std::path::Path::new("/usr/bin/psql").exists() || std::path::Path::new("/usr/lib/postgresql").exists() {
        let _ = window.emit("install-log", "PostgreSQL уже установлен, пропускаем.");
    } else {
        let _ = window.emit("install-log", "Установка PostgreSQL...");
        if !sudo_run(&["apt-get", "install", "-y", "postgresql"], password) {
            return Err("Не удалось установить PostgreSQL".to_string());
        }
    }

    if !Command::new("pg_isready").output().map(|o| o.status.success()).unwrap_or(false) {
        let _ = window.emit("install-log", "Запуск PostgreSQL...");
        sudo_run(&["systemctl", "start", "postgresql"], password);
    } else {
        let _ = window.emit("install-log", "PostgreSQL уже запущен.");
    }

    Ok(())
}