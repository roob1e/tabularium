use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};
use tauri::{Emitter, Runtime, Window};

fn find_brew() -> &'static str {
    if std::path::Path::new("/opt/homebrew/bin/brew").exists() {
        "/opt/homebrew/bin/brew"
    } else {
        "brew"
    }
}

pub fn find_java() -> &'static str {
    if std::path::Path::new("/opt/homebrew/opt/openjdk@17/bin/java").exists() {
        "/opt/homebrew/opt/openjdk@17/bin/java"
    } else if std::path::Path::new("/opt/homebrew/Cellar/openjdk@17/17.0.18/bin/java").exists() {
        "/opt/homebrew/Cellar/openjdk@17/17.0.18/bin/java"
    } else {
        "java"
    }
}

pub fn find_psql() -> &'static str {
    if std::path::Path::new("/opt/homebrew/bin/psql").exists() {
        "/opt/homebrew/bin/psql"
    } else if std::path::Path::new("/opt/homebrew/Cellar/postgresql@14/14.22/bin/psql").exists() {
        "/opt/homebrew/Cellar/postgresql@14/14.22/bin/psql"
    } else {
        "psql"
    }
}

fn find_pg_isready() -> &'static str {
    if std::path::Path::new("/opt/homebrew/bin/pg_isready").exists() {
        "/opt/homebrew/bin/pg_isready"
    } else if std::path::Path::new("/opt/homebrew/Cellar/postgresql@14/14.22/bin/pg_isready").exists() {
        "/opt/homebrew/Cellar/postgresql@14/14.22/bin/pg_isready"
    } else {
        "pg_isready"
    }
}

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

pub fn install<R: Runtime>(window: &Window<R>, _password: &str) -> Result<(), String> {
    let _ = window.emit("install-log", "Проверка Homebrew...");

    let brew = find_brew();
    if !Command::new(brew).arg("--version").status().map(|s| s.success()).unwrap_or(false) {
        let _ = window.emit("install-log", "Homebrew не найден. Открываем Terminal...");
        let status = Command::new("osascript")
            .args(["-e", r#"tell application "Terminal"
                activate
                do script "/bin/bash -c \"$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
            end tell"#])
            .status().map_err(|e| e.to_string())?;
        if !status.success() {
            return Err("Не удалось открыть Terminal. Установите Homebrew вручную: https://brew.sh".to_string());
        }
        return Err("Установите Homebrew в открывшемся терминале, затем перезапустите приложение.".to_string());
    }

    if find_java() != "java" {
        let _ = window.emit("install-log", "Java 17 уже установлена, пропускаем.");
    } else {
        let _ = window.emit("install-log", "Установка Java 17...");
        if !stream(window, brew, &["install", "openjdk@17"])? {
            return Err("Не удалось установить Java 17".to_string());
        }
    }

    let _ = Command::new("/bin/bash")
        .args(["-c", "grep -q 'openjdk@17' ~/.zshrc || echo 'export PATH=\"/opt/homebrew/opt/openjdk@17/bin:$PATH\"' >> ~/.zshrc"])
        .status();
    let _ = window.emit("install-log", "Java 17 добавлена в PATH.");

    if find_psql() != "psql" {
        let _ = window.emit("install-log", "PostgreSQL уже установлен, пропускаем.");
    } else {
        let _ = window.emit("install-log", "Установка PostgreSQL...");
        if !stream(window, brew, &["install", "postgresql@14"])? {
            return Err("Не удалось установить PostgreSQL".to_string());
        }
    }

    let pg_running = Command::new(find_pg_isready())
        .output().map(|o| o.status.success()).unwrap_or(false);

    if !pg_running {
        let _ = window.emit("install-log", "Запуск PostgreSQL...");
        let _ = Command::new(brew).args(["services", "start", "postgresql@14"]).output();
        let _ = window.emit("install-log", "PostgreSQL запущен.");
    } else {
        let _ = window.emit("install-log", "PostgreSQL уже запущен.");
    }

    Ok(())
}