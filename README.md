[Русский](README_ru.md)
# Tabularium 🏛️

**Decentralized educational platform for automating educational institutions**

![Java](https://img.shields.io/badge/Java-17-b07219)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.6-6db33f)
![React](https://img.shields.io/badge/React-18-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)
![Tauri](https://img.shields.io/badge/Tauri-2-ffc131)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)
![Docker](https://img.shields.io/badge/Docker-20.10-2496ed)
![License](https://img.shields.io/badge/License-1C--like-orange)

## 📖 About the project

Tabularium is a modern decentralized platform for managing educational institutions. Each school receives its own autonomous server with full data control, without centralized information collection.

> The name comes from the ancient Roman **Tabularium** — the repository of state archives and documents.

## 🏗️ Architecture

### Key principles of the architecture
- **Autonomy**: Each server operates independently
- **Data isolation**: Data does not leave the institution
- **Scalability**: Easy addition of new schools
- **Security**: No single point of failure
## 🛠️ Technology stack

### Backend
- **Java 17** — primary language
- **Spring Boot 3.6** — web framework
- **Spring Data JPA** — database operations
- **Spring Security** — authentication and authorization
- **Spring Validation** — data validation
- **Hibernate 6.4** — ORM
- **Lombok** — code generation
- **PostgreSQL 16** — database
- **Liquibase** — database migrations
- **JUnit 5** — testing

### Frontend (Client application)
- **React 18** — UI library
- **TypeScript 5** — typed JavaScript
- **Tauri 2** — desktop shell (Rust)
- **MUI (Material-UI)** — UI components
- **React Hook Form** — form management
- **React Query** — state management
- **Axios** — HTTP client
- **Zod** — schema validation

### Infrastructure and tools
- **Docker 20.10+** — containerization
- **Docker Compose** — orchestration
- **Nginx** — reverse proxy
- **GitHub Actions** — CI/CD
- **Maven** — Java build
- **npm** — frontend build
- **Postman** — API testing
## ✨ Features

### 🎯 For school administrators
- **Nocode configuration** — intuitive interface without programming
- **Structure management** — creating groups, classes, subjects
- **Data import** — upload from CSV, Excel, 1C
- **User management** — roles and access rights
- **Backup** — automatic data backups
- **Reporting** — built-in and custom reports

### 👨‍🏫 For teachers
- **Electronic journal** — performance and attendance tracking
- **Schedule** — manage the academic timetable
- **Communication** — interaction with students and parents
- **Mobile access** — work from any device
- **Offline mode** — work without internet

### 🔧 Technical features
- **Autonomous servers** — each school has its own server
- **Automatic deployment** — installation in 3 commands
- **REST API** — integration with external systems
- **Web interface** — cross-platform access
- **Security** — RBAC and action audit

## 🔒 Security
### Protection measures
- JWT token authentication
- RBAC (Role-Based Access Control) authorization
- Data validation at all levels
- Action audit, logging all operations
- TLS 1.3 encryption for data transfer
- Daily backups
## 📈 Performance
### Recommended configurations
#### Small school (up to 100 students)
- 2 CPU cores
- 4 GB RAM
- 50 GB SSD
Cost: ~1,500 ₽/month

#### Medium school (100-500 students)
- 4 CPU cores
- 8 GB RAM
- 100 GB SSD
Cost: ~3,000 ₽/month

#### Large school (500+ students)
- 8 CPU cores
- 16 GB RAM
- 200 GB SSD
Cost: ~6,000 ₽/month

## 🤝 Development and contribution
### Development requirements
- JDK 17+
- Node.js 18+
- Rust 1.60+
- Docker 20.10+
- PostgreSQL 16
### 🚀 Running in development mode

Clone the repository:  
```bash
git clone https://github.com/tabularium/tabularium.git  
cd tabularium
```
Backend (Spring Boot):  
```bash
cd backend  
./mvnw spring-boot:run
```
Frontend (Tauri + React):  
```bash
cd frontend  
npm install  
npm run tauri dev
```
Or run via Docker:  
```bash
docker-compose -f docker-compose.dev.yml up
```
### 🏗️ Production build

Backend build:  
```bash
cd backend  
./mvnw clean package -DskipTests
```
Frontend build:  
```bash
cd frontend  
npm run tauri build
```
Creating Docker images:  
```bash
docker build -t tabularium-backend:latest ./backend  
docker build -t tabularium-frontend:latest ./frontend
```
## 📄 API documentation

### 🌐 Base URL
http://localhost:8080/api

### 📝 Request examples

Creating a student:  
```http
POST /api/students  
Content-Type: application/json  
Authorization: Bearer <token>

{
    "fullname": "Ivan Ivanov",
    "age": 16,
    "phone": "+79123456789",
    "birthdate": "2008-05-15",
    "groupName": "10A"
}
```
Getting a list of groups:  
```http
GET /api/groups  
Authorization: Bearer <token>

Authentication:  
POST /api/auth/login  
Content-Type: application/json

{
    "username": "admin",
    "password": "password123"
}
```
### 🚦 Project status

Current version: 0.0.1 (Beta)  

Status: Active development
