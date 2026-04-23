# EasyCart SME — Setup & Deployment Guide

## Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Java JDK | 17+ | Spring Boot backend |
| Maven | 3.9+ | Build tool |
| Node.js (optional) | 18+ | Local frontend dev server |
| Supabase account | — | Database + Auth |
| Vercel account | — | Frontend hosting |

---

## Step 1 — Supabase Setup

### 1.1 Create Project
1. Go to [https://supabase.com](https://supabase.com) → New Project
2. Name it `easycart-sme`, choose a region close to Zambia (e.g. EU West)
3. Save your DB password

### 1.2 Run the Schema
1. Open Supabase Dashboard → **SQL Editor**
2. Open and run `database/schema.sql` (paste full contents)
3. Then run `database/rls_policies.sql`

### 1.3 Get Credentials
Go to **Settings → API**:
- `Project URL` → your `SUPABASE_URL`
- `anon public` key → your `SUPABASE_ANON_KEY`
- `service_role` key → your `SUPABASE_SERVICE_ROLE_KEY`

Go to **Settings → Database**:
- Connection string (URI) → use in `spring.datasource.url`

### 1.4 Promote First Admin
After registering on the frontend, run this in Supabase SQL Editor:
```sql
UPDATE profiles
SET role = 'ADMIN', is_approved = TRUE
WHERE email = 'your-admin@email.com';
```

---

## Step 2 — Spring Boot Backend

### 2.1 Configure
Copy and edit `backend/src/main/resources/application.properties`:
```properties
spring.datasource.url=jdbc:postgresql://<SUPABASE_HOST>:5432/postgres
spring.datasource.username=postgres
spring.datasource.password=<DB_PASSWORD>
jwt.secret=<RANDOM_256_BIT_STRING>
supabase.url=https://<PROJECT_REF>.supabase.co
supabase.anon-key=<ANON_KEY>
cors.allowed-origins=http://localhost:3000,https://your-vercel-app.vercel.app
```

### 2.2 Build
```bash
cd backend
mvn clean package -DskipTests
```

### 2.3 Run Locally
```bash
java -jar target/easycart-sme-2.1.0.jar
```
Backend will be available at `http://localhost:8080`

### 2.4 Deploy to Railway / Render
1. Push `backend/` to a GitHub repo
2. Connect to [Railway](https://railway.app) or [Render](https://render.com)
3. Set all environment variables in the dashboard
4. Railway auto-detects Maven and deploys

---

## Step 3 — Frontend

### 3.1 Configure API URL
Edit `frontend/js/api.js` line 6:
```js
const API_BASE = 'https://your-spring-boot-api.railway.app/api';
```
Or set via Vercel environment variable and inject at build time.

### 3.2 Run Locally
```bash
cd frontend
npx serve .
# or open index.html directly in browser for basic testing
```

### 3.3 Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

cd frontend
vercel
```
Or:
1. Push `frontend/` to GitHub
2. Import repo in [Vercel](https://vercel.com)
3. Set `API_BASE_URL` in Environment Variables → your Spring Boot URL
4. Deploy — no build step needed (static HTML)

---

## Step 4 — Running Everything Together

```
Supabase (Database + Auth)
      ↕  JDBC + REST
Spring Boot API (port 8080)
      ↕  fetch() / REST
Vercel (Frontend — index.html, dashboard, admin, organizer)
```

---

## Useful Commands

```bash
# Check DB connection
mvn spring-boot:run

# Run all tests
mvn test

# Build Docker image (optional)
docker build -t easycart-sme ./backend
docker run -p 8080:8080 easycart-sme

# Expire invites manually (Supabase SQL)
SELECT expire_old_invites();
```

---

## First-Use Checklist

- [ ] Supabase project created + schema applied
- [ ] RLS policies applied
- [ ] Admin email promoted via SQL
- [ ] Spring Boot configured + running
- [ ] Frontend deployed to Vercel with correct API_BASE_URL
- [ ] Test: register → login → service request → admin review → invite → accept

---

## Environment Variables Reference

| Variable | Where Used | Example |
|---|---|---|
| `spring.datasource.url` | Backend | `jdbc:postgresql://host:5432/postgres` |
| `jwt.secret` | Backend | 64-char random string |
| `supabase.url` | Backend | `https://xyz.supabase.co` |
| `supabase.anon-key` | Backend | `eyJ…` |
| `cors.allowed-origins` | Backend | `https://app.vercel.app` |
| `API_BASE_URL` | Frontend | `https://api.railway.app/api` |
