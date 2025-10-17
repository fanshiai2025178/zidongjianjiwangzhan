# AI Video Creation Platform

## Overview

This AI-powered video creation platform streamlines professional video production through various creation modes, including a 5-step workflow for AI-original video (Style → Script → Segments → Descriptions → Result). The platform aims to expand with commentary and reference video modes. It features a dark-themed creative studio, optimizing content creation workflows with smart description generation, consistent character/style, intelligent aspect ratio handling, and advanced prompt optimization for video and image generation. The project's ambition is to revolutionize video production by offering an efficient, high-quality, and scalable AI-driven solution.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions

The platform features a dark-themed creative studio interface, drawing inspiration from professional tools like Linear/Notion and Adobe Creative Cloud. It utilizes `shadcn/ui` components built on Radix UI and styled with Tailwind CSS, ensuring a customizable, accessible, and consistent design system. The user workflow is structured as a clear, multi-step process managed by a centralized `ProjectProvider`.

### Technical Implementations

-   **Frontend**: Built with React 18 and TypeScript, using Vite for development, Wouter for routing, and TanStack Query for server state management. React Context API manages global state.
-   **Backend**: Developed with Express.js and TypeScript, offering a RESTful API with Zod for validation.
-   **Data Storage**: PostgreSQL, leveraged via Neon Database for serverless deployment, with Drizzle ORM for type-safe interactions and schema management.
-   **AI Workflow**: Implements a "Director + Storyboard Artist" two-step architecture. The "Director" (API 0) generates a Visual Bible for global consistency across the entire script. The "Storyboard Artist" (API 1) then generates objective Chinese scene descriptions for individual segments based on the Visual Bible.
-   **Prompt Optimization**: Features dedicated API endpoints for single and batch prompt optimization, specifically tailored for video (dynamic descriptions, camera language) and image generation (composition, lighting).
-   **Multi-language Support**: All translation needs use dedicated Volcengine DeepSeek translation API endpoint:
    -   **Segment Translation** (English→Chinese): English script segments auto-translated to Chinese for user viewing.
    -   **Descriptions** (Chinese→English): Chinese version for user viewing/editing, English version auto-translated for AI material generation.
    -   **Keywords** (Chinese→English): Chinese version (`keywords`) for user viewing/editing, English version (`keywordsEn`) auto-generated/translated for AI consumption.
    -   User edits to Chinese content automatically trigger translation API to update English versions.
    -   All translation operations use `VOLCENGINE_TRANSLATE_API_KEY` endpoint to avoid resource conflicts.
-   **Consistency Management**: Ensures character and style consistency across segments by using a Visual Bible, detailed preset style mappings, and explicit reference image guidance.
-   **Aspect Ratio Handling**: Automatically tracks and alerts users about aspect ratio changes, suggesting regeneration for consistency.

### Feature Specifications

-   **5-Step AI-Original Video Creation Workflow**: Script → Segments → Descriptions → Style → Result (with planned expansion).
-   **AI Description Generation**: Generates objective scene descriptions, ensuring character and style consistency. Includes automatic English translation for generated descriptions.
-   **Prompt Optimization**: Advanced optimization for both text-to-video and text-to-image prompts.
-   **Material Generation**: Supports batch generation of images and videos based on optimized prompts.
-   **Real-time Feedback**: Provides intelligent feedback during generation processes, including progress and the ability to stop batch operations.
-   **Independent Regeneration**: Allows regeneration of individual segments without affecting others.

### System Design Choices

-   **Multi-Step Workflow Architecture**: A `ProjectProvider` centralizes project state and step progression, enabling a modular workflow and persistent state.
-   **Storage Abstraction Layer**: An `IStorage` interface allows flexible switching between in-memory and database storage.
-   **Type-Safe Schema Management**: Drizzle ORM ensures consistency across database schemas, TypeScript types, and Zod validation schemas.
-   **API Authentication**: All Volcengine ARK APIs use Bearer Token authentication.

## External Dependencies

### API Integrations

-   **DeepSeek API (deepseek-chat model)**: For intelligent text segmentation.
-   **火山引擎DeepSeek API**:
    -   Endpoint `ep-20251016061331-8bgnk` (VOLCENGINE_DEEPSEEK_API_KEY): Dedicated for description generation (single and batch).
    -   Endpoint `ep-20251016063909-7l6gr` (VOLCENGINE_KEYWORD_API_KEY): Dedicated for keyword extraction (single and batch).
    -   Endpoint `ep-20251016064746-rb9dk` (VOLCENGINE_OPTIMIZE_API_KEY): Dedicated for prompt optimization.
    -   Endpoint `ep-20251017114027-mqcbk` (VOLCENGINE_TRANSLATE_API_KEY): Dedicated for Chinese-to-English translation (descriptions and keywords).
    -   All endpoints use `VOLCENGINE_ACCESS_KEY` as Bearer Token for authentication.
-   **聚光Chat API (gemini-2.5-flash-image-preview model)**: For image generation.
-   **Neon Database**: Serverless PostgreSQL.

### UI & Component Libraries

-   **Radix UI**: Headless accessible components.
-   **Lucide React**: Icon library.
-   **shadcn/ui**: Component library.

### Form & Validation

-   **React Hook Form**: Form state management.
-   **Zod**: Runtime type validation.

### Data & State Management

-   **TanStack Query**: Server state management.
-   **Drizzle ORM**: Type-safe database interactions.

### Development & Build Tools

-   **Vite**: Frontend build tool.
-   **esbuild**: Backend bundling.
-   **TypeScript**: Language.
-   **Tailwind CSS**: Styling framework.
-   **PostCSS with Autoprefixer**: CSS processing.