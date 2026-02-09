# Konsultasi SNBP

## Overview

Konsultasi SNBP is a mobile-first application built with Expo (React Native) and an Express.js backend. It serves as a consultation tool for Indonesian students preparing for SNBP (Seleksi Nasional Berdasarkan Prestasi) — a national university admission pathway based on academic achievement. The app allows students to input their personal data, grades, and achievements, select target universities/programs, and receive an analysis of their admission chances.

The app uses a multi-screen wizard flow: Login → Dashboard → Student Data → Grades → Achievements → University Selection → Analysis. It also supports uploading Excel files containing university program data (daya tampung, peminat, passing grade, etc.) to power the analysis engine.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Expo / React Native)
- **Framework**: Expo SDK 54 with expo-router for file-based routing
- **Screens**: Located in `app/` directory using expo-router conventions. Key screens: `index.tsx` (login), `dashboard.tsx`, `student.tsx`, `grades.tsx`, `achievements.tsx`, `selection.tsx`, `analysis.tsx`, `upload.tsx`
- **State Management**: React Context (`lib/consultation-context.tsx`) manages all consultation data (student info, grades, achievements, university selections, analysis results). Data is persisted locally via `@react-native-async-storage/async-storage`
- **Data Fetching**: `@tanstack/react-query` with a custom API client (`lib/query-client.ts`) that handles CORS and Replit domain resolution
- **Styling**: Plain React Native `StyleSheet` objects, no CSS-in-JS library. Color constants defined in `constants/colors.ts`
- **Fonts**: Inter font family loaded via `@expo-google-fonts/inter`
- **Authentication**: Simple hardcoded credential check (username: "attin", password: "snbp2026") — no server-side auth
- **University Logos**: Static mapping of university names to hosted image URLs in `lib/university-logos.tsx`, served via a React Context

### Backend (Express.js)
- **Location**: `server/` directory — `index.ts` (entry point), `routes.ts` (API routes), `storage.ts` (data layer)
- **Primary API endpoint**: `POST /api/upload-excel` — accepts base64-encoded Excel files, parses them with the `xlsx` library, and returns structured program studi data
- **Storage**: Currently uses in-memory storage (`MemStorage` class) for users. Drizzle ORM schema is defined but the PostgreSQL database is provisioned but not actively used for the main app flow
- **CORS**: Dynamically configured based on Replit environment variables and localhost origins
- **Static serving**: In production, serves a landing page from `server/templates/landing-page.html` and built web assets

### Database Schema (Drizzle ORM + PostgreSQL)
- **Tables**: Single `users` table with `id` (UUID), `username`, and `password` fields
- **ORM**: Drizzle ORM with `drizzle-zod` for schema validation
- **Config**: `drizzle.config.ts` points to `shared/schema.ts`, migrations output to `./migrations`
- **Note**: The database schema is minimal and the app primarily uses client-side storage. The DB infrastructure is set up but underutilized

### Build & Deployment
- **Development**: Two processes needed — `expo:dev` for the Expo dev server and `server:dev` for the Express backend
- **Production build**: `expo:static:build` creates static web assets, `server:build` bundles the server with esbuild, `server:prod` runs the production server
- **Database migrations**: `db:push` uses drizzle-kit to push schema changes

## External Dependencies

### Core Technologies
- **Expo SDK 54** — React Native framework with managed workflow
- **Express.js 5** — Backend HTTP server
- **PostgreSQL** — Database (via `DATABASE_URL` env var), managed through Drizzle ORM
- **React 19.1** — UI library

### Key Libraries
- **xlsx** — Server-side Excel file parsing for university program data upload
- **drizzle-orm / drizzle-kit** — Database ORM and migration tooling
- **@tanstack/react-query** — Server state management and caching
- **expo-router** — File-based navigation
- **expo-print / expo-sharing** — PDF generation and sharing for analysis results
- **expo-document-picker** — File selection for Excel upload
- **expo-image** — Optimized image rendering (university logos)
- **react-native-reanimated** — Animations
- **react-native-keyboard-controller** — Keyboard-aware scrolling
- **http-proxy-middleware** — Development proxy between Expo and Express

### Environment Variables
- `DATABASE_URL` — PostgreSQL connection string (required for DB operations)
- `REPLIT_DEV_DOMAIN` — Used for CORS and Expo packager configuration
- `EXPO_PUBLIC_DOMAIN` — Public API domain exposed to the client
- `REPLIT_INTERNAL_APP_DOMAIN` — Used in production builds for deployment domain resolution