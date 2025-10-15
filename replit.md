# AI Video Creation Platform

## Overview

This is an AI-powered video creation platform that enables users to create professional videos through multiple creation modes. The platform provides a complete 5-step workflow for AI original video creation (Style → Script → Segments → Descriptions → Result), with planned support for commentary and reference video modes. Built with a modern tech stack, it offers a dark-themed creative studio interface optimized for content creation workflows.

## Recent Changes (October 15, 2025)

**Description Generation Page Implementation**
- Created complete descriptions page following design reference
- Implemented DeepSeek API integration for scene description generation
- Added card-based layout with segment details (number, text, translation, description)
- Integrated edit functionality with textarea and save/cancel actions
- Built export panel with segment count and duration calculation
- Added collapsible help section for export guidance
- Updated workflow: Segments → Descriptions (skipping generation mode for now)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- **React 18** with TypeScript for type-safe component development
- **Vite** as the build tool and development server, providing fast HMR and optimized production builds
- **Wouter** for lightweight client-side routing instead of React Router
- **TanStack Query (React Query)** for server state management, caching, and API request handling

**UI Component System**
- **shadcn/ui** component library built on Radix UI primitives
- **Tailwind CSS** for utility-first styling with custom design tokens
- Dark-first design system with support for light mode toggle
- Comprehensive component library including forms, dialogs, navigation, data display, and feedback components

**State Management Pattern**
- React Context API for global project state management (`ProjectProvider`)
- Local component state for UI interactions
- Server state managed through React Query with automatic caching and refetching

**Design System**
- Dark mode primary with Linear/Notion workflow patterns
- Adobe Creative Cloud visual treatment
- Custom color palette with HSL color variables
- Inter font family with Noto Sans SC for Chinese support
- Progressive disclosure through step-by-step workflows

### Backend Architecture

**Server Framework**
- **Express.js** with TypeScript for RESTful API
- Middleware for JSON parsing, URL encoding, and request/response logging
- Custom error handling middleware for consistent error responses

**API Design Pattern**
- RESTful endpoints following resource-based conventions
- CRUD operations for project management (`/api/projects`)
- Validation using Zod schemas derived from database schema
- Centralized API request utility with error handling

**Development Environment**
- Hot module replacement in development via Vite middleware integration
- Separate production build process using esbuild for server bundling
- Environment-based configuration (NODE_ENV)

### Data Storage Solutions

**Database**
- **PostgreSQL** as the primary database (configured for use with Drizzle ORM)
- **Neon Database** serverless PostgreSQL driver (`@neondatabase/serverless`)
- Connection pooling and serverless-optimized queries

**ORM & Schema Management**
- **Drizzle ORM** for type-safe database operations
- Schema-first approach with TypeScript types generated from database schema
- **Drizzle-Zod** for automatic validation schema generation
- Migration support through `drizzle-kit`

**In-Memory Storage (Development)**
- `MemStorage` class implements `IStorage` interface for development/testing
- Map-based storage for projects with UUID generation
- Provides same interface as production storage for easy switching

**Data Models**
- **Projects**: Core entity storing video creation projects with metadata
  - Creation mode tracking (ai-original, commentary, reference)
  - Step progression (currentStep field)
  - Style settings (JSONB)
  - Script content and segments (JSONB)
  - Generation mode preferences
- **Style Settings**: Configuration for character/style references
- **Segments**: Video script breakdown with translations and scene descriptions

### Authentication & Authorization

**Current Implementation**
- No authentication system currently implemented
- Session management dependencies included (`connect-pg-simple`) but not active
- Prepared for future implementation with Express session support

**Planned Approach**
- Session-based authentication using PostgreSQL session store
- Express session middleware with secure cookie configuration
- User context to be integrated with ProjectProvider

### External Dependencies

**UI & Component Libraries**
- Radix UI primitives (@radix-ui/*) - 20+ headless accessible components
- Lucide React - Icon library
- class-variance-authority - Type-safe CSS variant management
- tailwind-merge & clsx - Utility class composition

**Form & Validation**
- React Hook Form - Form state management
- @hookform/resolvers - Schema validation resolvers
- Zod - Runtime type validation

**Date & Time**
- date-fns - Date manipulation and formatting

**Development Tools**
- @replit/vite-plugin-runtime-error-modal - Error overlay in development
- @replit/vite-plugin-cartographer - Code mapping (Replit environment)
- @replit/vite-plugin-dev-banner - Development environment indicator

**Visualization**
- Recharts - Charting library (included but not currently used)
- embla-carousel-react - Carousel components

**Build & Development**
- esbuild - Fast server bundling for production
- tsx - TypeScript execution for development server
- PostCSS with Autoprefixer - CSS processing

## Key Architectural Decisions

### Multi-Step Workflow Architecture

**Problem**: Video creation requires complex multi-step processes with state persistence across navigation

**Solution**: Implemented a centralized project state management system with step progression tracking
- `ProjectProvider` manages global project state with step-specific update methods
- Step progress component provides visual feedback on workflow position
- localStorage persistence for project continuity across sessions
- Backend project API ensures state persistence

**Benefits**: 
- Clear separation of concerns between workflow steps
- Easy to add new steps or modify existing workflows
- Consistent user experience with progress tracking

### Storage Abstraction Layer

**Problem**: Need flexibility to switch between in-memory and database storage during development

**Solution**: Created `IStorage` interface with multiple implementations
- `MemStorage` for rapid development and testing
- Database storage layer ready for production use
- Same API contract regardless of underlying storage

**Benefits**:
- Faster development iteration without database setup
- Easy migration to production database
- Testable storage layer

### Type-Safe Schema Management

**Problem**: Keeping TypeScript types, validation schemas, and database schema in sync

**Solution**: Single source of truth using Drizzle ORM schema
- Database schema defined in TypeScript
- Automatic type inference for queries
- Zod schemas generated from database schema using drizzle-zod
- Validation and types always synchronized

**Benefits**:
- Eliminates type mismatches between layers
- Automatic validation from database constraints
- Refactoring safety with TypeScript

### Component-First Design System

**Problem**: Maintaining consistent UI across complex workflows while allowing customization

**Solution**: shadcn/ui approach with local component ownership
- Components copied into project for full control
- Built on Radix UI for accessibility
- Tailwind for styling with CSS variables for theming
- Customizable without library version constraints

**Benefits**:
- Full design system control
- No breaking changes from library updates
- Accessible by default
- Easy customization per project needs