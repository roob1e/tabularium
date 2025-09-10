# Tabularium 🏛️

**Децентрализованная образовательная платформа для автоматизации учебных учреждений**

![Java](https://img.shields.io/badge/Java-17-b07219)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.6-6db33f)
![React](https://img.shields.io/badge/React-18-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)
![Tauri](https://img.shields.io/badge/Tauri-2-ffc131)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)
![Docker](https://img.shields.io/badge/Docker-20.10-2496ed)
![License](https://img.shields.io/badge/License-1C--like-orange)

## 📖 О проекте

Tabularium — современная децентрализованная платформа для управления образовательными учреждениями. Каждая школа получает собственный автономный сервер с полным контролем данных, без централизованного сбора информации.

> Название происходит от древнеримского **Tabularium** — хранилища государственных архивов и документов.

## 🏗️ Архитектура


### Ключевые принципы архитектуры
- **Автономность**: Каждый сервер работает независимо
- **Изоляция данных**: Данные не покидают территорию учреждения  
- **Масштабируемость**: Легкое добавление новых школ
- **Безопасность**: Нет единой точки отказа

## 🛠️ Технологический стек

### Backend
- **Java 17** — основной язык
- **Spring Boot 3.6** — веб-фреймворк
- **Spring Data JPA** — работа с БД
- **Spring Security** — аутентификация и авторизация
- **Spring Validation** — валидация данных
- **Hibernate 6.4** — ORM
- **Lombok** — генерация кода
- **PostgreSQL 16** — база данных
- **Liquibase** — миграции БД
- **JUnit 5** — тестирование

### Frontend (Клиентское приложение)
- **React 18** — UI библиотека
- **TypeScript 5** — типизированный JavaScript
- **Tauri 2** — десктопная оболочка (Rust)
- **MUI (Material-UI)** — компоненты интерфейса
- **React Hook Form** — управление формами
- **React Query** — управление состоянием
- **Axios** — HTTP клиент
- **Zod** — валидация схем

### Инфраструктура и инструменты
- **Docker 20.10+** — контейнеризация
- **Docker Compose** — оркестрация
- **Nginx** — reverse proxy
- **GitHub Actions** — CI/CD
- **Maven** — сборка Java
- **npm** — сборка фронтенда
- **Postman** — тестирование API


## ✨ Возможности

### 🎯 Для администраторов школ
- **Nocode-настройка** — интуитивный интерфейс без программирования
- **Управление структурой** — создание групп, классов, предметов
- **Импорт данных** — загрузка из CSV, Excel, 1С
- **Управление пользователями** — роли и права доступа
- **Резервное копирование** — автоматические бэкапы данных
- **Отчетность** — встроенные и кастомные отчеты

### 👨‍🏫 Для преподавателей
- **Электронный журнал** — учет успеваемости и посещаемости
- **Расписание** — управление учебным расписанием
- **Коммуникация** — общение с students и родителями
- **Мобильный доступ** — работа с любого устройства
- **Оффлайн-режим** — работа без интернета

### 🔧 Технические особенности
- **Автономные серверы** — каждая школа имеет свой сервер
- **Автоматическое развертывание** — установка в 3 команды
- **REST API** — интеграция с внешними системами
- **Веб-интерфейс** — кросс-платформенный доступ
- **Безопасность** — RBAC и аудит действий

## 🚀 Быстрый старт

### Предварительные требования
- Docker 20.10+
- Docker Compose 2.0+
- 4 GB RAM
- 10 GB свободного места

### Установка сервера (для школы)
1. Создайте директорию для проекта
```bash
mkdir tabularium-school && cd tabularium-school
```

2. Скачайте конфигурацию
```bash
curl -O https://tabularium.ru/install/docker-compose.yml
curl -O https://tabularium.ru/install/.env
```

3. Настройте переменные окружения
```bash
echo "SCHOOL_NAME=Моя Школа" >> .env
echo "POSTGRES_PASSWORD=secret_password" >> .env
```

4. Запустите сервер
```bash
docker-compose up -d
```

5. Откройте http://localhost:8080
6. Пройдите мастер первоначальной настройки

### Установка клиента (для учителей)
Windows:
```bash
winget install Tabularium.Client
```

macOS:
```bash
brew install tabularium
```

Linux (Debian/Ubuntu):
```bash
curl -fsSL https://apt.tabularium.ru/install.sh | sudo bash
sudo apt install tabularium-client
```

Или скачайте с официального сайта:
[https://somesite.by](URL)

##🔒 Безопасность
###Меры защиты
- Аутентификация JWT токены
- Авторизация RBAC (Role-Based Access Control)
- Валидация данных на всех уровнях
- Аудит действий логирование всех операций
- Шифрование TLS 1.3 для передачи данных
- Резервное копирование ежедневные бэкапы

##📈 Производительность
###Рекомендуемые конфигурации
####Малая школа (до 100 учащихся)
- 2 CPU ядра
- 4 GB RAM
- 50 GB SSD
Стоимость: ~1.500 ₽/месяц

####Средняя школа (100-500 учащихся)
- 4 CPU ядра
- 8 GB RAM
- 100 GB SSD
Стоимость: ~3.000 ₽/месяц

####Крупная школа (500+ учащихся)
- 8 CPU ядер
- 16 GB RAM
- 200 GB SSD
Стоимость: ~6.000 ₽/месяц

##🤝 Разработка и contribution
###Требования для разработки
- JDK 17+
- Node.js 18+
- Rust 1.60+
- Docker 20.10+
- PostgreSQL 16

###Запуск в режиме разработки
Клонируйте репозиторий
```bash
git clone https://github.com/tabularium/tabularium.git
cd tabularium
```

Backend (Spring Boot)
```bash
cd backend
./mvnw spring-boot:run
```

Frontend (Tauri + React)
```bash
cd frontend
npm install
npm run tauri dev
```

Или запуск через Docker
```bash
docker-compose -f docker-compose.dev.yml up
```
###Сборка для production
Сборка backend
```bash
cd backend
./mvnw clean package -DskipTests
```

Сборка frontend  
```bash
cd frontend
npm run tauri build
```

Создание Docker образов
```bash
docker build -t tabularium-backend:latest ./backend
docker build -t tabularium-frontend:latest ./frontend
```

##📄 API документация
###Базовый URL
http://localhost:8080/api

###Примеры запросов
Создание студента

```http
POST /api/students
Content-Type: application/json
Authorization: Bearer <token>

{
    "fullname": "Иван Иванов",
    "age": 16,
    "phone": "+79123456789",
    "birthdate": "2008-05-15",
    "groupName": "10А"
}

```
Получение списка групп
```http
GET /api/groups
Authorization: Bearer <token>
```

Аутентификация
```http
POST /api/auth/login
Content-Type: application/json

{
    "username": "admin",
    "password": "password123"
}
```
###🚦 Статус проекта
Текущая версия: 0.9.0 (Beta)

Статус: Активная разработка
