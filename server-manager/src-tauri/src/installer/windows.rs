#![cfg(target_os = "windows")]

use std::io::{BufRead, BufReader};
use std::os::windows::process::CommandExt;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use tauri::{Emitter, Runtime, Window};

const CREATE_NO_WINDOW: u32 = 0x08000000;

// ─── Поиск бинарников ────────────────────────────────────────────────────────

pub fn find_psql() -> String {
    let pf = std::env::var("PROGRAMFILES").unwrap_or_else(|_| r"C:\Program Files".to_string());
    for v in &["14", "15", "16", "13"] {
        let p = PathBuf::from(&pf).join(format!(r"PostgreSQL\{}\bin\psql.exe", v));
        if p.exists() { return p.to_string_lossy().to_string(); }
    }
    // Chocolatey ставит в другое место
    let choco_pg = PathBuf::from(r"C:\ProgramData\chocolatey\lib\postgresql18\tools\pgsql\bin\psql.exe");
    if choco_pg.exists() { return choco_pg.to_string_lossy().to_string(); }
    "psql".to_string()
}

pub fn find_java() -> String {
    let pf = std::env::var("PROGRAMFILES").unwrap_or_else(|_| r"C:\Program Files".to_string());
    let candidates = [
        format!(r"{}\Microsoft\jdk-17.0\bin\java.exe", pf),
        format!(r"{}\Microsoft\jdk-17\bin\java.exe", pf),
        format!(r"{}\Eclipse Adoptium\jdk-17\bin\java.exe", pf),
        format!(r"{}\Java\jdk-17\bin\java.exe", pf),
    ];
    for p in &candidates {
        if PathBuf::from(p).exists() { return p.clone(); }
    }
    let ms = PathBuf::from(&pf).join("Microsoft");
    if let Ok(entries) = std::fs::read_dir(&ms) {
        for e in entries.flatten() {
            let p = e.path();
            if p.file_name().and_then(|n| n.to_str()).unwrap_or("").starts_with("jdk-17") {
                let java = p.join("bin").join("java.exe");
                if java.exists() { return java.to_string_lossy().to_string(); }
            }
        }
    }
    "java".to_string()
}

fn find_choco() -> Option<String> {
    // Стандартный путь после установки
    let pd = std::env::var("ProgramData").unwrap_or_else(|_| r"C:\ProgramData".to_string());
    let p = PathBuf::from(&pd).join(r"chocolatey\bin\choco.exe");
    if p.exists() { return Some(p.to_string_lossy().to_string()); }
    // Возможно уже в PATH
    if cmd_ok("choco", &["--version"]) { return Some("choco".to_string()); }
    None
}

pub fn find_pg_isready_pub() -> String {
    find_pg_isready()
}

fn find_pg_isready() -> String {
    let pf = std::env::var("PROGRAMFILES").unwrap_or_else(|_| r"C:\Program Files".to_string());
    for v in &["14", "15", "16", "13"] {
        let p = PathBuf::from(&pf).join(format!(r"PostgreSQL\{}\bin\pg_isready.exe", v));
        if p.exists() { return p.to_string_lossy().to_string(); }
    }
    "pg_isready".to_string()
}

// ─── Вспомогательные функции ─────────────────────────────────────────────────

