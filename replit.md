# AI Video Creation Platform

## Overview

This is an AI-powered video creation platform designed to streamline professional video production through various creation modes. It features a comprehensive 5-step workflow for AI-original video creation (Style → Script → Segments → Descriptions → Result), with future plans for commentary and reference video modes. The platform offers a dark-themed creative studio interface, built with a modern tech stack, focused on optimizing content creation workflows. Key capabilities include smart description generation with character and style consistency, intelligent aspect ratio handling, and advanced prompt optimization for video and image generation.

## Recent Changes (October 15, 2025)

**新增第6步：生成素材页面（最新）**
- **流程重组**：将"5生成描述"后的素材生成功能独立为"6生成素材"步骤
- **功能迁移**：批量生成图片和批量生成视频从描述页面迁移至素材页面
- **提示词优化**：新增提示词优化功能，使用DeepSeek API优化描述词（详细规则待定）
- **表格布局**：提示词优化 | 批量生成图片 | 批量生成视频
- **7步工作流**：风格定制 → 输入文案 → 智能分段 → 选择流程 → 生成描述 → 生成素材 → 导出成片

**描述词英文输出 + 批量生成停止功能**
- **描述词英文化**：所有AI生成的描述词现在以英文输出，更适合主流AI图片/视频生成模型
- **批量生成停止**：所有批量生成操作（描述词/图片/视频）在进行中时显示"生成中...（停止）"
- **即时停止控制**：点击停止按钮可立即中断批量生成，已生成内容保留
- **智能反馈**：停止后显示实际生成数量，如"已停止，成功生成 3 个描述"

**智能描述词生成系统 - 角色/风格一致性**
- **角色一致性保障**：强制要求AI在所有镜头中保持相同角色特征（外貌、服装、姿态）
- **风格融合深化**：详细的预设风格描述映射（8种风格：Cinema、Anime、Realistic、Fantasy、Retro、Minimalist、Noir、Cyberpunk）
- **参考图指导增强**：角色参考图和风格参考图的具体要求明确化（英文指令）
- **文生视频vs文生图差异化**：
  - 文生视频：强调动态动作、镜头运动、时间演进（push/pull/pan/tilt等镜头语言）
  - 文生图：强调静态定格、空间构图、瞬间捕捉（层次、质感、氛围）
- **故事连贯性**：确保多个片段保持视觉风格和角色形象的完全统一

**比例变更智能提示系统**
- **自动追踪比例**：每个描述词记录生成时的比例（descriptionAspectRatio字段）
- **比例不匹配警告**：显示"⚠️ 比例已变更（16:9 → 9:16），建议重新生成"
- **智能批量生成**：自动识别需要重新生成的片段（无描述词或比例不匹配）
- **单个重新生成**：点击重新生成按钮只影响当前片段，不会全部重新生成

**UI交互优化**
- **图片预览改进**：悬浮显示居中放大图标，不遮挡画面内容
- **错误提示优化**：识别内容过滤错误，提示"内容被过滤，请重新生成或编辑描述词"
- **翻译状态简化**：未翻译片段显示红色斜体"请稍等"

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