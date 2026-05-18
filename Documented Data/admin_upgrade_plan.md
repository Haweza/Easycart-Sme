# EasyCart SME — Admin Workspace Upgrade
## Full Codebase Analysis + Implementation Plan

---

## PART 1: DISCOVERED ARCHITECTURE

### Frontend Architecture

| File | Role | Status |
|---|---|---|
| `index.html` | Public landing page with service catalog | ✅ Good |
| `login.html` | Auth page (login + register tabs) | ✅ Good |
| `dashboard.html` | Customer dashboard (services, requests, invites) | ✅ Good |
| `admin.html` | Admin control panel | ⚠️ Needs major upgrade |
| `organizer.html` | Organizer panel (families, members) | ✅ Adequate |
| `js/config.js` | API base URL config (local vs prod) | ✅ Good |
| `js/api.js` | Central fetch wrapper + all API namespaces | ✅ Well structured |
| `js/dashboard.js` | Customer dashboard logic | ✅ Good |
| `js/admin.js` | Admin panel logic | ⚠️ Needs major upgrade |
| `js/organizer.js` | Organizer panel logic | ✅ Adequate |
| `css/styles.css` | Full design system (1228 lines) | ⚠️ Missing admin-specific styles |

### Backend Architecture

| Layer | Files | Status |
|---|---|---|
| **Controllers** | Auth, Admin, Family, Invite, Service, ServiceRequest | ✅ All implemented |
| **Entities** | Profile, Family, FamilyMember, Plan, Service, Invite, ServiceRequest | ✅ All implemented |
| **DTOs** | ProfileResponse, FamilyResponse, InviteResponse, ServiceRequestResponse, etc. | ✅ All implemented |
| **Security** | JWT stateless filter, role-based `@PreAuthorize` | ✅ Working |
| **Auth** | Stubbed (no real Supabase Auth, no password hashing) | ⚠️ Known issue |

### Database Schema

| Table | Key Fields | Status |
|---|---|---|
| `profiles` | id, full_name, email, role, is_approved | ✅ |
| `services` | id, name, description, price, is_active | ✅ |
| `plans` | id, service_id, name, price, currency | ✅ (added beyond schema v1) |
| `families` | id, name, organizer_id, plan_id, max_members, is_active | ✅ |
| `family_members` | id, family_id, user_id, status, joined_at | ✅ |
| `service_requests` | id, user_id, service_id, plan_id, status, created_at | ✅ |
| `invites` | id, recipient_id, family_id, plan_id, status, expires_at | ✅ |

> **Note**: The `families` table has a `plan_id` FK in the entity/DTO layer, but the original schema.sql defines `family_services` as a junction table. The current JPA entity uses `plan_id` directly on `families`. This is an intentional simplification in the backend.

---

## PART 2: CURRENT ADMIN FLOW (Pre-Upgrade)

```
User logs in → Auth.login() → setAuth(token, user)
→ window.location.replace('index.html')
→ index.html checks isLoggedIn()
→ redirectByRole() called → ADMIN → goes to admin.html
→ admin.html calls requireRole('ADMIN') immediately
→ If not ADMIN, redirected to dashboard.html
```

**Problem**: Admin is hard-redirected away from the normal user experience. They never see dashboard.html. Admin panel is a completely separate environment with no connection back to the customer journey.

---

## PART 3: IDENTIFIED ISSUES

### 🔴 Critical Issues

1. **Admin auth flow is separated** — `redirectByRole()` in `api.js` sends ADMIN straight to `admin.html`, bypassing the normal dashboard entirely. The user requirement says admin should land on the normal dashboard first.

2. **Members button in admin families panel is broken** — `admin.js` line 270-275: `openMembersModal()` only shows a toast and has a stub comment `// ... similar to previous openMembersModal ...`. It never fetches or displays real member data. This is the 404/broken behavior.

3. **`dashboard.js` line 11** — `requireRole('CUSTOMER')` blocks ADMINs from the dashboard. ADMIN users who navigate to `dashboard.html` directly will be redirected away.

4. **Login redirect** — `login.html` calls `window.location.replace('index.html')` after login. Then `index.html` calls `redirectByRole()` which auto-sends admins to `admin.html`. This means admins can never stay on the normal dashboard.

