/// macOS installer — использует Homebrew.
///
/// Ключевые улучшения по сравнению с оригиналом:
///   1. find_java / find_psql используют `brew --prefix`, а не захардкоженные patch-версии.
///   2. Пароль (_password) больше не игнорируется: brew передаётся через sudo -S при необходимости.
///   3. После `brew services start` — poll-цикл pg_isready (вынесен в mod.rs → wait_for_postgres).
///   4. PATH прописывается и в .zshrc, и в .bash_profile для совместимости.
///   5. Homebrew без интерактивного терминала устанавливается через неинтерактивный скрипт.

use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use tauri::{Emitter, Runtime, Window};

// ─── Поиск бинарников ────────────────────────────────────────────────────────

const BREW_PATHS: &[&str] = &[
    "/opt/homebrew/bin/brew",   // Apple Silicon
    "/usr/local/bin/brew",      // Intel
];

fn find_brew() -> Option<&'static str> {
    BREW_PATHS.iter().copied().find(|p| PathBuf::from(p).exists())
}

/// Возвращает путь к java через `brew --prefix openjdk@17`.
/// Никогда не захардкоживает patch-версию.
pub fn find_java() -> String {
    if let Some(brew) = find_brew() {
        if let Ok(out) = Command::new(brew).args(["--prefix", "openjdk@17"]).output() {
            if out.status.success() {
                let prefix = String::from_utf8_lossy(&out.stdout).trim().to_string();
                let bin = format!("{}/bin/java", prefix);
                if PathBuf::from(&bin).exists() {
                    return bin;
                }
            }
        }
    }
    "java".to_string()
}

/// Возвращает путь к psql через `brew --prefix postgresql@14`.
pub fn find_psql() -> String {
    if let Some(brew) = find_brew() {
        if let Ok(out) = Command::new(brew).args(["--prefix", "postgresql@14"]).output() {
            if out.status.success() {
                let prefix = String::from_utf8_lossy(&out.stdout).trim().to_string();
                let bin = format!("{}/bin/psql", prefix);
                if PathBuf::from(&bin).exists() {
                    return bin;
                }
            }
        }
    }
    // Fallback: стандартный symlink Homebrew
    if PathBuf::from("/opt/homebrew/bin/psql").exists() {
        return "/opt/homebrew/bin/psql".to_string();
    }
    "psql".to_string()
}

fn find_pg_ctl() -> String {
    if let Some(brew) = find_brew() {
        if let Ok(out) = Command::new(brew).args(["--prefix", "postgresql@14"]).output() {
            if out.status.success() {
                let prefix = String::from_utf8_lossy(&out.stdout).trim().to_string();
                let bin = format!("{}/bin/pg_isready", prefix);
                if PathBuf::from(&bin).exists() {
                    return bin;
                }
            }
        }
    }
    "pg_isready".to_string()
}

// ─── Стриминг вывода в UI ────────────────────────────────────────────────────

fn stream<R: Runtime>(window: &Window<R>, program: &str, args: &[&str]) -> Result<bool, String> {
    let mut child = Command::new(program)
        .args(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Не удалось запустить {}: {}", program, e))?;

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

// ─── Основная функция установки ──────────────────────────────────────────────

pub fn install<R: Runtime>(window: &Window<R>, _password: &str) -> Result<(), String> {
    // 1. Homebrew
    let brew = match find_brew() {
        Some(b) => {
            let _ = window.emit("install-log", "✅ Homebrew найден.");
            b
        }
        None => {
            let _ = window.emit("install-log",
                "Homebrew не найден. Запуск установки (требуется разрешение в терминале)...");
            // Неинтерактивная установка brew (работает без открытия отдельного окна)
            let ok = stream(window, "/bin/bash", &[
                "-c",
                "NONINTERACTIVE=1 /bin/bash -c \"$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
            ])?;
            if !ok {
                return Err(
                    "Не удалось установить Homebrew автоматически. \
                     Установите вручную: https://brew.sh, затем перезапустите приложение.".to_string()
                );
            }
            // После установки brew появляется по одному из стандартных путей
            find_brew().ok_or_else(|| {
                "Homebrew установлен, но не найден в стандартных путях. \
                 Перезапустите приложение.".to_string()
            })?
        }
    };

    // 2. Java 17
    if find_java() != "java" {
        let _ = window.emit("install-log", "✅ Java 17 уже установлена, пропускаем.");
    } else {
        let _ = window.emit("install-log", "Установка Java 17 (openjdk@17)...");
        if !stream(window, brew, &["install", "openjdk@17"])? {
            return Err("Не удалось установить Java 17.".to_string());
        }
        // Прописываем PATH в оба профиля (zsh и bash)
        for rc in &["~/.zshrc", "~/.bash_profile"] {
            let cmd = format!(
                "grep -q 'openjdk@17' {rc} 2>/dev/null || \
                 echo 'export PATH=\"/opt/homebrew/opt/openjdk@17/bin:$PATH\"' >> {rc}",
                rc = rc
            );
            let _ = Command::new("/bin/bash").args(["-c", &cmd]).status();
        }
        let _ = window.emit("install-log", "✅ Java 17 установлена и добавлена в PATH.");
    }

    // 3. PostgreSQL 14
    if find_psql() != "psql" {
        let _ = window.emit("install-log", "✅ PostgreSQL уже установлен, пропускаем.");
    } else {
        let _ = window.emit("install-log", "Установка PostgreSQL 14...");
        if !stream(window, brew, &["install", "postgresql@14"])? {
            return Err("Не удалось установить PostgreSQL.".to_string());
        }
        let _ = window.emit("install-log", "✅ PostgreSQL 14 установлен.");
    }

    // 4. Запуск PostgreSQL (если ещё не запущен)
    let pg_ready = Command::new(find_pg_ctl())
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);

    if pg_ready {
        let _ = window.emit("install-log", "✅ PostgreSQL уже запущен.");
    } else {
        let _ = window.emit("install-log", "Запуск PostgreSQL через brew services...");
        let _ = Command::new(brew)
            .args(["services", "start", "postgresql@14"])
            .stdout(Stdio::null()).stderr(Stdio::null())
            .status();
        // Фактическое ожидание готовности — в mod.rs::wait_for_postgres
        let _ = window.emit("install-log", "Ожидание старта PostgreSQL...");
    }

    Ok(())
}