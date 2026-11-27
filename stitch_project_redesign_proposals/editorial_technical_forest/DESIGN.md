---
name: Editorial Technical Forest
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daea'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eefe'
  surface-container-high: '#e2e8f8'
  surface-container-highest: '#dce2f3'
  on-surface: '#151c27'
  on-surface-variant: '#414844'
  inverse-surface: '#2a313d'
  inverse-on-surface: '#ebf1ff'
  outline: '#717973'
  outline-variant: '#c1c8c2'
  surface-tint: '#3f6653'
  primary: '#012d1d'
  on-primary: '#ffffff'
  primary-container: '#1b4332'
  on-primary-container: '#86af99'
  inverse-primary: '#a5d0b9'
  secondary: '#006c48'
  on-secondary: '#ffffff'
  secondary-container: '#92f7c3'
  on-secondary-container: '#00734d'
  tertiary: '#002162'
  on-tertiary: '#ffffff'
  tertiary-container: '#003490'
  on-tertiary-container: '#84a3ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c1ecd4'
  primary-fixed-dim: '#a5d0b9'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#274e3d'
  secondary-fixed: '#92f7c3'
  secondary-fixed-dim: '#75daa8'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005235'
  tertiary-fixed: '#dbe1ff'
  tertiary-fixed-dim: '#b4c5ff'
  on-tertiary-fixed: '#00174b'
  on-tertiary-fixed-variant: '#003ea8'
  background: '#f9f9ff'
  on-background: '#151c27'
  surface-variant: '#dce2f3'
typography:
  headline-xl:
    fontFamily: DM Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: DM Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: DM Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: DM Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: DM Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.04em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

The design system establishes a high-density, authoritative environment tailored for technical analysts, institutional reviewers, and knowledge curators. The emotional tone is deliberate, scholarly, and uncompromisingly operational—balancing the structured clarity of an academic archive with the speed of an IDE.

The aesthetic fuses **Corporate Editorial** rigor with **Tactile Utility**:
- High-information density with controlled negative space to prevent cognitive fatigue during extended document review.
- Strict visual classification separating live content, historical versions, and semantic workflow states.
- Monospaced markers, explicit metadata hierarchy, and subdued technical framing to evoke precision and regulatory compliance.

## Colors

The palette employs deep organic greens paired with crisp, functional neutrals to create an institutional, distraction-free backdrop.

### Roles & Assignments
- **Brand & Primary Actions:** `#1B4332` (Primary Forest) for app headers, prominent workflow buttons, and brand anchors. `#2D6A4F` serves as the primary hover and active state.
- **Accents & Context Surfaces:** `#52B788` (Emerald) and `#74C69D` for focus rings, version badges, and active navigational pills. `#D8F3DC` serves as the subtle tint for active state containers.
- **Surfaces & Tonal Neutrals:**
  - Base canvas: `#F8F9FA`
  - Elevated cards & modals: `#FFFFFF`
  - Contextual sidebar & panel containers: `#F0F4F1`
  - Subtle borders: `#E5E7EB`
  - Structural divider lines & table heads: `#D1D5DB`
  - Body text: `#111827`
  - Secondary metadata & timestamps: `#4B5563`
- **Workflow State Tokens:**
  - *BORRADOR / PENDIENTE:* `#F59E0B` text/border on `#FEF3C7` background.
  - *EN_REVISION:* `#2563EB` text/border on `#DBEAFE` background.
  - *PUBLICADO / APROBADA:* `#10B981` text/border on `#D1FAE5` background.
  - *DEVUELTA:* `#F97316` text/border on `#FFEDD5` background.
  - *RECHAZADA / OBSOLETO:* `#DC2626` text/border on `#FEE2E2` background, and `#6B7280` text/border on `#F3F4F6` background.
- **Diff & Version Comparison Tokens:**
  - *Addition (+):* Background `#DCFCE7`, text `#166534`, border `#86EFAC`.
  - *Deletion (-):* Background `#FEE2E2`, text `#991B1B`, border `#FCA5A5`.

## Typography

The typographic hierarchy prioritizes rapid scannability through a structured three-tier typographic pairing:
- **DM Sans** provides high-authority structure to views, section divides, and modal titles.
- **Manrope** delivers high-legibility document readability across long review passes, audit logs, and dense metadata forms.
- **JetBrains Mono** anchors technical taxonomy, SHA commits, API endpoints, version numbers (`v2.4.1-rc`), and character-level side-by-side diff comparisons.

All tabular data figures must use tabular numerals (`font-variant-numeric: tabular-nums`) to ensure strict vertical column alignment across comparative matrices.

