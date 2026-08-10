---
name: security-auditor
description: Skill for auditing Next.js applications for security, robust backend connections, and vulnerability prevention.
---

# Next.js Security Auditor Checklist

Always apply this checklist when evaluating or building Next.js apps:

## 1. Authentication & API Security
- **Cross-Origin / CORS**: Use Next.js Rewrites (`next.config.ts`) to proxy API requests to backend services (e.g., `/api/:path*` -> `http://127.0.0.1:8000/api/:path*`). This prevents CORS preflight issues and ensures cookies are sent correctly via `credentials: "include"`.
- **Session Management**: Session cookies MUST be `httpOnly` and `sameSite=Lax` or `Strict`. 
- **Protected Routes**: Wrap sensitive layouts in an `AuthProvider` that validates the session on load and redirects to login on 401 Unauthorized.

## 2. Server/Client Boundary
- Never leak sensitive environment variables to the client. Only prefix with `NEXT_PUBLIC_` if strictly required by the browser.
- Input validation (e.g., Zod) must happen on the Backend API or Next.js Server Actions, not just the frontend form.

## 3. Error Handling & Latency
- **Graceful Degradation**: Catch `fetch` errors and network timeouts. Do not let unhandled promise rejections crash the UI.
- **Latency**: Keep client-server roundtrips low. A reverse proxy (Next.js rewrites) is highly efficient, avoiding preflight `OPTIONS` requests latency.

## 4. UI Security
- Avoid `dangerouslySetInnerHTML`. If necessary, sanitize data first (e.g., `DOMPurify`).
- Enforce strict typing via TypeScript interfaces for all API responses to prevent runtime structural errors.
