# 🛠️ Admin Service — Scrooge CRM

This is the **Admin Service** for the **Scrooge CRM** microservices architecture.  
It provides **administrative APIs** for user and role management, leveraging **AWS Cognito** for authentication and **PostgreSQL** for persistent data storage.

---

## 🚀 Overview

The Admin Service handles:

- 🧑‍💼 **Admin and Agent management**
  - Create, update, list, or soft-delete users
- 🔐 **Authentication and Authorization**
  - Integrates with **AWS Cognito** (OAuth 2.0 / JWT verification)
- 📋 **Role-based access control**
  - Only root admin can create or delete admins
- 🧾 **Auditing**
  - Tracks timestamps and deletion reasons for users
- 🐳 **Dockerized** for easy deployment

---

## 🧩 Tech Stack

| Layer      | Technology                    |
| ---------- | ----------------------------- |
| Language   | Node.js (v20+)                |
| Framework  | Express.js                    |
| ORM        | Prisma                        |
| Database   | PostgreSQL                    |
| Auth       | AWS Cognito (OAuth 2.0 / JWT) |
| Deployment | Docker + GitLab CI/CD         |

---

## 🏗️ Project Structure

```
admin-service/
├── src/
│   ├── app.js              # Express app setup
│   ├── server.js           # Server entry point
│   ├── routes/             # Route definitions
│   ├── controllers/        # Route controllers
│   ├── services/           # Business logic and DB operations
│   ├── middleware/         # Authentication & error handlers
│   └── db/prisma.js        # Prisma client setup
├── prisma/
│   └── schema.prisma       # DB schema
├── Dockerfile              # Docker image definition
├── docker-compose.yml      # Local dev setup
├── .env.example            # Environment variable template
├── .gitlab-ci.yml          # GitLab CI/CD pipeline
└── README.md               # You are here
```

---

## ⚙️ Environment Variables

Create a `.env` file (never commit this!) and populate it as follows:

```bash
PORT=8080
DATABASE_URL=postgres://postgres:postgres@postgres:5432/adminservice

# Cognito configuration
COGNITO_USER_POOL_ID=ap-southeast-1_XXXXXXX
COGNITO_APP_CLIENT_ID=XXXXXXXXXXXXXXXXXXXX
COGNITO_REGION=ap-southeast-1
COGNITO_ISSUER=https://cognito-idp.ap-southeast-1.amazonaws.com/ap-southeast-1_XXXXXXX
COGNITO_JWKS_URI=https://cognito-idp.ap-southeast-1.amazonaws.com/ap-southeast-1_XXXXXXX/.well-known/jwks.json

# Root admin (auto-created on startup)
ROOT_ADMIN_EMAIL=admin@scrooge-bank.com
ROOT_ADMIN_PASSWORD=Admin#1234
```

---

## 🐳 Running Locally (Docker)

1️⃣ Build and run the service:

```bash
docker compose up --build
```

2️⃣ The API will start at:

```
http://localhost:8080
```

3️⃣ PostgreSQL will be available at:

```
localhost:5432
```

---

## 🧪 Local Development (without Docker)

```bash
npm install
npx prisma generate
npm run dev
```

---

## 🧰 API Documentation

Once running, visit Swagger docs at:

```
http://localhost:8080/docs
```

---

## 🧱 Common Endpoints

| Endpoint                 | Method | Description                  |
| ------------------------ | ------ | ---------------------------- |
| `/api/auth/login`        | POST   | Authenticate user (Cognito)  |
| `/api/auth/refresh`      | POST   | Refresh access token         |
| `/api/users`             | GET    | List all users (admin only)  |
| `/api/users`             | POST   | Create new user (admin only) |
| `/api/users/{id}`        | GET    | Get specific user            |
| `/api/users/{id}`        | PUT    | Update user info             |
| `/api/users/{id}/delete` | PATCH  | Soft delete a user           |

---

## 🧱 Error Handling

Errors are handled centrally via a global middleware:

```js
// src/middleware/error.js
export function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
  });
}
```

404s are caught via:

```js
export function notFound(_req, res, _next) {
  res.status(404).json({ error: 'Not Found' });
}
```

---

## 🧩 Deployment (GitLab CI/CD)

### CI/CD Flow:

1. **Build stage:** Docker image built & pushed to GitLab Container Registry
2. **Deploy stage:** Optional — pulls image to EC2 or ECS and runs it

### Pipeline file:

`.gitlab-ci.yml` handles:

- Docker build
- Push to GitLab registry
- (Optional) SSH deploy to EC2

---

## 🔐 Security

- JWT verification via Cognito’s public JWKS
- No plain-text passwords stored (bcrypt for local hash fallback)
- `.env` never committed
- Prisma prepared statements to prevent SQL injection

---

## 🧱 License

MIT License © 2025 Scrooge CRM Team

---

## 👥 Contributors

| Name         | Role                              |
| ------------ | --------------------------------- |
| Ryan Tan     | Backend Developer (Admin Service) |
| Nathan [TBD] | Backend Developer                 |
| [Add others] | [Role]                            |

---

🧩 “Designed for modular growth — scalable, secure, and simple to maintain.”
