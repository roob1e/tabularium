use std::process::Command;
use tauri::{Runtime, Window, Emitter};

#[tauri::command]
pub async fn check_dependencies() -> Result<bool, String> {
    let java_cmd = if cfg!(target_os = "windows") {
        Command::new("cmd").args(["/C", "java -version"]).output()
    } else {
        Command::new("java").arg("-version").output()
    };

    let java_ok = match java_cmd {
        Ok(out) => {
            let s = String::from_utf8_lossy(&out.stderr);
            s.contains("17") || s.contains("build 17")
        },
        _ => false,
    };

    let pg_ok = if cfg!(target_os = "windows") {
        Command::new("cmd").args(["/C", "psql --version"]).status().map(|s| s.success()).unwrap_or(false)
    } else {
        // На macOS проверяем стандартный путь brew, если psql не в PATH
        Command::new("psql").arg("--version").status()
            .or_else(|_| Command::new("/opt/homebrew/bin/psql").arg("--version").status())
            .map(|s| s.success()).unwrap_or(false)
    };

    Ok(java_ok && pg_ok)
}

#[tauri::command]
pub async fn install_all<R: Runtime>(window: Window<R>) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let components = [
            ("Microsoft.OpenJDK.17", "Java 17"),
            ("PostgreSQL.PostgreSQL", "PostgreSQL"),
        ];
        for (id, name) in components {
            let _ = window.emit("install-log", format!("Установка {}...", name));
            let status = Command::new("cmd")
                .args(["/C", "winget", "install", "-e", "--id", id, "--silent", "--accept-package-agreements", "--accept-source-agreements"])
                .status()
                .map_err(|e| e.to_string())?;
            if !status.success() { return Err(format!("Ошибка установки {}", name)); }
        }
    }

    #[cfg(target_os = "macos")]
    {
        let _ = window.emit("install-log", "Проверка Homebrew...");
        if !Command::new("brew").arg("--version").status().is_ok() {
            return Err("Homebrew не найден. Установите его с brew.sh".to_string());
        }
        let components = [("openjdk@17", "Java 17"), ("postgresql@14", "PostgreSQL")];
        for (id, name) in components {
            let _ = window.emit("install-log", format!("Установка {}...", name));
            let status = Command::new("brew").args(["install", id]).status().map_err(|e| e.to_string())?;
            if !status.success() { return Err(format!("Не удалось установить {}", name)); }
        }
        let _ = Command::new("brew").args(["services", "start", "postgresql@14"]).status();
    }

    #[cfg(target_os = "linux")]
    {
        let _ = window.emit("install-log", "Обновление пакетов (нужен пароль)...");
        let auth = Command::new("pkexec").args(["apt-get", "update", "-y"]).status().map_err(|e| e.to_string())?;
        if !auth.success() { return Err("Отказ в аутентификации".to_string()); }
        let components = [("openjdk-17-jdk", "Java 17"), ("postgresql", "PostgreSQL")];
        for (id, name) in components {
            let _ = window.emit("install-log", format!("Установка {}...", name));
            Command::new("pkexec").args(["apt-get", "install", "-y", id]).status().map_err(|e| e.to_string())?;
        }
        let _ = Command::new("pkexec").args(["systemctl", "start", "postgresql"]).status();
    }

    let _ = window.emit("install-log", "Настройка базы данных...");

    // Используем скрипт, который создает базу только если её нет
    let check_db_script = "SELECT 1 FROM pg_database WHERE datname = 'students_db'";
    let create_db_script = "CREATE DATABASE students_db";

    let psql_bin = if cfg!(target_os = "macos") { "/opt/homebrew/bin/psql" } else { "psql" };

    let exists = Command::new(psql_bin)
        .args(["-U", "postgres", "-tAc", check_db_script])
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim() == "1")
        .unwrap_or(false);

    if !exists {
        let _ = Command::new(psql_bin)
            .args(["-U", "postgres", "-c", create_db_script])
            .status();
        let _ = window.emit("install-log", "База данных создана.");
    } else {
        let _ = window.emit("install-log", "База данных уже существует, пропускаем.");
    }

    let _ = window.emit("install-log", "Все компоненты готовы!");
    Ok(())
}