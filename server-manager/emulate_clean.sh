#!/bin/bash
set -euo pipefail

echo "=== Эмуляция чистой установки ==="

APP_YML="$HOME/tabularium/server-manager/application.yml"

echo ""
echo "[1] Останавливаем PostgreSQL..."
/opt/homebrew/bin/brew services stop postgresql@14 2>/dev/null || true
echo "  PostgreSQL остановлен"

echo ""
echo "[2] Удаляем Java 17..."
/opt/homebrew/bin/brew uninstall --ignore-dependencies openjdk@17 2>/dev/null \
  && echo "  ✅ openjdk@17 удалён" || echo "  ⚠️ openjdk@17 не найден"
# Убираем симлинки, которые brew мог оставить
rm -f /opt/homebrew/bin/java /opt/homebrew/bin/javac

echo ""
echo "[3] Удаляем PostgreSQL..."
/opt/homebrew/bin/brew uninstall --ignore-dependencies postgresql@14 2>/dev/null \
  && echo "  ✅ postgresql@14 удалён" || echo "  ⚠️ postgresql@14 не найден"
# Убираем симлинки
rm -f /opt/homebrew/bin/psql /opt/homebrew/bin/pg_isready

echo ""
echo "[4] Скрываем application.yml..."
if [ -f "$APP_YML" ]; then
    mv "$APP_YML" "${APP_YML}.bak"
    echo "  ✅ application.yml скрыт"
else
    echo "  ⚠️ application.yml не найден"
fi

echo ""
echo "✅ Готово. Запускай приложение и проверяй установку."
echo "Когда закончишь — запусти: ./restore.sh"