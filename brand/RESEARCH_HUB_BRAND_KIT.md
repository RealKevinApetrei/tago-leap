# Research Hub & Society Dashboard Brand Kit

**Terminal-Inspired Design System for Blockchain Societies**

---

## Overview

This brand kit defines the **professional, data-focused UI design system** for the Research Hub and Society Dashboard platforms. The design is inspired by institutional trading platforms like **Bloomberg Terminal** and **Hyperliquid** — clean, minimal, terminal-like aesthetics with a focus on data clarity and professional appearance.

**Flexibility**: While the core design patterns are fixed, **accent colors can be customized** to match your society's branding (e.g., LSE purple, Oxford blue, etc.).

---

## Design Philosophy

### Core Principles

1. **Terminal Aesthetic** - Inspired by professional trading terminals
2. **Data-First** - Information clarity over decoration
3. **Monospace Typography** - For all data, numbers, and technical content
4. **Minimal Design** - Clean, sharp edges, no unnecessary elements
5. **Professional Tone** - Institutional-grade appearance
6. **Performance** - Fast, responsive, optimized

### Visual Language

- **Sharp Edges** - Minimal border radius, rectangular shapes
- **Flat Design** - No gradients on core UI (only subtle glows)
- **High Contrast** - Clear text hierarchy with opacity levels
- **Grid-Based** - Everything aligned to a precise grid system
- **Status Indicators** - Dots, badges, and color-coded states

---

## Color System

### Base Foundation (Fixed)

These colors are **non-negotiable** for consistency:

```css
/* Black & White Foundation */
--terminal-black: #000000;
--terminal-white: #FFFFFF;

/* White Opacity Levels (for UI elements) */
--white-2: rgba(255, 255, 255, 0.02);   /* Subtle backgrounds */
--white-3: rgba(255, 255, 255, 0.03);   /* Slight elevation */
--white-4: rgba(255, 255, 255, 0.04);   /* Cards/containers */
--white-5: rgba(255, 255, 255, 0.05);   /* Borders light */
--white-6: rgba(255, 255, 255, 0.06);   /* Borders medium */
--white-8: rgba(255, 255, 255, 0.08);   /* Borders strong */

/* Text Opacity Levels */
--text-primary: rgba(255, 255, 255, 0.90);   /* Primary text */
--text-secondary: rgba(255, 255, 255, 0.70); /* Secondary text */
--text-tertiary: rgba(255, 255, 255, 0.60);  /* Tertiary text */
--text-disabled: rgba(255, 255, 255, 0.40);  /* Disabled/labels */
--text-muted: rgba(255, 255, 255, 0.30);     /* Very subtle text */
```

### Status Colors (Fixed)

```css
/* Status Indicators */
--status-live: #4ADE80;      /* Green - Live/Active */
--status-pending: #FACC15;   /* Yellow - Pending */
--status-idle: rgba(255, 255, 255, 0.30); /* Gray - Idle */

/* Status Backgrounds */
--status-live-bg: rgba(74, 222, 128, 0.05);
--status-live-border: rgba(74, 222, 128, 0.20);

--status-pending-bg: rgba(250, 204, 21, 0.05);
--status-pending-border: rgba(250, 204, 21, 0.20);
```

### Society Accent Colors (Customizable)

**Each society can define their own accent color**:

```css
/* Example: LSE Purple */
--society-accent: #5B2C91;
--society-accent-light: #7B3CB1;
--society-accent-bg: rgba(91, 44, 145, 0.10);
--society-accent-border: rgba(91, 44, 145, 0.30);

/* Example: Oxford Blue */
--society-accent: #002147;
--society-accent-light: #003366;
--society-accent-bg: rgba(0, 33, 71, 0.10);
--society-accent-border: rgba(0, 33, 71, 0.30);

/* Example: Cambridge Blue */
--society-accent: #A3C1AD;
--society-accent-light: #C3E1CD;
--society-accent-bg: rgba(163, 193, 173, 0.10);
--society-accent-border: rgba(163, 193, 173, 0.30);
```

---

## Typography

### Font Families

```css
/* Primary Font (Light UI Text) */
--font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Monospace Font (Data, Numbers, Technical) */
--font-mono: 'JetBrains Mono', 'Fira Code', 'Monaco', 'Courier New', monospace;
```

### Font Weights

```css
--weight-light: 300;    /* Default for most UI text */
--weight-normal: 400;   /* Emphasized text */
--weight-medium: 500;   /* Strong emphasis */
```

