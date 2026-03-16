 use std::io::Write;
 use std::process::Command;
 use tauri::{Emitter, Runtime, Window};

 fn find_psql() -> &'static str {
     if std::path::Path::new("/opt/homebrew/bin/psql").exists() {
         "/opt/homebrew/bin/psql"
     } else if std::path::Path::new("/opt/homebrew/Cellar/postgresql@14/14.22/bin/psql").exists() {
         "/opt/homebrew/Cellar/postgresql@14/14.22/bin/psql"
     } else {
         "psql"
     }
 }

 fn find_java() -> &'static str {
     if std::path::Path::new("/opt/homebrew/opt/openjdk@17/bin/java").exists() {
         "/opt/homebrew/opt/openjdk@17/bin/java"
     } else if std::path::Path::new("/opt/homebrew/Cellar/openjdk@17/17.0.18/bin/java").exists() {
         "/opt/homebrew/Cellar/openjdk@17/17.0.18/bin/java"
     } else {
         "java"
     }
 }

 fn find_brew() -> &'static str {
     if std::path::Path::new("/opt/homebrew/bin/brew").exists() {
         "/opt/homebrew/bin/brew"
     } else {
         "brew"
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

 #[tauri::command]
 pub async fn check_dependencies() -> Result<bool, String> {
     let java_ok = if cfg!(target_os = "windows") {
         Command::new("cmd").args(["/C", "java -version"]).output()
             .map(|o| {
                 let s = format!("{}{}", String::from_utf8_lossy(&o.stderr), String::from_utf8_lossy(&o.stdout));
                 s.contains("17")
             })
             .unwrap_or(false)
     } else {
         Command::new(find_java()).arg("-version").output()
             .map(|o| {
                 let s = format!("{}{}", String::from_utf8_lossy(&o.stderr), String::from_utf8_lossy(&o.stdout));
                 s.contains("17")
             })
             .unwrap_or(false)
     };

     let pg_ok = if cfg!(target_os = "windows") {
         Command::new("cmd").args(["/C", "psql --version"])
             .status().map(|s| s.success()).unwrap_or(false)
     } else {
         Command::new(find_psql()).arg("--version")
             .status().map(|s| s.success()).unwrap_or(false)
     };

     Ok(java_ok && pg_ok)
 }

 #[tauri::command]
 pub async fn install_all<R: Runtime>(
     window: Window<R>,
     password: String,
 ) -> Result<(), String> {
     std::thread::spawn(move || {
         let result = run_install(&window, &password);
         match result {
             Ok(_) => { let _ = window.emit("install-done", "ok"); }
             Err(e) => { let _ = window.emit("install-done", e); }
         }
     });
     Ok(())
 }

 fn run_install<R: Runtime>(window: &Window<R>, password: &str) -> Result<(), String> {
     let sudo_run = |args: &[&str], pwd: &str| -> bool {
         let Ok(mut child) = Command::new("sudo")
             .arg("-S")
             .args(args)
             .stdin(std::process::Stdio::piped())
             .stdout(std::process::Stdio::null())
             .stderr(std::process::Stdio::null())
             .spawn()
         else { return false; };
         if let Some(stdin) = child.stdin.as_mut() {
             let _ = stdin.write_all(format!("{}\n", pwd).as_bytes());
         }
         child.wait().map(|s| s.success()).unwrap_or(false)
     };

     #[cfg(target_os = "windows")]
     {
         let components = [
             ("Microsoft.OpenJDK.17", "Java 17"),
             ("PostgreSQL.PostgreSQL", "PostgreSQL"),
         ];
         for (id, name) in components {
             let _ = window.emit("install-log", format!("Установка {}...", name));
             let status = Command::new("cmd")
                 .args(["/C", "winget", "install", "-e", "--id", id,
                     "--silent", "--accept-package-agreements", "--accept-source-agreements"])
                 .status().map_err(|e| e.to_string())?;
             if !status.success() {
                 return Err(format!("Ошибка установки {}", name));
             }
         }
     }

     #[cfg(target_os = "macos")]
     {
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

         let java_bin = find_java();
         if java_bin != "java" {
             let _ = window.emit("install-log", "Java 17 уже установлена, пропускаем.");
         } else {
             let _ = window.emit("install-log", "Установка Java 17...");
             let status = Command::new(brew).args(["install", "openjdk@17"])
                 .status().map_err(|e| e.to_string())?;
             if !status.success() {
                 return Err("Не удалось установить Java 17".to_string());
             }
         }

         let _ = Command::new("/bin/bash")
             .args(["-c", "grep -q 'openjdk@17' ~/.zshrc || echo 'export PATH=\"/opt/homebrew/opt/openjdk@17/bin:$PATH\"' >> ~/.zshrc"])
             .status();
         let _ = window.emit("install-log", "Java 17 добавлена в PATH.");

         let psql_bin = find_psql();
         if psql_bin != "psql" {
             let _ = window.emit("install-log", "PostgreSQL уже установлен, пропускаем.");
         } else {
             let _ = window.emit("install-log", "Установка PostgreSQL...");
             let status = Command::new(brew).args(["install", "postgresql@14"])
                 .status().map_err(|e| e.to_string())?;
             if !status.success() {
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
     }

     #[cfg(target_os = "linux")]
     {
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
             sudo_run(&["systemctl", "start", "postgresql"], password);
         }
     }

     let _ = window.emit("install-log", "Настройка базы данных...");

     let psql_bin = find_psql();
     let check_db = "SELECT 1 FROM pg_database WHERE datname = 'students_db'";
     let create_db = "CREATE DATABASE students_db";

     let exists = Command::new(psql_bin)
         .args(["-U", "postgres", "-tAc", check_db])
         .output()
         .map(|o| String::from_utf8_lossy(&o.stdout).trim() == "1")
         .unwrap_or(false);

     if !exists {
         let status = Command::new(psql_bin)
             .args(["-U", "postgres", "-c", create_db])
             .status().map_err(|e| e.to_string())?;
         if !status.success() {
             return Err("Не удалось создать базу данных. Проверьте права пользователя postgres.".to_string());
         }
         let _ = window.emit("install-log", "База данных создана.");
     } else {
         let _ = window.emit("install-log", "База данных уже существует, пропускаем.");
     }

     let _ = window.emit("install-log", "Все компоненты готовы!");
     Ok(())
 }