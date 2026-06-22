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
    // Glob: ищем jdk-17* в Program Files\Microsoft
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

fn find_pg_isready() -> String {
    let psql = find_psql();
    if psql != "psql" {
        let p = PathBuf::from(&psql).parent()
            .unwrap_or_else(|| std::path::Path::new(""))
            .join("pg_isready.exe");
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

// ─── Основная функция установки ──────────────────────────────────────────────

pub fn install<R: Runtime>(window: &Window<R>, _password: &str) -> Result<(), String> {
    // 1. Проверяем winget
    if !cmd_ok("winget", &["--version"]) {
        return Err("winget не найден. Установите 'App Installer' из Microsoft Store \
                    (https://aka.ms/getwinget), затем перезапустите приложение.".to_string());
    }
    let _ = window.emit("install-log", "✅ winget найден.");

    // 2. Java 17
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
            "--version", "17", "--silent",
            "--accept-package-agreements", "--accept-source-agreements",
        ])? {
            return Err("Не удалось установить Java 17 через winget.".to_string());
        }
        let _ = window.emit("install-log", "✅ Java 17 установлена.");
    }

    // 3. PostgreSQL 14
    if find_psql() != "psql" {
        let _ = window.emit("install-log", "✅ PostgreSQL уже установлен, пропускаем.");
    } else {
        let _ = window.emit("install-log", "Установка PostgreSQL 14...");
        if !stream(window, "winget", &[
            "install", "-e", "--id", "PostgreSQL.PostgreSQL",
            "--version", "14", "--silent",
            "--accept-package-agreements", "--accept-source-agreements",
        ])? {
            return Err("Не удалось установить PostgreSQL через winget.".to_string());
        }
        let _ = window.emit("install-log", "✅ PostgreSQL 14 установлен.");
    }

    // 4. Запуск сервиса PostgreSQL
    let pg_running = Command::new(find_pg_isready())
        .creation_flags(CREATE_NO_WINDOW)
        .output().map(|o| o.status.success()).unwrap_or(false);

    if pg_running {
        let _ = window.emit("install-log", "✅ PostgreSQL уже запущен.");
        return Ok(());
    }

    let _ = window.emit("install-log", "Запуск сервиса PostgreSQL...");
    let service = find_pg_service_name().unwrap_or_else(|| "postgresql-x64-14".to_string());
    let _ = window.emit("install-log", &format!("Имя сервиса: {}", service));

    let started = cmd_ok("sc", &["start", &service])
        || cmd_ok("net", &["start", &service]);

    if !started {
        return Err(format!(
            "Не удалось запустить сервис '{}'. Попробуйте вручную: sc start {}",
            service, service
        ));
    }

    let _ = window.emit("install-log", "✅ Сервис PostgreSQL запущен.");
    // Ожидание готовности и настройка БД — в mod.rs::setup_database
    Ok(())
}