### Type Scale

```css
/* Headers */
--text-3xl: 1.875rem;   /* 30px - Section headers */
--text-2xl: 1.5rem;     /* 24px - Card headers */
--text-xl: 1.25rem;     /* 20px - Subsection headers */
--text-lg: 1.125rem;    /* 18px - Large text */

/* Body */
--text-base: 1rem;      /* 16px - Default body */
--text-sm: 0.875rem;    /* 14px - Smaller body */
--text-xs: 0.75rem;     /* 12px - Labels, captions */
```

### Typography Rules

**1. Use Monospace for:**
- All numbers and data values
- Timestamps and dates
- Categories and tags
- Status labels
- Table headers (uppercase)
- Footer information

**2. Use Inter (Light) for:**
- Article titles
- Section headings
- Descriptions
- UI labels

**3. Always:**
- Use `font-light` (300) as default
- Use uppercase for labels: `uppercase tracking-wider`
- Use `text-xs` or `text-sm` with `font-mono` for data

---

## Layout Patterns

### Container Structure

```jsx
{/* Outer Container */}
<div className="relative bg-black/40 border border-white/[0.06] overflow-hidden backdrop-blur-sm">

  {/* Header Bar */}
  <div className="px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
    {/* Header content */}
  </div>

  {/* Content Area */}
  <div className="px-4 py-3">
    {/* Main content */}
  </div>

  {/* Footer Bar */}
  <div className="px-4 py-2 border-t border-white/[0.04] bg-white/[0.01]">
    {/* Footer content */}
  </div>
</div>
```

### Status Indicators

```jsx
{/* Status Dot + Label */}
<div className="flex items-center gap-2">
  <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
  <span className="text-xs font-mono text-white/60 uppercase tracking-wider">
    Research Hub
  </span>
</div>

{/* Status Badge */}
<span className="text-xs font-mono px-2 py-0.5 border text-green-400 bg-green-400/5 border-green-400/20">
  Live
</span>
```

---

## Component Patterns

### 1. Header Bar

**Purpose**: Top navigation/identification bar for each panel

```jsx
<div className="px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
  <div className="flex items-center justify-between">
    {/* Left: Status Indicator */}
    <div className="flex items-center gap-2">
      <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
      <span className="text-xs font-mono text-white/60 uppercase tracking-wider">
        Research Hub
      </span>
    </div>

    {/* Right: Status Label */}
    <div className="flex items-center gap-2">
      <div className="text-xs text-white/40 font-mono">LIVE</div>
    </div>
  </div>
</div>
```

**Specifications:**
- Padding: `px-4 py-3`
- Background: `bg-white/[0.02]`
- Border: `border-b border-white/[0.06]`
- Status dot: `w-1.5 h-1.5 rounded-full`
- Text: `text-xs font-mono uppercase tracking-wider`

---

### 2. Tab Navigation

**Purpose**: Category/section navigation

```jsx
<div className="px-4 py-3 border-b border-white/[0.04] flex gap-1">
  {/* Active Tab */}
  <div className="px-3 py-1 text-xs font-mono bg-white/[0.06] text-white border-b border-white/40">
    All
  </div>

  {/* Inactive Tabs */}
  <div className="px-3 py-1 text-xs font-mono text-white/40 hover:text-white/60 hover:bg-white/[0.02]">
    DeFi
  </div>
</div>
```

**Specifications:**
- Padding: `px-3 py-1`
- Active: `bg-white/[0.06] text-white border-b border-white/40`
- Inactive: `text-white/40 hover:text-white/60`
- Font: `text-xs font-mono`
- No border radius on tabs

---

### 3. Data Table

**Purpose**: Primary data display format

```jsx
<div className="overflow-hidden">
  {/* Table Header */}
  <div className="px-4 py-2 bg-white/[0.02] border-b border-white/[0.04] grid grid-cols-12 gap-4 text-xs font-mono text-white/40 uppercase tracking-wider">
    <div className="col-span-6">Title</div>
    <div className="col-span-3">Category</div>
    <div className="col-span-3 text-right">Published</div>
  </div>

  {/* Table Rows */}
  <div className="max-h-[340px] overflow-hidden">
    <div className="px-4 py-3 border-b border-white/[0.03] hover:bg-white/[0.02] grid grid-cols-12 gap-4 cursor-pointer group">
      <div className="col-span-6 text-sm text-white/70 group-hover:text-white/90 font-light">
        Article Title Here
      </div>
      <div className="col-span-3">
        <span className="text-xs font-mono text-white/40 px-2 py-0.5 bg-white/[0.03] border border-white/[0.05]">
          DeFi
        </span>
      </div>
      <div className="col-span-3 text-right">
        <div className="text-xs font-mono text-white/40">2h</div>
      </div>
    </div>
  </div>
</div>
```