fn stream<R: Runtime>(window: &Window<R>, program: &str, args: &[&str]) -> Result<bool, String> {
    let mut child = Command::new(program)
        .args(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
        .map_err(|e| format!("Не удалось запустить '{}': {}", program, e))?;

    if let Some(out) = child.stdout.take() {
        let w = window.clone();
        std::thread::spawn(move || {
            for line in BufReader::new(out).lines().flatten() { let _ = w.emit("install-log", line); }
        });
    }
    if let Some(err) = child.stderr.take() {
        let w = window.clone();
        std::thread::spawn(move || {
            for line in BufReader::new(err).lines().flatten() { let _ = w.emit("install-log", line); }
        });
    }
    child.wait()
        .map(|s: std::process::ExitStatus| s.success())
        .map_err(|e: std::io::Error| e.to_string())
}

fn cmd_ok(program: &str, args: &[&str]) -> bool {
    Command::new(program)
        .args(args)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .creation_flags(CREATE_NO_WINDOW)
        .status()
        .map(|s: std::process::ExitStatus| s.success())
        .unwrap_or(false)
}

fn find_pg_service_name() -> Option<String> {
    let out = Command::new("sc")
        .args(["query", "type=", "all", "state=", "all"])
        .creation_flags(CREATE_NO_WINDOW)
        .output().ok()?;
    let text = String::from_utf8_lossy(&out.stdout).to_lowercase();
    for line in text.lines() {
        if line.contains("service_name") && line.contains("postgresql") {
            if let Some(name) = line.split(':').nth(1) {
                return Some(name.trim().to_string());
            }
        }
    }
    None
}

/// Устанавливает PostgreSQL 18 напрямую через exe-установщик.
/// EDB CDN и Chocolatey используют CloudFront, который блокирует СНГ.
/// Используем зеркала которые не зависят от CloudFront.
fn install_postgres_direct<R: Runtime>(window: &Window<R>) -> Result<(), String> {
    let candidates_names = [
        "postgresql-18-windows-x64.exe",
        "pg18_setup.exe",
        "postgresql_installer.exe",
    ];

    // Папки для поиска: рядом с exe (prod) и корень проекта (dev)
    let mut search_dirs: Vec<PathBuf> = Vec::new();

    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            search_dirs.push(dir.to_path_buf());
        }
    }
    // CARGO_MANIFEST_DIR — корень проекта, доступен в dev-режиме
    if let Ok(manifest) = std::env::var("CARGO_MANIFEST_DIR") {
        search_dirs.push(PathBuf::from(&manifest));
        // Корень всего монорепо (на уровень выше server-manager)
        if let Some(parent) = PathBuf::from(&manifest).parent() {
            search_dirs.push(parent.to_path_buf());
        }
    }

    for dir in &search_dirs {
        for name in &candidates_names {
            let path = dir.join(name);
            if path.exists() {
                let _ = window.emit("install-log", &format!("Найден установщик: {}", path.display()));
                return run_pg_installer(window, path.to_str().unwrap_or(""));
            }
        }
    }

    Err(format!(
        "Установщик PostgreSQL не найден.\n\
         Положите файл в одну из папок:\n\
         {}\n\n\
         Допустимые имена файла:\n\
         - postgresql-18-windows-x64.exe\n\
         - pg18_setup.exe\n\
         - postgresql_installer.exe\n\n\
         Скачать: https://www.postgresql.org/download/windows/",
        search_dirs.iter()
            .map(|d| format!("  - {}", d.display()))
            .collect::<Vec<_>>()
            .join("\n")
    ))
}

fn run_pg_installer<R: Runtime>(window: &Window<R>, path: &str) -> Result<(), String> {
    let _ = window.emit("install-log", "Запуск установщика PostgreSQL...");
    let ok = stream(window, path, &[
        "--mode", "unattended",
        "--unattendedmodeui", "none",
        "--superpassword", "postgres",
        "--servicename", "postgresql-x64-18",
        "--servicepassword", "postgres",
        "--serverport", "5432",
    ])?;
    if !ok {
        return Err("Установщик PostgreSQL завершился с ошибкой.".to_string());
    }
    Ok(())
}

