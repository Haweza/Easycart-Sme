# EasyCart SME — API Reference

**Base URL:** `https://your-api-host.com/api`  
**Auth:** `Authorization: Bearer <JWT_TOKEN>`  
**Content-Type:** `application/json`

---

## Authentication

### POST `/auth/register`
Create a new account. Role defaults to `CUSTOMER`.

**Request:**
```json
{
  "fullName": "John Banda",
  "email": "john@example.com",
  "phone": "+260971234567",
  "password": "securepassword"
}
```
**Response `201`:**
```json
{
  "token": "eyJ...",
  "user": { "id": "uuid", "fullName": "John Banda", "role": "CUSTOMER", "isApproved": false }
}
```

---

### POST `/auth/login`
**Request:**
```json
{ "email": "john@example.com", "password": "securepassword" }
```
**Response `200`:**
```json
{ "token": "eyJ...", "user": { ... } }
```

---

### GET `/auth/me` 🔒
Returns the authenticated user's profile.

---

## Services (Public)

### GET `/services`
Returns all active service plans. No auth required.

**Response `200`:**
```json
[
  { "id": "uuid", "name": "EasyCart Basic", "price": 150.00, "currency": "ZMW", "billingCycle": "MONTHLY" }
]
```

---

## Service Requests 🔒

### POST `/service-requests`
**Role:** CUSTOMER  
**Request:**
```json
{ "serviceId": "uuid", "message": "I need this for my business" }
```
**Errors:**
- `409 Conflict` — duplicate PENDING request exists

---

### GET `/service-requests/my`
**Role:** Any authenticated user  
Returns own submitted requests.

---

### GET `/service-requests/pending`
**Role:** ADMIN  
Returns all pending requests for review.

---

### PUT `/service-requests/{id}/review`
**Role:** ADMIN  
**Request:**
```json
{ "approved": true, "adminNote": "Approved — welcome aboard!" }
```

---

## Invites 🔒

### POST `/invites`
**Role:** ADMIN only  
**Strict Rules:**
- `recipient_id` must be a valid user
- `family_id` + `service_id` must exist
- No duplicate PENDING invites for same user + family + service
- Recipient must NOT already be an active member of that family

**Request:**
```json
{
  "recipientId": "uuid",
  "familyId": "uuid",
  "serviceId": "uuid",
  "message": "Welcome to the Banda family plan!"
}
```
**Errors:**
- `409 Conflict` — duplicate invite or already a member
- `403 Forbidden` — caller is not ADMIN

---

### GET `/invites`
**Role:** ADMIN — returns all invites.

---

### GET `/invites/my`
**Role:** Authenticated — returns own invites.

---

### POST `/invites/{id}/accept`
**Role:** Invite recipient only  
**Rules:**
- Invite must be `PENDING`
- Invite must not be expired
- On success → membership is auto-activated in `family_members`

**Errors:**
- `400 Bad Request` — already responded or expired
- `403 Forbidden` — not the recipient

---

### POST `/invites/{id}/decline`
**Role:** Invite recipient only  
Invite must be `PENDING`.

---

## Admin 🔒 (ADMIN only)

### GET `/admin/users`
List all users with roles and approval status.

### PUT `/admin/users/{id}/role`
```json
{ "role": "ORGANIZER" }
```

### PUT `/admin/users/{id}/approve`
Approve a user account.

### POST `/admin/families`
```json
{
  "name": "Banda Household",
  "description": "Primary family group",
  "organizerId": "uuid-or-null",
  "maxMembers": 10
}
```

### GET `/admin/families`
List all families.

### PUT `/admin/families/{id}/organizer`
```json
{ "organizerId": "uuid" }
```
Assign an organizer to a family. User must have `ORGANIZER` role.

---

## Families / Organizer 🔒

### GET `/families`
**Role:** ADMIN (all) or ORGANIZER (assigned only)

### GET `/families/{id}/members`
**Role:** ADMIN or assigned ORGANIZER  
Returns all members of the specified family.

---

## Error Format

All error responses follow this structure:
```json
{
  "timestamp": "2025-04-19T19:00:00Z",
  "status": 409,
  "error": "Conflict",
  "message": "A pending invite already exists for this user, family, and service"
}
```

| Status | Meaning |
|---|---|
| `400` | Bad request / validation error |
| `401` | Not authenticated |
| `403` | Insufficient role / scope |
| `404` | Resource not found |
| `409` | Conflict (duplicate, already exists) |
| `500` | Internal server error |