**Specifications:**
- Header: `bg-white/[0.02]` with `text-xs font-mono uppercase`
- Row padding: `px-4 py-3`
- Row hover: `hover:bg-white/[0.02]`
- Borders: `border-b border-white/[0.03]`
- Grid: Use `grid-cols-12` for flexible layouts

---

### 4. Metrics Grid

**Purpose**: Quick stat display (dashboard)

```jsx
<div className="grid grid-cols-4 gap-3 px-4 py-4">
  <div className="bg-white/[0.02] border border-white/[0.04] p-2">
    <div className="text-xs font-mono text-white/40 mb-1">Members</div>
    <div className="flex items-baseline gap-1">
      <div className="text-lg font-mono text-white/90">142</div>
      <div className="text-xs font-mono text-green-400">+12</div>
    </div>
  </div>
</div>
```

**Specifications:**
- Background: `bg-white/[0.02]`
- Border: `border-white/[0.04]`
- Label: `text-xs font-mono text-white/40`
- Value: `text-lg font-mono text-white/90`
- Change: `text-xs font-mono text-green-400` (or red for negative)

---

### 5. Footer Bar

**Purpose**: Metadata and status information

```jsx
<div className="px-4 py-2 border-t border-white/[0.04] bg-white/[0.01] flex justify-between text-xs font-mono text-white/40">
  <div>Total: <span className="text-white/60">47 articles</span></div>
  <div>Updated: <span className="text-white/60">2 min ago</span></div>
</div>
```

**Specifications:**
- Padding: `px-4 py-2`
- Background: `bg-white/[0.01]`
- Border: `border-t border-white/[0.04]`
- Font: `text-xs font-mono`
- Label color: `text-white/40`
- Value color: `text-white/60`

---

## Animation Guidelines

### Principles

- **Subtle and Professional** - No flashy animations
- **Performance First** - Use CSS transitions, not heavy JavaScript
- **Functional** - Animations should communicate state changes

### Approved Animations

```jsx
{/* Fade In on Scroll */}
<motion.div
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6 }}
  viewport={{ once: true }}
>

{/* Stagger Children */}
{items.map((item, i) => (
  <motion.div
    key={i}
    initial={{ opacity: 0, x: -10 }}
    whileInView={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.3, delay: i * 0.05 }}
    viewport={{ once: true }}
  >
))}

{/* Hover States (CSS only) */}
<div className="transition-all duration-300 hover:bg-white/[0.02]">
```

### Timing

- **Fast transitions**: `duration-200` (200ms) - buttons, tabs
- **Standard transitions**: `duration-300` (300ms) - hover states, rows
- **Slow transitions**: `duration-500` (500ms) - page loads, modals
- **Stagger delay**: `0.03s - 0.05s` between elements

---

## Spacing System

### 8px Grid

All spacing should be multiples of 8px (or 4px for tight spaces):

```css
/* Padding Scale */
--space-1: 0.25rem;  /* 4px  - Very tight */
--space-2: 0.5rem;   /* 8px  - Tight */
--space-3: 0.75rem;  /* 12px - Compact */
--space-4: 1rem;     /* 16px - Standard */
--space-6: 1.5rem;   /* 24px - Comfortable */
--space-8: 2rem;     /* 32px - Spacious */
```

### Common Patterns

- **Container padding**: `px-4` (16px horizontal)
- **Row padding**: `py-3` (12px vertical)
- **Header padding**: `px-4 py-3`
- **Footer padding**: `px-4 py-2`
- **Card gap**: `gap-3` or `gap-4`

---

## Border Specifications

### Border Widths

```css
/* Always use 1px borders */
border: 1px solid;
```

### Border Colors (Opacity-based)

```css
/* Container borders */
border-white/[0.06]  /* Outer container */
border-white/[0.05]  /* Internal dividers */
border-white/[0.04]  /* Subtle separators */
border-white/[0.03]  /* Very subtle lines */

/* Status borders */
border-green-400/20  /* Success/Active */
border-yellow-400/20 /* Warning/Pending */
```

### Border Positions