/// Находит choco.exe или устанавливает Chocolatey через PowerShell.
fn find_or_install_choco<R: Runtime>(window: &Window<R>) -> Result<String, String> {
    if let Some(choco) = find_choco() {
        let _ = window.emit("install-log", "✅ Chocolatey найден.");
        return Ok(choco);
    }

    let _ = window.emit("install-log", "Chocolatey не найден. Установка...");
    let script = "$ProgressPreference='SilentlyContinue'; \
        Set-ExecutionPolicy Bypass -Scope Process -Force; \
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; \
        iex ((New-Object Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))";

    let ok = stream(window, "powershell", &[
        "-NoProfile", "-NonInteractive", "-Command", script,
    ])?;

    if !ok {
        return Err("Не удалось установить Chocolatey. \
                    Установите вручную: https://chocolatey.org/install".to_string());
    }

    let pd = std::env::var("ProgramData").unwrap_or_else(|_| r"C:\ProgramData".to_string());
    let choco = format!(r"{}\chocolatey\bin\choco.exe", pd);
    if PathBuf::from(&choco).exists() {
        let _ = window.emit("install-log", "✅ Chocolatey установлен.");
        return Ok(choco);
    }

    Err("Chocolatey установлен, но choco.exe не найден. Перезапустите приложение.".to_string())
}

// ─── Основная функция установки ──────────────────────────────────────────────

pub fn install<R: Runtime>(window: &Window<R>, _password: &str) -> Result<(), String> {
    // 1. winget
    if !cmd_ok("winget", &["--version"]) {
        return Err("winget не найден. Установите 'App Installer' из Microsoft Store \
                    (https://aka.ms/getwinget), затем перезапустите приложение.".to_string());
    }
    let _ = window.emit("install-log", "✅ winget найден.");

    // 2. Java 17 — через winget, их CDN работает нормально
    let java_bin = find_java();
    let java_ok = Command::new(&java_bin)
        .arg("-version")
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map(|o| {
            let s = format!("{}{}", String::from_utf8_lossy(&o.stderr), String::from_utf8_lossy(&o.stdout));
            s.contains("\"17") || s.contains("openjdk 17")
        })
        .unwrap_or(false);

    if java_ok {
        let _ = window.emit("install-log", "✅ Java 17 уже установлена, пропускаем.");
    } else {
        let _ = window.emit("install-log", "Установка Java 17 (Microsoft OpenJDK 17)...");
        if !stream(window, "winget", &[
            "install", "-e", "--id", "Microsoft.OpenJDK.17",
            "--silent", "--accept-package-agreements", "--accept-source-agreements",
        ])? {
            return Err("Не удалось установить Java 17 через winget.".to_string());
        }
        let _ = window.emit("install-log", "✅ Java 17 установлена.");
    }

    // 3. PostgreSQL 18 — прямая установка через exe
    if find_psql() != "psql" {
        let _ = window.emit("install-log", "✅ PostgreSQL уже установлен, пропускаем.");
    } else {
        let _ = window.emit("install-log", "Установка PostgreSQL 18...");
        install_postgres_direct(window)?;
        let _ = window.emit("install-log", "✅ PostgreSQL 18 установлен.");
    }

    // 4. Запуск сервиса PostgreSQL
    let pg_running = Command::new(find_pg_isready())
        .creation_flags(CREATE_NO_WINDOW)
        .output().map(|o| o.status.success()).unwrap_or(false);

    if pg_running {
        let _ = window.emit("install-log", "✅ PostgreSQL уже запущен.");
    } else {
        let _ = window.emit("install-log", "Запуск сервиса PostgreSQL...");
        let service = find_pg_service_name().unwrap_or_else(|| "postgresql-x64-18".to_string());
        let _ = window.emit("install-log", &format!("Имя сервиса: {}", service));

        // Ставим автозапуск — инсталлер уже от админа, поэтому sc config сработает
        cmd_ok("sc", &["config", &service, "start=", "auto"]);

        let started = cmd_ok("sc", &["start", &service])
            || cmd_ok("net", &["start", &service]);

        if !started {
            return Err(format!(
                "Не удалось запустить сервис '{}'. Попробуйте вручную: sc start {}",
                service, service
            ));
        }
        let _ = window.emit("install-log", "✅ Сервис PostgreSQL запущен и настроен на автозапуск.");
    }

    let _ = window.emit("install-log", "✅ Сервис PostgreSQL запущен.");
    Ok(())
}