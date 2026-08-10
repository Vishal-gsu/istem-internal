---
name: frontend-architecture
description: Skill for evaluating and architecting Next.js frontend projects for maintainability, state management, and best practices.
---

# Frontend Architecture Best Practices

When analyzing or building React/Next.js frontends, enforce the following architecture guidelines based on open-source standards (like Bulletproof React and Cal.com):

## 1. State Management (Zustand & Context)
- **Local State**: Use `useState` for UI-specific state (e.g., toggles, form inputs).
- **Global State**: Use Zustand (`store/`) for global, complex, or cross-component state (e.g., tasks, meetings).
- **Auth/Session**: Use Context API (`AuthProvider.tsx`) specifically for session data.

## 2. Component Structure
- Maintain strict separation of concerns.
- Place reusable UI elements in `src/components/`.
- Use the `app/` router strictly for page routing and layouts.
- Extract complex business logic into custom hooks (`src/hooks/` or `src/lib/`).

## 3. Design & Styling (Tailwind CSS)
- Maintain a single source of truth for design tokens (colors, spacing, fonts) in `globals.css` or `tailwind.config.ts`.
- Avoid arbitrary values (e.g., `w-[324px]`) where standard Tailwind classes suffice.
- Ensure all layouts are responsive. Sidebar and Header must never overlap content (`pt-16`, `ml-16`).

## 4. Performance & Feasibility
- Use `"use client"` only at the leaf nodes or where interactivity (hooks, event listeners) is strictly required.
- Minimize bundle size by avoiding heavy client-side libraries where Server Components can handle the logic.
