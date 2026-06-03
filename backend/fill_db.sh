#!/bin/bash

BASE_URL="http://localhost:8080"

echo "=== Регистрация и авторизация администратора ==="

curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin_test",
    "password": "password123",
    "fullname": "Главный Администратор",
    "role": "ADMIN"
  }'

# Костыль для одобрения, если требуется по логике бд
# В реальном приложении обычно первый юзер одобряется автоматически или через БД.
# Если эндпоинт /approve уже требует токен, то этот шаг делается вручную или в БД.

LOGIN_RESP=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin_test",
    "password": "password123"
  }')

# Извлекаем токен из ответа (предполагается формат {"token":"..."} или {"accessToken":"..."})
TOKEN=$(echo "$LOGIN_RESP" | grep -o '"[^"]*token[^"]*":"[^"]*"' | head -n 1 | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "Не удалось получить токен авторизации. Скрипт остановлен."
    exit 1
fi

AUTH_H="Authorization: Bearer $TOKEN"
JSON_H="Content-Type: application/json"

echo "=== Создание групп ==="
GROUP_IDS=()
GROUP_NAMES=("ПОИБМС-21" "ПОИТ-22" "ИСИТ-21" "ДЭВИ-22" "АСОИ-21")

for name in "${GROUP_NAMES[@]}"; do
  RESP=$(curl -s -X POST "$BASE_URL/api/groups" -H "$JSON_H" -H "$AUTH_H" \
    -d "{\"name\": \"$name\", \"amount\": 0}")
  ID=$(echo "$RESP" | grep -o '"id":[0-9]*' | cut -d':' -f2)
  if [ ! -z "$ID" ]; then GROUP_IDS+=($ID); fi
done

echo "=== Создание предметов ==="
SUBJECT_IDS=()
SUBJECT_NAMES=("Высшая математика" "Операционные системы" "Базы данных" "Физика" "Разработка на Java" "Философия")

for name in "${SUBJECT_NAMES[@]}"; do
  RESP=$(curl -s -X POST "$BASE_URL/api/subjects" -H "$JSON_H" -H "$AUTH_H" \
    -d "{\"name\": \"$name\"}")
  ID=$(echo "$RESP" | grep -o '"id":[0-9]*' | cut -d':' -f2)
  if [ ! -z "$ID" ]; then SUBJECT_IDS+=($ID); fi
done

echo "=== Создание преподавателей ==="
TEACHER_IDS=()
TEACHER_NAMES=("Иванов Иван Иванович" "Петров Петр Петрович" "Сидоров Сидор Сидорович" "Александров Александр Александрович" "Дмитриев Дмитрий Дмитриевич")

for name in "${TEACHER_NAMES[@]}"; do
  PHONE="+37529$(shuf -i 1000000-9999999 -n 1)"
  RESP=$(curl -s -X POST "$BASE_URL/api/teachers" -H "$JSON_H" -H "$AUTH_H" \
    -d "{\"fullname\": \"$name\", \"phone\": \"$0\"}")
  ID=$(echo "$RESP" | grep -o '"id":[0-9]*' | cut -d':' -f2)
  if [ ! -z "$ID" ]; then TEACHER_IDS+=($ID); fi
done

echo "=== Создание студентов (50 записей) ==="
STUDENT_IDS=()
FIRST_NAMES=("Алексей" "Дмитрий" "Никита" "Роман" "Артем" "Илья" "Максим" "Владислав" "Егор" "Михаил")
LAST_NAMES=("Цыбранков" "Козлов" "Новиков" "Морозов" "Петров" "Павлов" "Соколов" "Смирнов" "Кузнецов" "Попов")

for i in {1..50}; do
  F_NAME=${FIRST_NAMES[$[$RANDOM % ${#FIRST_NAMES[@]}]]}
  L_NAME=${LAST_NAMES[$[$RANDOM % ${#LAST_NAMES[@]}]]}
  FULLNAME="$L_NAME $F_NAME"

  AGE=$(shuf -i 18-23 -n 1)
  YEAR=$((2026 - AGE))
  MONTH=$(printf "%02d" $(shuf -i 1-12 -n 1))
  DAY=$(printf "%02d" $(shuf -i 1-28 -n 1))
  BIRTHDATE="$YEAR-$MONTH-$DAY"

  PHONE="+37529$(shuf -i 1000000-9999999 -n 1)"
  GROUP_ID=${GROUP_IDS[$[$RANDOM % ${#GROUP_IDS[@]}]]}

  RESP=$(curl -s -X POST "$BASE_URL/api/students" -H "$JSON_H" -H "$AUTH_H" \
    -d "{
      \"fullname\": \"$FULLNAME\",
      \"age\": $AGE,
      \"birthdate\": \"$BIRTHDATE\",
      \"phone\": \"$PHONE\",
      \"groupId\": $GROUP_ID
    }")
  ID=$(echo "$RESP" | grep -o '"id":[0-9]*' | cut -d':' -f2)
  if [ ! -z "$ID" ]; then STUDENT_IDS+=($ID); fi
done

echo "=== Создание расписания ==="
DAYS=("MONDAY" "TUESDAY" "WEDNESDAY" "THURSDAY" "FRIDAY")
CLASSROOMS=("101" "204" "305" "412" "Каф. 4")

for g_id in "${GROUP_IDS[@]}"; do
  for d_of_w in "${DAYS[@]}"; do
    for l_num in {1..3}; do
      SUBJ_ID=${SUBJECT_IDS[$[$RANDOM % ${#SUBJECT_IDS[@]}]]}
      TEACH_ID=${TEACHER_IDS[$[$RANDOM % ${#TEACHER_IDS[@]}]]}
      CLASS=${CLASSROOMS[$[$RANDOM % ${#CLASSROOMS[@]}]]}

      curl -s -X POST "$BASE_URL/api/schedule" -H "$JSON_H" -H "$AUTH_H" \
        -d "{
          \"groupId\": $g_id,
          \"subjectId\": $SUBJ_ID,
          \"teacherId\": $TEACH_ID,
          \"dayOfWeek\": \"$d_of_w\",
          \"lessonNumber\": $l_num,
          \"classroom\": \"$CLASS\"
        }" > /dev/null
    done
  done
done

echo "=== Создание оценок (50 записей) ==="
WORK_TYPES=("Экзамен" "Лабораторная работа" "Практическая работа" "Коллоквиум")
COMMENTS=("Отличный ответ" "Сдано вовремя" "Требует доработки" "Слабый ответ" "Тема усвоена")

for i in {1..50}; do
  ST_ID=${STUDENT_IDS[$[$RANDOM % ${#STUDENT_IDS[@]}]]}
  SUBJ_ID=${SUBJECT_IDS[$[$RANDOM % ${#SUBJECT_IDS[@]}]]}
  TEACH_ID=${TEACHER_IDS[$[$RANDOM % ${#TEACHER_IDS[@]}]]}

  GRADE=$(shuf -i 4-10 -n 1)
  IS_ABSENT="false"
  if [ $GRADE -lt 4 ]; then IS_ABSENT="true"; fi

  W_TYPE=${WORK_TYPES[$[$RANDOM % ${#WORK_TYPES[@]}]]}
  COMM=${COMMENTS[$[$RANDOM % ${#COMMENTS[@]}]]}

  curl -s -X POST "$BASE_URL/api/grades" -H "$JSON_H" -H "$AUTH_H" \
    -d "{
      \"studentId\": $ST_ID,
      \"subjectId\": $SUBJ_ID,
      \"teacherId\": $TEACH_ID,
      \"grade\": $GRADE,
      \"isAbsent\": $IS_ABSENT,
      \"workType\": \"$W_TYPE\",
      \"comment\": \"$COMM\",
      \"gradeDate\": \"2026-05-15\"
    }" > /dev/null
done

echo "=== Создание посещаемости (50 записей) ==="
STATUSES=("PRESENT" "ABSENT" "LATE" "EXCUSED")

for i in {1..50}; do
  ST_ID=${STUDENT_IDS[$[$RANDOM % ${#STUDENT_IDS[@]}]]}
  SUBJ_ID=${SUBJECT_IDS[$[$RANDOM % ${#SUBJECT_IDS[@]}]]}
  TEACH_ID=${TEACHER_IDS[$[$RANDOM % ${#TEACHER_IDS[@]}]]}
  STAT=${STATUSES[$[$RANDOM % ${#STATUSES[@]}]]}

  # Используем случайную дату мая 2026 года для разнообразия
  DAY=$(printf "%02d" $(shuf -i 1-25 -n 1))
  ATT_DATE="2026-05-$DAY"

  curl -s -X POST "$BASE_URL/api/attendance" -H "$JSON_H" -H "$AUTH_H" \
    -d "{
      \"studentId\": $ST_ID,
      \"subjectId\": $SUBJ_ID,
      \"teacherId\": $TEACH_ID,
      \"attendanceDate\": \"$ATT_DATE\",
      \"status\": \"$STAT\",
      \"note\": \"Автоматическая отметка\"
    }" > /dev/null 2>&1
    # ignore errors if unique constraint hits (student_id, subject_id, attendance_date)
done

echo "=== Заполнение базы данных успешно завершено ==="