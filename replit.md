# AI Video Creation Platform

## Overview

This is an AI-powered video creation platform designed to streamline professional video production through various creation modes. It features a comprehensive 5-step workflow for AI-original video creation (Style → Script → Segments → Descriptions → Result), with future plans for commentary and reference video modes. The platform offers a dark-themed creative studio interface, built with a modern tech stack, focused on optimizing content creation workflows. Key capabilities include smart description generation with character and style consistency, intelligent aspect ratio handling, and advanced prompt optimization for video and image generation.

## Recent Changes (October 16, 2025)

**描述词中英文分离显示（最新）**
- **第4步（生成描述）**：显示中文描述词，标注（中文）
- **第6步（生成素材）**：描述词列显示中英文双语描述，分别标注（中文）（英文）
- **API自动翻译**：描述词生成API先生成英文描述，然后自动翻译为中文
- **数据模型更新**：Segment接口新增sceneDescriptionEn字段存储英文描述词
- **独立API处理**：使用专用火山引擎DeepSeek API同时生成中英文描述
- **完整支持**：单个生成、批量生成均支持中英文描述词

**步骤流程重新排序**
- **流程调整**：将"风格定制"从第1步移至第5步（生成描述和生成素材之间）
- **新的7步工作流**：
  1. 输入文案 - 用户输入创作文案
  2. 智能分段 - AI自动分段为多个镜头
  3. 选择流程 - 选择文生视频或文生图+图生视频
  4. 生成描述 - AI生成每个镜头的英文描述词
  5. 风格定制 - 设置角色参考图、风格参考图或预设风格
  6. 生成素材 - 提示词优化、批量生成图片和视频
  7. 导出成片 - 最终成片预览和导出
- **导航逻辑更新**：首页直接进入"输入文案"，描述生成后进入"风格定制"
- **设计理念**：先完成内容创作，再进行风格定制，使流程更符合创作逻辑

**提示词优化功能 + 自动端点ID纠正**
- **功能恢复**：将第6步"关键词提取"替换为"提示词优化"功能
- **专用API端点**：
  - `/api/prompts/optimize` - 单个提示词优化
  - `/api/prompts/batch-optimize` - 批量提示词优化
- **专属火山引擎配置**：
  - `VOLCENGINE_OPTIMIZE_API_KEY`: ep-20251016064746-rb9dk（提示词优化专用端点）
  - `VOLCENGINE_ACCESS_KEY`: Bearer Token主密钥
- **自动纠正机制**：如果端点ID格式不正确（不以ep-开头），自动使用正确的端点ID
- **智能优化策略**：
  - 文生视频：增强动态描述、镜头语言、时间结构
  - 文生图：优化构图细节、光影氛围、视觉层次
- **数据模型**：Segment接口新增`optimizedPrompt`字段存储优化结果
- **表格布局更新**：提示词优化 | 批量生成图片 | 批量生成视频

**火山引擎API认证方法变更（重要）**
- **认证方式升级**：所有火山引擎ARK API从AK/SK签名认证迁移至Bearer Token认证
- **移除依赖**：完全移除`@volcengine/openapi` Signer依赖，简化代码结构
- **统一认证**：所有API端点现使用统一的Bearer Token认证方式
- **API密钥配置**：
  - `VOLCENGINE_ACCESS_KEY`: 主API密钥（UUID格式，用作Bearer Token）
  - `VOLCENGINE_DEEPSEEK_API_KEY`: 描述词生成端点ID（ep-20251016061331-8bgnk）
  - `VOLCENGINE_KEYWORD_API_KEY`: 关键词提取端点ID（ep-20251016063909-7l6gr）
- **认证格式**：`Authorization: Bearer <VOLCENGINE_ACCESS_KEY>`
- **已验证端点**：
  - `/api/descriptions/generate` - 单个描述词生成 ✅
  - `/api/descriptions/batch-generate` - 批量描述词生成 ✅
  - `/api/keywords/extract` - 单个关键词提取 ✅
  - `/api/keywords/batch-extract` - 批量关键词提取 ✅

**关键词提取功能（最新）**
- **第6步功能替换**：将"提示词优化"完全替换为"关键词提取"功能
- **专用API端点**：
  - `/api/keywords/extract` - 单个关键词提取
  - `/api/keywords/batch-extract` - 批量关键词提取
- **专属火山引擎DeepSeek配置**：
  - `VOLCENGINE_KEYWORD_ENDPOINT_ID`: ep-20251016063909-7l6gr（关键词提取专用）
  - `VOLCENGINE_KEYWORD_API_KEY`: 关键词提取专用密钥
- **API严格分离**：关键词提取API仅用于第6步，不影响其他任何功能
- **提取策略**：从描述词中提取5类关键词（主体、场景、动作、风格、情绪）
- **数据模型更新**：Segment接口新增`keywords`字段存储提取结果
- **UI更新**：表格表头"提示词优化"改为"关键词提取"，按钮文字同步更新
- **完整功能**：单个提取、批量提取、编辑保存全部可用

**火山引擎DeepSeek批量生成接入**
- **专属批量API**：创建 `/api/descriptions/batch-generate` 专门用于批量生成描述词
- **火山引擎DeepSeek集成**：使用火山引擎DeepSeek API专用端点提供批量描述词生成服务
- **独立密钥配置**：
  - `VOLCENGINE_DEEPSEEK_ENDPOINT_ID`: 火山引擎DeepSeek端点ID（如：ep-20251016061331-8bgnk）
  - `VOLCENGINE_DEEPSEEK_API_KEY`: 火山引擎DeepSeek API密钥
- **API分离策略**：
  - 单个生成：使用火山引擎DeepSeek API（`/api/descriptions/generate`）
  - 批量生成：使用火山引擎DeepSeek API（`/api/descriptions/batch-generate`）
  - 关键词提取：使用专用火山引擎DeepSeek API（`/api/keywords/extract`）
- **批量处理优势**：一次性提交多个片段，服务端批量处理，提升效率
- **专用API保障**：每个功能使用专属火山引擎端点，互不影响

**新增第6步：生成素材页面**
- **流程重组**：将"5生成描述"后的素材生成功能独立为"6生成素材"步骤
- **功能迁移**：批量生成图片和批量生成视频从描述页面迁移至素材页面
- **关键词提取**：使用专用火山引擎DeepSeek API提取描述词关键词
- **表格布局**：关键词提取 | 批量生成图片 | 批量生成视频
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

-   **DeepSeek API (deepseek-chat model)**: For intelligent text segmentation and English-to-Chinese translation.
-   **火山引擎DeepSeek API**:
    -   端点 ep-20251016061331-8bgnk：专用于描述词生成（单个和批量）
    -   端点 ep-20251016063909-7l6gr：专用于关键词提取（单个和批量）
-   **聚光Chat API (gemini-2.5-flash-image-preview model)**: For image generation.