- **Container**: All sides `border`
- **Header separator**: Bottom only `border-b`
- **Footer separator**: Top only `border-t`
- **Table rows**: Bottom only `border-b`

---

## Data Display Rules

### Numbers

```jsx
{/* Always monospace, appropriate opacity */}
<div className="text-lg font-mono text-white/90">142</div>
<div className="text-xs font-mono text-white/40">2h ago</div>
```

### Timestamps

```jsx
{/* Relative time, monospace */}
<div className="text-xs font-mono text-white/40">2h</div>
<div className="text-xs font-mono text-white/40">Updated: 2 min ago</div>
```

### Categories/Tags

```jsx
{/* Boxed, monospace, uppercase optional */}
<span className="text-xs font-mono text-white/40 px-2 py-0.5 bg-white/[0.03] border border-white/[0.05]">
  DeFi
</span>
```

### Status Badges

```jsx
{/* Color-coded based on state */}
<span className="text-xs font-mono px-2 py-0.5 border text-green-400 bg-green-400/5 border-green-400/20">
  Active
</span>

<span className="text-xs font-mono px-2 py-0.5 border text-yellow-400 bg-yellow-400/5 border-yellow-400/20">
  Pending
</span>

<span className="text-xs font-mono px-2 py-0.5 border text-white/30 bg-white/[0.02] border-white/[0.05]">
  Idle
</span>
```

---

## Example Implementations

### Research Hub Panel

```jsx
<div className="relative bg-black/40 border border-white/[0.06] overflow-hidden backdrop-blur-sm">
  {/* Header */}
  <div className="px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
        <span className="text-xs font-mono text-white/60 uppercase tracking-wider">
          Research Hub
        </span>
      </div>
      <div className="text-xs text-white/40 font-mono">LIVE</div>
    </div>
  </div>

  {/* Tabs */}
  <div className="px-4 py-3 border-b border-white/[0.04] flex gap-1">
    <div className="px-3 py-1 text-xs font-mono bg-white/[0.06] text-white border-b border-white/40">
      All
    </div>
    <div className="px-3 py-1 text-xs font-mono text-white/40 hover:text-white/60 hover:bg-white/[0.02]">
      DeFi
    </div>
  </div>

  {/* Table */}
  <div className="overflow-hidden">
    <div className="px-4 py-2 bg-white/[0.02] border-b border-white/[0.04] grid grid-cols-12 gap-4 text-xs font-mono text-white/40 uppercase tracking-wider">
      <div className="col-span-6">Title</div>
      <div className="col-span-3">Category</div>
      <div className="col-span-3 text-right">Published</div>
    </div>

    <div className="px-4 py-3 border-b border-white/[0.03] hover:bg-white/[0.02] grid grid-cols-12 gap-4">
      <div className="col-span-6 text-sm text-white/70 font-light">
        DeFi Yield Strategies Q1 2025
      </div>
      <div className="col-span-3">
        <span className="text-xs font-mono text-white/40 px-2 py-0.5 bg-white/[0.03] border border-white/[0.05]">
          DeFi
        </span>
      </div>
      <div className="col-span-3 text-right text-xs font-mono text-white/40">
        2h
      </div>
    </div>
  </div>

  {/* Footer */}
  <div className="px-4 py-2 border-t border-white/[0.04] bg-white/[0.01] flex justify-between text-xs font-mono text-white/40">
    <div>Total: <span className="text-white/60">47 articles</span></div>
    <div>Updated: <span className="text-white/60">2 min ago</span></div>
  </div>
</div>
```

### Society Dashboard Panel

