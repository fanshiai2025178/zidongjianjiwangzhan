# AI Video Creation Platform

## Overview

This is an AI-powered video creation platform that enables users to create professional videos through multiple creation modes. The platform provides a complete 5-step workflow for AI original video creation (Style → Script → Segments → Descriptions → Result), with planned support for commentary and reference video modes. Built with a modern tech stack, it offers a dark-themed creative studio interface optimized for content creation workflows.

## Recent Changes (October 15, 2025)

**UI Optimization & Image Display (Latest)**
- **UI Improvements**: Description text fully visible (no truncation), edit button as hover-only icon
- **Image Display**: Added image preview with aspect-video ratio, regenerate button
- **Status Display**: Real-time batch generation status - "生成中" and "等待生成" indicators
- **Backend Fix**: Increased body size limit to 10mb to fix PayloadTooLargeError
- Status tracking: `currentGeneratingDescId`, `currentGeneratingImageId`, `currentGeneratingVideoId`
- Visual feedback: Full opacity spinner for "生成中", 50% opacity for "等待生成"
- Image API: Volcengine integration with detailed logging and error handling

**Critical Bug Fixes - Description & Segment Persistence**
- **Fixed**: Segments disappearing after generation - now auto-save to backend immediately
- **Fixed**: Descriptions disappearing after generation - all operations auto-save
- **Fixed**: Chinese description generation - changed from English to Chinese prompts
- **Fixed**: English segments auto-translation - now automatically translates after generation
- Implemented `saveSegmentsToProject` helper for consistent persistence
- Auto-save triggers: segment generation, cut, merge, description/image/video generation, edits
- Auto-translation: English segments automatically translated to Chinese after generation
- DeepSeek prompts updated: "使用中文编写，描述具体生动，200字以内"

**Table-Style Layout with Batch Generation**
- Redesigned descriptions page as complete table layout with borders and column alignment
- Batch generation buttons integrated in table header row: "批量生成描述词" | "批量生成图片" | "批量生成视频"
- Table columns: 编号 (1) | 文案 (2) | 翻译 (2) | 分镜画面描述词 (3) | 生成图片 (2) | 生成视频 (2)
- Each column has batch button in header aligned with content below
- Added "编辑" button below each description (visible by default, not on hover)
- Individual generation buttons: "生成" → "生成中" → "已生成" state progression
- Full-width buttons in each column for consistent alignment
- Border-separated table cells with padding for clean visual structure
- Sequential batch processing for descriptions, images, and videos
- Image generation API (placeholder implementation - ready for VolcEngine integration)

**Description Generation Page Implementation**
- Created complete descriptions page following design reference
- Implemented DeepSeek API integration for scene description generation
- Added card-based layout with segment details (number, text, translation, description)
- Integrated edit functionality with textarea and save/cancel actions
- Built export panel with segment count and duration calculation
- Added collapsible help section for export guidance

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