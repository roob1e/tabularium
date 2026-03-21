use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};
use tauri::{Emitter, Runtime, Window};

fn stream<R: Runtime>(window: &Window<R>, program: &str, args: &[&str]) -> Result<bool, String> {
    let mut child = Command::new(program)
        .args(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;

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

    Ok(child.wait().map_err(|e| e.to_string())?.success())
}

pub fn find_psql() -> &'static str {
    "psql"
}

pub fn install<R: Runtime>(window: &Window<R>, _password: &str) -> Result<(), String> {
    let winget_ok = Command::new("cmd")
        .args(["/C", "winget", "--version"])
        .status().map(|s| s.success()).unwrap_or(false);

    if !winget_ok {
        let _ = window.emit("install-log", "winget не найден, устанавливаем...");
        let ps = r#"$url = 'https://aka.ms/getwinget'; $out = "$env:TEMP\winget.msixbundle"; Invoke-WebRequest -Uri $url -OutFile $out; Add-AppxPackage -Path $out"#;
        let status = Command::new("powershell")
            .args(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", ps])
            .status().map_err(|e| e.to_string())?;
        if !status.success() {
            return Err("Не удалось установить winget. Установите App Installer из Microsoft Store.".to_string());
        }
        let _ = window.emit("install-log", "winget установлен.");
    }

    let java_ok = Command::new("cmd").args(["/C", "java", "-version"]).output()
        .map(|o| {
            let s = format!("{}{}", String::from_utf8_lossy(&o.stderr), String::from_utf8_lossy(&o.stdout));
            s.contains("17")
        }).unwrap_or(false);

    if java_ok {
        let _ = window.emit("install-log", "Java 17 уже установлена, пропускаем.");
    } else {
        let _ = window.emit("install-log", "Установка Java 17...");
        if !stream(window, "cmd", &["/C", "winget", "install", "-e", "--id",
            "Microsoft.OpenJDK.17", "--silent", "--accept-package-agreements",
            "--accept-source-agreements"])? {
            return Err("Ошибка установки Java 17".to_string());
        }
    }

    let pg_ok = Command::new("cmd").args(["/C", "psql", "--version"])
        .status().map(|s| s.success()).unwrap_or(false);

    if pg_ok {
        let _ = window.emit("install-log", "PostgreSQL уже установлен, пропускаем.");
    } else {
        let _ = window.emit("install-log", "Установка PostgreSQL...");
        if !stream(window, "cmd", &["/C", "winget", "install", "-e", "--id",
            "PostgreSQL.PostgreSQL", "--silent", "--accept-package-agreements",
            "--accept-source-agreements"])? {
            return Err("Ошибка установки PostgreSQL".to_string());
        }
        let _ = window.emit("install-log", "Запуск службы PostgreSQL...");
        let _ = Command::new("cmd").args(["/C", "sc", "start", "postgresql"]).status();
    }

    Ok(())
}