# AI Video Creation Platform

## Overview

This is an AI-powered video creation platform designed to streamline professional video production through various creation modes. It features a comprehensive 5-step workflow for AI-original video creation (Style → Script → Segments → Descriptions → Result), with future plans for commentary and reference video modes. The platform offers a dark-themed creative studio interface, built with a modern tech stack, focused on optimizing content creation workflows. Key capabilities include smart description generation with character and style consistency, intelligent aspect ratio handling, and advanced prompt optimization for video and image generation.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with **React 18** and **TypeScript**, utilizing **Vite** for fast development and optimized builds. **Wouter** handles lightweight routing, and **TanStack Query** manages server state, caching, and API requests. The UI uses **shadcn/ui** components built on Radix UI, styled with **Tailwind CSS**, adopting a dark-first design system inspired by Linear/Notion workflows and Adobe Creative Cloud visuals. State management primarily uses React Context API for global project state and local component state for UI interactions.

### Backend Architecture

The backend is developed with **Express.js** and **TypeScript**, providing a RESTful API for managing video creation projects. It includes middleware for JSON parsing and error handling. API design follows resource-based conventions, with validation using **Zod** schemas. The development environment supports hot module replacement and uses `esbuild` for production server bundling.

### Data Storage Solutions

**PostgreSQL** serves as the primary database, integrated with **Neon Database** for serverless operations. **Drizzle ORM** is used for type-safe database interactions and schema management, with `drizzle-kit` for migrations and `drizzle-zod` for automatic validation schema generation. An `MemStorage` class provides an in-memory option for development. Core data models include `Projects`, `Style Settings`, and `Segments`, tracking the video creation process.

### Authentication & Authorization

Currently, the platform lacks an authentication system. It is designed for future integration of session-based authentication using PostgreSQL for session storage and Express session middleware.

### Key Architectural Decisions

-   **Multi-Step Workflow Architecture**: A centralized `ProjectProvider` manages global project state and step progression, enabling a clear, modular workflow and persistent state across user sessions.
-   **Storage Abstraction Layer**: An `IStorage` interface allows flexible switching between in-memory (`MemStorage`) and database (PostgreSQL) storage, facilitating rapid development and easy production deployment.
-   **Type-Safe Schema Management**: Utilizing Drizzle ORM ensures a single source of truth for database schemas, TypeScript types, and Zod validation schemas, enhancing consistency and reliability.
-   **Component-First Design System**: Leveraging `shadcn/ui` with local component ownership and Tailwind CSS allows for a highly customizable, accessible, and consistent UI design system without external library dependencies.

## External Dependencies

### UI & Component Libraries

-   **Radix UI**: Headless accessible components.
-   **Lucide React**: Icon library.
-   **class-variance-authority**: Type-safe CSS variant management.
-   **tailwind-merge & clsx**: Utility class composition.

### Form & Validation

-   **React Hook Form**: Form state management.
-   **@hookform/resolvers**: Schema validation resolvers.
-   **Zod**: Runtime type validation.

### Date & Time

-   **date-fns**: Date manipulation and formatting.

### Development Tools

-   **@replit/vite-plugin-runtime-error-modal**: Error overlay.
-   **@replit/vite-plugin-cartographer**: Code mapping.
-   **@replit/vite-plugin-dev-banner**: Development indicator.

### Build & Development

-   **esbuild**: Fast server bundling.
-   **tsx**: TypeScript execution for development server.
-   **PostCSS with Autoprefixer**: CSS processing.

### API Integrations

-   **DeepSeek API (deepseek-chat model)**: For intelligent text segmentation, English-to-Chinese translation, and description generation.
-   **聚光Chat API (gemini-2.5-flash-image-preview model)**: For image generation.