## Layout & Spacing

The layout operates on a compact 8pt base grid with a fluid 12-column foundation:
- **Panels & Dividers:** The interface uses dual persistent panels: a fixed 260px navigation tree on the left, a responsive central reading canvas, and a collapsible 340px review/metadata inspector rail on the right.
- **Desktop (>=1280px):** 12-column grid, 24px (`gutter-desktop`) gutters, 32px (`margin-desktop`) canvas padding. Side-by-side diff engines occupy a 50/50 split of the center reading viewport with a 1px vertical divider line.
- **Tablet (768px - 1279px):** The inspector rail transitions to a slide-over drawer; main grid compresses to 8 columns with 16px (`gutter`) gutters.
- **Mobile (<768px):** Single-column stack with 16px (`margin`) margins. Side-by-side diff comparison switches dynamically into an inline unified diff view.

## Elevation & Depth

Visual hierarchy relies on **tonal surface layering** complemented by **crisp, low-contrast borders** rather than deep drop shadows.

- **Flat Layer 0 (Canvas):** Base background `#F8F9FA` with zero elevation.
- **Flat Layer 1 (Surface Containers):** Main content cards, form segments, and data tables sit on `#FFFFFF` with a 1px border (`#E5E7EB`).
- **Sidebar & Toolbars:** Tinted with `#F0F4F1` and partitioned strictly by 1px solid `#D1D5DB` borders to delineate tool zones from operational content.
- **Popovers & Context Menus:** Layer 2 elevation utilizing a subtle, tight shadow: `0 4px 12px rgba(27, 67, 50, 0.08)`, bound with a `#D1D5DB` hairline border.
- **Modals & Version Conflict Panels (HTTP 409):** Centered floating dialogs using `0 12px 32px rgba(17, 24, 39, 0.12)`, overlaid on a `#111827` scrim at 40% opacity.

## Shapes

The design system enforces a **Soft (Level 1)** geometric discipline:
- Inputs, standard buttons, code blocks, table containers, and alerts use `0.25rem` (4px) corner radii, asserting an exact, professional workspace profile.
- Floating modals, elevated cards, and segmented control containers use `0.5rem` (8px).
- Status chips, diff flags, and author avatars maintain a clean rectangular-soft profile rather than circular or full-pill treatments, preventing decorative distraction within dense data grids.

## Components

### Buttons
- **Primary:** Solid `#1B4332`, text `#FFFFFF`, 4px radius, 36px standard height (`space-sm` vertical, `space-md` horizontal). Hover: `#2D6A4F`. Active: `#143326`.
- **Secondary / Review Action:** Border 1px `#D1D5DB`, background `#FFFFFF`, text `#1B4332`. Hover: `#F0F4F1`.
- **Destructive / Reject:** Background `#FEE2E2`, text `#DC2626`, border 1px `#FCA5A5`. Hover: `#FCDAD7`.

### Status Badges & State Chips
- Displayed with `code-sm` font styling (uppercase, 11px JetBrains Mono), padding of 2px 8px, and 4px radius.
- Color pairings adhere to the workflow states defined in the Colors section (e.g., `EN_REVISION` utilizes `#DBEAFE` background with `#2563EB` text and border).

### Input Fields & Structured Forms
- 36px field height with 1px border `#D1D5DB`, background `#FFFFFF`, text `#111827`, and placeholder `#9CA3AF`.
- Focus state: Border color `#2D6A4F` with an external 2px ring `#52B788` at 30% opacity.
- Disabled state: Background `#F3F4F6`, border `#E5E7EB`, text `#9CA3AF`.

### Version History Table & Data Lists
- Sticky table header using `#F0F4F1` background, 1px bottom border `#D1D5DB`, and 12px uppercase Manrope labels.
- Alternating subtle rows (`#FFFFFF` to `#FAFBF9`), 44px row height, with monospaced version hashes (`#4B5563`).

### Side-by-Side Diff Engine
- Dual synchronized pane grid separated by a 1px `#D1D5DB` spine.
- Monospaced line numbers set on a `#F0F4F1` gutter with 40px width.
- Added tokens display `#DCFCE7` inline background with a `#166534` bold marker; removed tokens display `#FEE2E2` with strikethrough `#991B1B`.

### Banners & Alert Systems
- **Health API & Save Confirmation:** 1px border `#86EFAC`, background `#F0FDF4`, icon and text `#166534`.
- **409 Version Conflict Alert:** 1px border `#F87171`, background `#FEF2F2`, text `#991B1B`. Displays explicit "Rebase from current" and "Overwrite" button actions inline.