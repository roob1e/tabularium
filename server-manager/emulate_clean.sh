#!/bin/bash

echo "=== Эмуляция чистой установки ==="

APP_YML="$HOME/tabularium/server-manager/application.yml"

echo ""
echo "[1] Останавливаем PostgreSQL..."
/opt/homebrew/bin/brew services stop postgresql@14 2>/dev/null
echo "  PostgreSQL остановлен"

echo ""
echo "[2] Удаляем Java 17..."
/opt/homebrew/bin/brew uninstall openjdk@17 2>/dev/null && echo "  ✅ openjdk@17 удалён" || echo "  ⚠️ openjdk@17 не найден"

echo ""
echo "[3] Удаляем PostgreSQL..."
/opt/homebrew/bin/brew uninstall postgresql@14 2>/dev/null && echo "  ✅ postgresql@14 удалён" || echo "  ⚠️ postgresql@14 не найден"

echo ""
echo "[4] Удаляем application.yml..."
if [ -f "$APP_YML" ]; then
    mv "$APP_YML" "${APP_YML}.bak"
    echo "  ✅ application.yml скрыт"
else
    echo "  ⚠️ application.yml не найден"
fi

echo ""
echo "✅ Готово. Запускай приложение и проверяй установку."
echo "Когда закончишь — запусти: ./restore.sh"