### 🟡 Missing Features (User Requirements)

5. **No "Admin Panel" button on the dashboard navbar** — Dashboard navbar has no conditional button for ADMINs.

6. **No filter button on user table** — Users view only has a search bar. No role filter or service filter.

7. **No "User Details" intelligence popup** — No per-user analytics modal exists.

8. **No timestamp column in service requests table** — Admin sees: User, Service, Plan, Status, Actions. No `createdAt` timestamp.

9. **No dedicated Services/Subscriptions monitoring panel** — No view for active families with expiry tracking, status indicators (ACTIVE / EXPIRING SOON / EXPIRED), or subscription cycle visibility.

10. **Admin panel not responsive** — The sidebar has no burger toggle in the admin navbar. On mobile, all admin nav actions disappear.

11. **No `bg-subtle` CSS variable defined** — `styles.css` references `var(--bg-subtle)` in several places (sidebar, card backgrounds) but it is never declared in `:root` or `[data-theme="dark"]`, causing visual inconsistency.

### 🟠 Architectural Conflicts

12. **`ServiceRequestController` line 27** — `@PreAuthorize("hasRole('CUSTOMER')")` on POST `/service-requests` blocks ADMINs from submitting service requests if they want to use the platform as a user.

13. **`redirectByRole()` in `api.js`** — This function maps `ADMIN → admin.html`, meaning any call to `redirectByRole()` bypasses the new design. It needs to be updated.

14. **`dashboard.js` boot** — Calls `requireRole('CUSTOMER')` — must be changed to allow `ADMIN` through as well.

---

## PART 4: IMPLEMENTATION STRATEGY

### Phase A — Auth Flow Redesign (No Backend Changes)
**Goal**: Admin lands on dashboard first. Admin Panel accessed via button.

- `login.html` after successful login → redirect to `dashboard.html` always (not `index.html`)
- `api.js` `redirectByRole()` → redirect ADMIN to `dashboard.html` (not `admin.html`)
- `dashboard.js` → change `requireRole('CUSTOMER')` to `requireRole('CUSTOMER', 'ADMIN', 'ORGANIZER')` — or simply check `isLoggedIn()`
- `dashboard.html` navbar → inject "Admin Panel" button conditionally if `user.role === 'ADMIN'`
- `dashboard.html` navbar → inject "Organizer Panel" button if `user.role === 'ORGANIZER'`
- `admin.html` → add "← Back to Dashboard" link in the navbar

### Phase B — Admin Navbar + Responsive Sidebar Fix
**Goal**: Admin panel accessible on all screen sizes.

- Add burger menu button to `admin.html` navbar
- Sidebar in admin should work as a proper drawer on mobile (toggle via burger)
- Fix CSS: Add `--bg-subtle` token to `:root` and `[data-theme="dark"]`
- Add CSS classes for: admin sidebar drawer behavior, overlay on mobile

### Phase C — Users View Upgrade
**Goal**: Advanced filtering + User Intelligence popup.

**Frontend changes only:**
- Add filter dropdown button beside search bar
  - Filter by: Role (ADMIN / ORGANIZER / CUSTOMER), Approved status
- Add "Details" button per user row
- User Details modal showing:
  - Role + Approved status + Join date
  - Request count + Invite history (ACCEPTED / DECLINED / PENDING)
  - Active subscriptions (from family memberships)
  - Engagement summary (calculated from data already loaded)

**Note**: No new backend endpoints needed — all data is already loaded via `loadUsers()`, `loadInvites()`, `loadRequests()`. We cross-reference in JS.

### Phase D — Service Requests Timestamp Column
**Goal**: Admin can see when each request was submitted.

- `admin.html` requests table: add `<th>Submitted</th>` column
- `admin.js` `renderRequests()`: add `<td>${fmtDate(r.createdAt)}</td>` to each row
- `ServiceRequestResponse.java` already includes `createdAt` ✅ — no backend changes needed

### Phase E — Subscriptions / Active Services Monitoring Panel
**Goal**: New "Subscriptions" view in admin panel tracking active families.

**New sidebar link**: "📦 Subscriptions"

