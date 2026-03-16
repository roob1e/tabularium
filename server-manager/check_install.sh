#!/bin/bash

echo "=== Проверка installer.rs с нуля ==="

# 1. Проверяем что java 17 находится по нужному пути
echo "\n[1] Проверка пути к Java 17:"
/opt/homebrew/opt/openjdk@17/bin/java -version 2>&1
if [ $? -eq 0 ]; then echo "✅ Java 17 найдена"; else echo "❌ Java 17 не найдена"; fi

# 2. Проверяем psql
echo "\n[2] Проверка psql:"
/opt/homebrew/bin/psql --version 2>&1
if [ $? -eq 0 ]; then echo "✅ psql найден"; else echo "❌ psql не найден"; fi

# 3. Проверяем pg_isready
echo "\n[3] Проверка PostgreSQL (pg_isready):"
/opt/homebrew/bin/pg_isready 2>&1
if [ $? -eq 0 ]; then echo "✅ PostgreSQL запущен"; else echo "❌ PostgreSQL не запущен"; fi

# 4. Проверяем базу данных
echo "\n[4] Проверка базы данных students_db:"
result=$(/opt/homebrew/bin/psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname = 'students_db'" 2>&1)
if [ "$result" = "1" ]; then echo "✅ База students_db существует"; else echo "❌ База students_db не найдена: $result"; fi

# 5. Симулируем check_dependencies — PATH без homebrew
echo "\n[5] Симуляция check_dependencies без PATH:"
result=$(PATH="" /opt/homebrew/opt/openjdk@17/bin/java -version 2>&1)
echo "Java output: $result"

# 6. Проверяем brew
echo "\n[6] Проверка Homebrew:"
/opt/homebrew/bin/brew --version 2>&1
if [ $? -eq 0 ]; then echo "✅ Homebrew найден"; else echo "❌ Homebrew не найден"; fi

echo "\n=== Готово ==="