```jsx
<div className="relative bg-black/40 border border-white/[0.06] overflow-hidden backdrop-blur-sm">
  {/* Header */}
  <div className="px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full" />
        <span className="text-xs font-mono text-white/60 uppercase tracking-wider">
          Society Dashboard
        </span>
      </div>
      <div className="text-xs text-white/40 font-mono">ADMIN</div>
    </div>
  </div>

  {/* Metrics Grid */}
  <div className="px-4 py-4 border-b border-white/[0.04] grid grid-cols-4 gap-3">
    <div className="bg-white/[0.02] border border-white/[0.04] p-2">
      <div className="text-xs font-mono text-white/40 mb-1">Members</div>
      <div className="flex items-baseline gap-1">
        <div className="text-lg font-mono text-white/90">142</div>
        <div className="text-xs font-mono text-green-400">+12</div>
      </div>
    </div>
  </div>

  {/* Module Table */}
  <div className="overflow-hidden">
    <div className="px-4 py-2 bg-white/[0.02] border-b border-white/[0.04] grid grid-cols-12 gap-4 text-xs font-mono text-white/40 uppercase tracking-wider">
      <div className="col-span-7">Module</div>
      <div className="col-span-5 text-right">Status</div>
    </div>

    <div className="px-4 py-3 border-b border-white/[0.03] hover:bg-white/[0.02] grid grid-cols-12 gap-4">
      <div className="col-span-7 text-sm text-white/70 font-light">
        User Management
      </div>
      <div className="col-span-5 flex items-center justify-end gap-2">
        <span className="text-xs font-mono px-2 py-0.5 border text-green-400 bg-green-400/5 border-green-400/20">
          Active
        </span>
        <span className="text-xs font-mono text-white/40">142</span>
      </div>
    </div>
  </div>

  {/* Footer */}
  <div className="px-4 py-2 border-t border-white/[0.04] bg-white/[0.01] flex justify-between text-xs font-mono text-white/40">
    <div>Session: <span className="text-white/60">2h 34m</span></div>
    <div>Last sync: <span className="text-white/60">now</span></div>
  </div>
</div>
```

---

## Customization Guide for Societies

### What Can Be Customized

✅ **Accent colors** - Replace yellow-400 with your society colors
✅ **Status dot colors** - Match your branding
✅ **Content** - Article titles, categories, module names
✅ **Metrics** - Numbers, labels, data displayed
✅ **Society branding** - Logo, name in header

### What Must Stay Fixed

❌ **Layout structure** - Header, tabs, table, footer
❌ **Typography system** - Monospace for data, Inter for UI
❌ **Spacing system** - 8px grid, padding values
❌ **Border system** - Opacity levels, positions
❌ **Animation timing** - Transition speeds
❌ **Background colors** - Black/white foundation
❌ **Table format** - Column structure, grid system

### Example: LSE Customization

```css
/* Replace default accent */
--society-accent: #5B2C91;           /* LSE Purple */
--society-accent-light: #7B3CB1;
--society-accent-bg: rgba(91, 44, 145, 0.10);
--society-accent-border: rgba(91, 44, 145, 0.30);
```

```jsx
{/* Status dot - use society accent */}
<div className="w-1.5 h-1.5 bg-[#5B2C91] rounded-full" />

{/* Active tab - use society accent */}
<div className="px-3 py-1 text-xs font-mono bg-[rgba(91,44,145,0.10)] text-white border-b border-[#5B2C91]">
  All
</div>
```

---

## Don'ts (Common Mistakes to Avoid)

❌ **Don't use emojis** - Use SVG icons or text only
❌ **Don't add rounded corners** - Keep sharp, terminal-like edges
❌ **Don't use gradients** - Flat colors only (except subtle glows)
❌ **Don't use non-monospace fonts for data** - Always `font-mono`
❌ **Don't ignore the grid** - Everything should align precisely
❌ **Don't use bright colors** - Keep muted, professional palette
❌ **Don't add decorative elements** - Purely functional design
❌ **Don't over-animate** - Subtle, professional transitions only

---

## Technical Implementation

### Required Fonts

```html
<!-- In your HTML <head> -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500&family=JetBrains+Mono:wght@300;400;500&display=swap" rel="stylesheet">
```

### Tailwind Config

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Monaco', 'Courier New', 'monospace'],
      },
    },
  },
}
```

### Framer Motion

```bash
npm install framer-motion
```

```jsx
import { motion } from 'framer-motion';
```

---

## Quality Checklist

Before launching your Research Hub or Society Dashboard, verify:

- [ ] All data/numbers use `font-mono`
- [ ] All status indicators have proper color coding
- [ ] Table headers are uppercase with `tracking-wider`
- [ ] Borders use correct opacity levels
- [ ] Spacing follows 8px grid system
- [ ] No rounded corners on main containers
- [ ] Footer shows metadata (totals, update times)
- [ ] Hover states work on all interactive elements
- [ ] Loading states are implemented
- [ ] Mobile responsive (tables can scroll horizontally)
- [ ] Performance is optimized (no janky animations)

---

## Support & Resources

**Reference Implementation**: See `src/components/Blockchain4Students.jsx` lines 226-443

**Questions?** Contact Pendle Fund: contact@tagoresearch.com

**Inspiration**:
- Bloomberg Terminal
- Hyperliquid
- TradingView
- Institutional trading platforms

---

**Version 1.0** | Last Updated: December 2025 | Pendle Fund
