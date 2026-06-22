/// Windows installer — использует winget.
///
/// Ключевые улучшения по сравнению с оригиналом:
///   1. Явная версия PostgreSQL 14 в winget (--version 14).
///   2. find_psql ищет реальный путь установки, а не полагается на PATH текущего процесса.
///   3. Имя сервиса postgresql определяется динамически через `sc query`.
///   4. winget самоустановка заменена на понятное сообщение пользователю.
///   5. Ожидание запуска PostgreSQL — в mod.rs::wait_for_postgres.

use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use tauri::{Emitter, Runtime, Window};

// ─── Поиск бинарников ────────────────────────────────────────────────────────

/// Ищет psql.exe в стандартных путях установки PostgreSQL.
/// Проверяет версии 14, 15, 16 в порядке убывания приоритета.
pub fn find_psql() -> String {
    let program_files = std::env::var("PROGRAMFILES")
        .unwrap_or_else(|_| r"C:\Program Files".to_string());

    for version in &["14", "15", "16", "13"] {
        let candidate = PathBuf::from(&program_files)
            .join(format!("PostgreSQL\\{}\\bin\\psql.exe", version));
        if candidate.exists() {
            return candidate.to_string_lossy().to_string();
        }
    }
    "psql".to_string()
}

/// Ищет pg_isready.exe рядом с psql.exe.
fn find_pg_isready() -> String {
    let psql = find_psql();
    if psql != "psql" {
        let ready = PathBuf::from(&psql)
            .parent().unwrap_or_else(|| std::path::Path::new(""))
            .join("pg_isready.exe");
        if ready.exists() {
            return ready.to_string_lossy().to_string();
        }
    }
    "pg_isready".to_string()
}

// ─── Стриминг вывода в UI ────────────────────────────────────────────────────

fn stream<R: Runtime>(window: &Window<R>, args: &[&str]) -> Result<bool, String> {
    let mut child = Command::new("cmd")
        .args(["/C"].iter().chain(args.iter()).copied().collect::<Vec<_>>())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Не удалось запустить команду: {}", e))?;

    if let Some(out) = child.stdout.take() {
        let w = window.clone();
        std::thread::spawn(move || {
            for line in BufReader::new(out).lines().flatten() {
                let _ = w.emit("install-log", line);
            }
        });
    }
    if let Some(err) = child.stderr.take() {
        let w = window.clone();
        std::thread::spawn(move || {
            for line in BufReader::new(err).lines().flatten() {
                let _ = w.emit("install-log", line);
            }
        });
    }

    child.wait().map(|s| s.success()).map_err(|e| e.to_string())
}

fn cmd_ok(args: &[&str]) -> bool {
    Command::new("cmd")
        .args(["/C"].iter().chain(args.iter()).copied().collect::<Vec<_>>())
        .stdout(Stdio::null()).stderr(Stdio::null())
        .status().map(|s| s.success()).unwrap_or(false)
}

// ─── Имя сервиса PostgreSQL ───────────────────────────────────────────────────

/// Определяет имя Windows-сервиса PostgreSQL через `sc query`.
/// winget регистрирует сервис как `postgresql-x64-14` (или другую версию).
fn find_pg_service_name() -> Option<String> {
    let out = Command::new("cmd")
        .args(["/C", "sc", "query", "type=", "all", "state=", "all"])
        .output().ok()?;
    let text = String::from_utf8_lossy(&out.stdout).to_lowercase();

    for line in text.lines() {
        if line.contains("service_name") && line.contains("postgresql") {
            // Строка вида: "service_name: postgresql-x64-14"
            if let Some(name) = line.split(':').nth(1) {
                return Some(name.trim().to_string());
            }
        }
    }
    None
}

// ─── Основная функция установки ──────────────────────────────────────────────

pub fn install<R: Runtime>(window: &Window<R>, _password: &str) -> Result<(), String> {
    // 1. Проверяем winget
    let winget_ok = cmd_ok(&["winget", "--version"]);
    if !winget_ok {
        return Err(
            "winget не найден. Установите 'App Installer' из Microsoft Store \
             (https://aka.ms/getwinget), затем перезапустите приложение.".to_string()
        );
    }
    let _ = window.emit("install-log", "✅ winget найден.");

    // 2. Java 17
    let java_ok = Command::new("cmd")
        .args(["/C", "java", "-version"])
        .output()
        .map(|o| {
            let s = format!(
                "{}{}",
                String::from_utf8_lossy(&o.stderr),
                String::from_utf8_lossy(&o.stdout)
            );
            s.contains("\"17") || s.contains("openjdk 17")
        })
        .unwrap_or(false);

    if java_ok {
        let _ = window.emit("install-log", "✅ Java 17 уже установлена, пропускаем.");
    } else {
        let _ = window.emit("install-log", "Установка Java 17 (Microsoft OpenJDK 17)...");
        if !stream(window, &[
            "winget", "install", "-e", "--id", "Microsoft.OpenJDK.17",
            "--version", "17",
            "--silent",
            "--accept-package-agreements",
            "--accept-source-agreements",
        ])? {
            return Err("Не удалось установить Java 17 через winget.".to_string());
        }
        let _ = window.emit("install-log", "✅ Java 17 установлена.");
    }

    // 3. PostgreSQL 14
    let pg_installed = find_psql() != "psql";
    if pg_installed {
        let _ = window.emit("install-log", "✅ PostgreSQL уже установлен, пропускаем.");
    } else {
        let _ = window.emit("install-log", "Установка PostgreSQL 14...");
        if !stream(window, &[
            "winget", "install", "-e", "--id", "PostgreSQL.PostgreSQL",
            "--version", "14",
            "--silent",
            "--accept-package-agreements",
            "--accept-source-agreements",
        ])? {
            return Err("Не удалось установить PostgreSQL через winget.".to_string());
        }
        let _ = window.emit("install-log", "✅ PostgreSQL 14 установлен.");
    }

    // 4. Запуск сервиса
    // После winget-установки PATH текущего процесса устарел — используем find_psql() по пути файла
    let pg_running = Command::new(find_pg_isready())
        .output().map(|o| o.status.success()).unwrap_or(false);

    if pg_running {
        let _ = window.emit("install-log", "✅ PostgreSQL уже запущен.");
        return Ok(());
    }

    let _ = window.emit("install-log", "Запуск сервиса PostgreSQL...");

    // Определяем имя сервиса динамически
    let service = find_pg_service_name()
        .unwrap_or_else(|| "postgresql-x64-14".to_string());

    let _ = window.emit("install-log", &format!("Имя сервиса: {}", service));

    let started = cmd_ok(&["sc", "start", &service])
        || cmd_ok(&["net", "start", &service]);

    if !started {
        return Err(format!(
            "Не удалось запустить сервис '{}'. \
             Попробуйте вручную: sc start {} или перезагрузите компьютер.",
            service, service
        ));
    }

    let _ = window.emit("install-log", "✅ Сервис PostgreSQL запущен.");
    Ok(())
}