# AI Video Creation Platform - Design Guidelines

## Design Approach

**Selected Approach:** Design System with Creative Studio Aesthetics
**Primary Reference:** Linear + Notion workflow patterns with Adobe Creative Cloud visual treatment
**Justification:** This is a utility-focused, workflow-heavy application requiring clear step progression, data organization, and professional creative tool aesthetics. The dark theme and multi-step process demands systematic consistency while maintaining creative industry credibility.

**Core Design Principles:**
- Progressive disclosure through clear step-by-step workflows
- Professional creative tool aesthetics with dark-first design
- Information hierarchy optimized for content creation tasks
- Generous spacing to reduce cognitive load during complex workflows

---

## Color Palette

### Dark Mode (Primary)
**Background Layers:**
- Primary Background: `0 0% 10%` (#1a1a1a)
- Secondary Background: `0 0% 14%` (#242424)
- Card/Panel Background: `0 0% 16%` (#292929)
- Elevated Elements: `0 0% 20%` (#333333)

**Brand & Interactive:**
- Primary Blue: `210 100% 64%` (#4A9EFF)
- Primary Blue Hover: `210 100% 70%` 
- Success Green: `142 76% 36%`
- Warning Orange: `38 92% 50%`
- Error Red: `0 84% 60%`

**Text:**
- Primary Text: `0 0% 98%` (near white)
- Secondary Text: `0 0% 70%` (muted)
- Tertiary Text: `0 0% 50%` (subtle)

**Borders:**
- Subtle Border: `0 0% 25%` with 50% opacity
- Active Border: Primary Blue at 60% opacity

---

## Typography

**Font Families:**
- Primary: 'Inter', -apple-system, system-ui, sans-serif
- Monospace: 'JetBrains Mono', 'Courier New', monospace (for step numbers, counts)
- Chinese Support: 'Noto Sans SC', sans-serif

**Type Scale:**
- Hero/Page Title: text-4xl (36px) font-bold
- Section Headers: text-2xl (24px) font-semibold
- Card Titles: text-lg (18px) font-medium
- Body Text: text-base (16px) font-normal
- Helper Text: text-sm (14px) font-normal
- Labels/Captions: text-xs (12px) font-medium uppercase tracking-wide

**Line Heights:**
- Headings: leading-tight (1.25)
- Body: leading-relaxed (1.625)
- Compact UI: leading-normal (1.5)

---

## Layout System

**Spacing Primitives:**
- Core units: 4, 8, 12, 16, 24, 32 (as in p-4, m-8, gap-6)
- Section padding: py-12 to py-16 on desktop, py-8 on mobile
- Card padding: p-6 to p-8
- Tight spacing: gap-2 to gap-4
- Generous spacing: gap-8 to gap-12

**Container Strategy:**
- Main Content: max-w-7xl mx-auto px-6
- Workflow Steps: max-w-6xl mx-auto
- Forms/Input Areas: max-w-4xl
- Sidebar Navigation: w-64 to w-72

**Grid Systems:**
- Main Page Cards: grid-cols-1 md:grid-cols-3 gap-6
- Style Gallery: grid-cols-2 md:grid-cols-4 gap-4
- Data Tables: Full-width responsive tables with horizontal scroll

---

## Component Library

### Navigation & Progress
**Top Navigation Bar:**
- Height: h-16, fixed positioning
- Logo left, actions right (Save, Theme Toggle, Account)
- Background: Primary Background with subtle bottom border
- Transparent backdrop-blur when over content

**Step Progress Indicator:**
- Horizontal stepper showing 6 steps
- Active step: Primary Blue with bold text
- Completed: Blue checkmark icon
- Upcoming: Muted gray
- Step numbers in circles, connected by lines
- Responsive: Stack vertically on mobile

### Cards & Panels
**Creation Mode Cards (Main Page):**
- Large cards: min-h-64, rounded-xl
- Gradient overlays on hover (subtle Primary Blue tint)
- Icon at top, title, description, arrow CTA
- Shadow: shadow-lg on hover with transition
- Border: 1px subtle border, brightens on hover

**Workflow Step Cards:**
- Clean white/elevated background cards
- Rounded-lg corners
- Padding: p-8
- Clear header with step number badge
- Content area with appropriate spacing
- Action buttons at bottom

### Forms & Inputs
**Text Input/Textarea:**
- Background: Secondary Background
- Border: Subtle Border, focus ring Primary Blue
- Padding: px-4 py-3
- Rounded: rounded-lg
- Dark mode optimized with high contrast text

**Buttons:**
- Primary: bg-Primary Blue, text-white, rounded-lg, px-6 py-3, font-medium
- Secondary: border Subtle Border, text-Primary Text, hover bg-Elevated
- Ghost: text-Primary Blue, hover bg-Primary Blue/10
- Disabled: opacity-50, cursor-not-allowed

**File Upload Zone:**
- Dashed border, rounded-xl
- Large dropzone with icon and text
- Drag-over state with Primary Blue highlight
- Preview thumbnails in grid below

### Data Display
**Table Component:**
- Striped rows with subtle background alternation
- Header: sticky, font-semibold, border-b
- Editable cells: inline editing with pencil icon
- Actions column: icon buttons (Edit, Delete)
- Responsive: Card layout on mobile

**Progress/Status Indicators:**
- Circular progress: Primary Blue fill
- Linear progress: h-2 rounded-full with gradient
- Status badges: rounded-full px-3 py-1 with status colors

### Gallery & Media
**Style Preset Gallery:**
- Image cards with aspect-ratio-video
- Overlay title on hover with gradient backdrop
- Selected state: Primary Blue border (2px)
- Grid layout with consistent gaps

**Video Preview Area:**
- Aspect ratio container (16:9)
- Play/pause overlay controls
- Timeline scrubber at bottom
- Quality/download options dropdown

---

## Workflow-Specific Patterns

**Step Transitions:**
- Slide animations between steps (slide-in-right, slide-out-left)
- Fade transitions for content updates
- Loading states: skeleton screens matching final layout
- Auto-save indicator: small badge top-right

**Export Panel:**
- Modal/slide-over design from right
- Large preview thumbnail
- Download options as button list with icons
- Progress bar for export process
- Success state with download ZIP button

**Error & Empty States:**
- Centered icon + message + action button
- Illustrations for empty states (upload prompts)
- Inline validation for forms (red border + helper text)
- Toast notifications: top-right, auto-dismiss

---

## Images

**Hero Section:** No large hero image on main page - focus on content cards
**Card Thumbnails:** Use placeholder images for style presets (400x225px, 16:9 ratio)
**Icons:** Use Heroicons for UI elements, custom creative icons for mode selection
**Preview Areas:** Real video thumbnails in results/export screens (16:9 format)