**Data needed**:
- Families list (already loaded via `Admin.getFamilies()`) — has: name, serviceName, planName, isActive, createdAt
- Family members per family (needs new API call)

**Missing data for expiry tracking**:
- The `families` table has no `start_date` or `expires_at` column
- The `family_members` table has `joined_at` but no subscription end date

**Schema decision required**:
> **Option A (Recommended)**: Add `start_date TIMESTAMPTZ` and `expires_at TIMESTAMPTZ` columns to the `families` table. This allows tracking renewal timelines per family.
> **Option B (Simpler)**: Calculate expiry from `families.created_at + plan duration` (but plan duration is a text string like "1 Month", not structured).

I will implement **Option A** — adding `start_date` and `expires_at` to families. This requires:
- SQL migration to add columns
- `Family.java` entity update
- `FamilyResponse.java` DTO update
- `AdminController.java` `createFamily` to accept start/expires
- `CreateFamilyDto.java` update
- Admin UI: display these dates + compute status

### Phase F — Members Button Fix in Admin Families Panel
**Goal**: Fix the broken `openMembersModal()` stub in `admin.js`.

**Root cause**: `openMembersModal(familyId, familyName)` in `admin.js` has a comment stub — it never calls the API. It needs to call `Organizer.getMembers(familyId)` (which maps to `GET /api/families/{id}/members`) and display the result in a proper members modal.

**Fix**:
- Implement the full `openMembersModal()` function
- Add a members modal to `admin.html`
- The backend endpoint `GET /api/families/{id}/members` already works for ADMIN

---

## PART 5: CHANGE SUMMARY TABLE

| Change | Type | Files Affected | Backend Change? |
|---|---|---|---|
| A1: Admin lands on dashboard after login | Frontend | `login.html`, `api.js` | No |
| A2: Dashboard allows ADMIN/ORGANIZER | Frontend | `dashboard.js` | No |
| A3: Admin Panel button in dashboard navbar | Frontend | `dashboard.html`, `dashboard.js` | No |
| A4: Back to Dashboard in admin navbar | Frontend | `admin.html` | No |
| B1: Admin burger button + responsive sidebar | Frontend | `admin.html`, `admin.js`, `styles.css` | No |
| B2: Fix `--bg-subtle` CSS variable | Frontend | `styles.css` | No |
| C1: User filter dropdown | Frontend | `admin.html`, `admin.js` | No |
| C2: User Details intelligence modal | Frontend | `admin.html`, `admin.js` | No |
| D1: Timestamp column in requests table | Frontend | `admin.html`, `admin.js` | No |
| E1: Add expires_at to families table | **Backend + DB** | `schema.sql` (migration), `Family.java`, `FamilyResponse.java`, `CreateFamilyDto.java`, `AdminController.java` | **YES** |
| E2: Subscriptions monitoring view | Frontend | `admin.html`, `admin.js` | No |
| F1: Fix broken Members modal in admin | Frontend | `admin.html`, `admin.js` | No |

---

## PART 6: ASSUMPTIONS

1. The `plans` table exists in the live Supabase DB (it was added after schema.sql v1 — seed_data.sql confirms it). 
2. Family expiry tracking will be handled by adding `start_date` and `expires_at` to the `families` table. The admin will set these when creating a family.
3. The "EXPIRING SOON" threshold is defined as: `expires_at` within the next 7 days.
4. ADMIN users retain CUSTOMER capabilities (can request services, view invites) — this is the main UX goal of Phase A.
5. No Supabase Auth migration is attempted in this upgrade — the stubbed auth remains as-is.

---

## AWAITING YOUR CONFIRMATION

Before I write a single line of code, please confirm:

1. ✅ **Auth flow change**: Admin redirects to `dashboard.html` after login (not `admin.html`)
2. ✅ **Subscription tracking**: Add `start_date` and `expires_at` to the `families` table (requires DB migration SQL + backend changes)
3. ✅ **Service request creation**: Should ADMIN role be allowed to submit service requests as a user? (Currently blocked by `@PreAuthorize("hasRole('CUSTOMER')")`)
4. ✅ **Expiry threshold**: Is 7 days the right "EXPIRING SOON" window?

Once confirmed, I will implement all changes in the order listed above, phased and explained as I go.
