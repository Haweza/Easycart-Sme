# EasyCart SME — Subscription Management System: Implementation Plan

## Overview

A production-minded MVP for a multi-role subscription management platform. The system enforces strict role separation (ADMIN → ORGANIZER → CUSTOMER), a single-use invite lifecycle, and family-based membership — all backed by Supabase (PostgreSQL + RLS), a Spring Boot API layer, and a branded HTML/CSS/JS frontend deployed on Vercel.

---

## Phase 1 — Supabase Setup

### Step 1.1 — Auth Configuration
- Enable **Email/Password** provider in Supabase Auth
- Disable public sign-up if needed (admin-controlled onboarding)
- Configure email redirect URLs for invite acceptance flow
- Store `auth.users.id` as FK in `profiles` table

### Step 1.2 — Database Schema
Create the following tables (full SQL in `/database/schema.sql`):

| Table | Purpose |
|---|---|
| `profiles` | Extended user info + role (CUSTOMER / ORGANIZER / ADMIN) |
| `services` | Available subscription services |
| `families` | Subscription groups managed by organizers |
| `family_members` | Users belonging to a family |
| `service_requests` | Customer requests for service access |
| `invites` | Single-use, admin-created invitations |
| `family_services` | Maps services to families |

### Step 1.3 — Row-Level Security (RLS)
- `profiles`: users read own row; admin reads all
- `services`: public read; admin write
- `invites`: recipient reads own invite; admin full control
- `families`: organizer reads assigned families; admin full
- `family_members`: member reads own; organizer reads assigned family; admin full
- `service_requests`: owner reads own; admin full

---

## Phase 2 — Spring Boot Backend

### Architecture
```
com.easycart.sme
├── config/          # Security, CORS, Supabase JWT config
├── controller/      # REST controllers per domain
├── service/         # Business logic
├── repository/      # JPA repositories
├── entity/          # JPA entities mirroring DB schema
├── dto/             # Request/Response DTOs
├── exception/       # Global error handling
└── util/            # JWT helpers, role guards
```

### Key API Endpoints

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register new customer |
| POST | `/api/auth/login` | Public | Login, return JWT |
| GET | `/api/services` | Public | List all services |
| POST | `/api/service-requests` | CUSTOMER | Request service access |
| GET | `/api/admin/users` | ADMIN | List all users |
| PUT | `/api/admin/users/{id}/role` | ADMIN | Assign role |
| POST | `/api/admin/invites` | ADMIN | Create invite |
| GET | `/api/admin/invites` | ADMIN | List all invites |
| GET | `/api/invites/my` | CUSTOMER | View own pending invite |
| POST | `/api/invites/{id}/accept` | CUSTOMER | Accept invite |
| POST | `/api/invites/{id}/decline` | CUSTOMER | Decline invite |
| GET | `/api/families` | ORGANIZER | List assigned families |
| POST | `/api/families` | ORGANIZER/ADMIN | Create family |
| GET | `/api/families/{id}/members` | ORGANIZER/ADMIN | List family members |

---

## Phase 3 — Frontend Build

### Pages
| File | Role Access | Description |
|---|---|---|
| `index.html` | Public | Branded landing page |
| `login.html` | Public | Auth page (login + register tabs) |
| `dashboard.html` | CUSTOMER | Service catalog + invite status |
| `admin.html` | ADMIN | Full control panel |
| `organizer.html` | ORGANIZER | Family management panel |

### Design System
- **Primary**: `#1E2A78` (Deep Blue)
- **Accent**: `#F4C430` (Bright Yellow)
- **Background**: `#F8F9FB`
- **Text**: `#1A1A1A`
- Font: **Inter** (Google Fonts)
- Tailwind CDN + custom CSS layer

---

## Phase 4 — Deployment

### Supabase
1. Create project at supabase.com
2. Run `/database/schema.sql` in SQL editor
3. Enable RLS policies from `/database/rls_policies.sql`
4. Copy `SUPABASE_URL` and `SUPABASE_ANON_KEY`

### Spring Boot (Backend)
1. Configure `application.properties` with Supabase DB URL
2. Build: `mvn clean package`
3. Deploy to Railway / Render / any Java host
4. Expose base API URL

### Vercel (Frontend)
1. Push `/frontend` to GitHub
2. Import repo in Vercel
3. Set `API_BASE_URL` env var
4. Deploy — zero config needed for static HTML/JS

---

## System Flows

### User Journey
```
Visitor → Views Landing Page
  → Registers (becomes CUSTOMER)
  → Browses Services
  → Submits Service Request
  → Admin Reviews Request
  → Admin Creates Invite (linked to user + family + service)
  → User Accepts Invite
  → Becomes Active Family Member ✅
```

### Invite Lifecycle
```
[ADMIN creates invite]
       ↓
   PENDING
   /     \
ACCEPTED  DECLINED
(locked)  (closed)
       ↓
   EXPIRED (after expiry_date if not accepted)
```

### Admin Control Flow
```
Admin Panel
  ├── View all users → assign ORGANIZER role
  ├── View service requests → approve/reject
  ├── Create families → assign organizer
  ├── Create invites → link user + family + service
  └── View all invites → monitor lifecycle
```

---

## Project File Structure

```
/easycart-sme
├── /frontend
│   ├── index.html
│   ├── login.html
│   ├── dashboard.html
│   ├── admin.html
│   ├── organizer.html
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── api.js
│       ├── auth.js
│       ├── dashboard.js
│       ├── admin.js
│       └── organizer.js
├── /backend
│   └── src/main/
│       ├── java/com/easycart/sme/
│       │   ├── config/
│       │   ├── controller/
│       │   ├── service/
│       │   ├── repository/
│       │   ├── entity/
│       │   ├── dto/
│       │   └── exception/
│       └── resources/
│           └── application.properties
├── /database
│   ├── schema.sql
│   └── rls_policies.sql
└── /docs
    ├── setup.md
    └── api_reference.md
```
