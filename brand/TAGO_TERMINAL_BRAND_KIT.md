# Pendle Fund Terminal Brand Kit

**Bloomberg/Hyperliquid-Inspired Design System**

---

## Design Philosophy

Pendle Fund's visual identity is inspired by **professional trading terminals**, **institutional platforms**, and **modern fintech applications**. The design prioritizes:

1. **Data Clarity** - Information-first design
2. **Professional Tone** - Institutional-grade appearance
3. **Terminal Aesthetic** - Monospace fonts, sharp edges, flat design
4. **Performance** - Fast, responsive, optimized
5. **Consistency** - Unified visual language across all touchpoints

**Inspiration**: Bloomberg Terminal, Hyperliquid, TradingView, Robinhood

---

## Color System

### Foundation

```css
/* Pure Black & White */
--tago-black: #000000;
--tago-white: #FFFFFF;

/* Background Layers */
--bg-primary: #000000;           /* Page background */
--bg-secondary: rgba(0, 0, 0, 0.60);  /* Elevated surfaces */
--bg-tertiary: rgba(0, 0, 0, 0.40);   /* Cards/panels */

/* Surface Opacities (White over black) */
--surface-1: rgba(255, 255, 255, 0.01);
--surface-2: rgba(255, 255, 255, 0.02);
--surface-3: rgba(255, 255, 255, 0.03);
--surface-4: rgba(255, 255, 255, 0.04);
--surface-5: rgba(255, 255, 255, 0.05);
--surface-6: rgba(255, 255, 255, 0.06);
--surface-8: rgba(255, 255, 255, 0.08);
--surface-10: rgba(255, 255, 255, 0.10);
```

### Text Hierarchy

```css
/* Text Opacities */
--text-100: rgba(255, 255, 255, 1.00);    /* Pure white - critical */
--text-90: rgba(255, 255, 255, 0.90);     /* Primary content */
--text-70: rgba(255, 255, 255, 0.70);     /* Secondary content */
--text-60: rgba(255, 255, 255, 0.60);     /* Tertiary content */
--text-40: rgba(255, 255, 255, 0.40);     /* Labels, subtle */
--text-30: rgba(255, 255, 255, 0.30);     /* Disabled */
```

### Accent Color (Brand Yellow)

```css
--tago-yellow: #FFD633;
--tago-yellow-light: #FFDF66;
--tago-yellow-dark: #FFCD00;
--tago-yellow-bg: rgba(255, 214, 51, 0.10);
--tago-yellow-border: rgba(255, 214, 51, 0.30);
```

### Status Colors

```css
/* Success/Active - Green */
--status-success: #4ADE80;
--status-success-bg: rgba(74, 222, 128, 0.05);
--status-success-border: rgba(74, 222, 128, 0.20);

/* Warning/Pending - Yellow */
--status-warning: #FACC15;
--status-warning-bg: rgba(250, 204, 21, 0.05);
--status-warning-border: rgba(250, 204, 21, 0.20);

/* Error/Inactive - Red */
--status-error: #EF4444;
--status-error-bg: rgba(239, 68, 68, 0.05);
--status-error-border: rgba(239, 68, 68, 0.20);

/* Info - Blue */
--status-info: #60A5FA;
--status-info-bg: rgba(96, 165, 250, 0.05);
--status-info-border: rgba(96, 165, 250, 0.20);
```

---

## Typography

### Font Stack

```css
/* Primary UI Font */
--font-ui: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Monospace (Data, Numbers, Code) */
--font-mono: 'JetBrains Mono', 'Fira Code', 'Monaco', 'Courier New', monospace;
```

### Font Weights

```css
--weight-light: 300;    /* Default UI text */
--weight-normal: 400;   /* Emphasis */
--weight-medium: 500;   /* Strong emphasis */
```

### Type Scale

```css
/* Display */
--text-6xl: 3.75rem;    /* 60px - Hero */
--text-5xl: 3rem;       /* 48px - Large headers */
--text-4xl: 2.25rem;    /* 36px - Section headers */
--text-3xl: 1.875rem;   /* 30px - Card headers */
--text-2xl: 1.5rem;     /* 24px - Subheaders */
--text-xl: 1.25rem;     /* 20px - Large body */

/* Body */
--text-base: 1rem;      /* 16px - Default */
--text-sm: 0.875rem;    /* 14px - Small */
--text-xs: 0.75rem;     /* 12px - Labels */
```

### Typography Rules

**Monospace Usage:**
- All numbers and metrics
- All timestamps and dates
- Status labels and badges
- Table headers (uppercase)
- Code and technical content
- Navigation labels

**Inter Usage:**
- Headlines and titles
- Descriptions and body text
- Button labels
- General UI text

---

## Layout System

### Spacing (4px Base Unit)

```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
--space-32: 8rem;     /* 128px */
```

### Container Widths

```css
--container-sm: 640px;
--container-md: 768px;
--container-lg: 1024px;
--container-xl: 1280px;
--container-2xl: 1536px;
```

---

## Component Patterns

### 1. Terminal Panel

```jsx
<div className="bg-black/40 border border-white/[0.06] backdrop-blur-sm">
  {/* Header */}
  <div className="px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
        <span className="text-xs font-mono text-white/60 uppercase tracking-wider">
          Panel Name
        </span>
      </div>
      <span className="text-xs font-mono text-white/40">STATUS</span>
    </div>
  </div>

  {/* Content */}
  <div className="p-4">
    {/* Content here */}
  </div>

  {/* Footer */}
  <div className="px-4 py-2 border-t border-white/[0.04] bg-white/[0.01]">
    <div className="text-xs font-mono text-white/40">
      Footer info
    </div>
  </div>
</div>
```

### 2. Data Table

```jsx
<div className="overflow-hidden">
  {/* Header */}
  <div className="px-4 py-2 bg-white/[0.02] border-b border-white/[0.04]">
    <div className="grid grid-cols-12 gap-4 text-xs font-mono text-white/40 uppercase tracking-wider">
      <div className="col-span-6">Column 1</div>
      <div className="col-span-3">Column 2</div>
      <div className="col-span-3 text-right">Column 3</div>
    </div>
  </div>

  {/* Rows */}
  <div className="px-4 py-3 border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors cursor-pointer">
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-6 text-sm text-white/70 font-light">Data 1</div>
      <div className="col-span-3 text-xs font-mono text-white/40">Data 2</div>
      <div className="col-span-3 text-xs font-mono text-white/40 text-right">Data 3</div>
    </div>
  </div>
</div>
```

### 3. Metric Card

```jsx
<div className="p-4 bg-white/[0.02] border border-white/[0.04]">
  <div className="text-xs font-mono text-white/40 uppercase tracking-wider mb-2">
    Label
  </div>
  <div className="flex items-baseline gap-2">
    <div className="text-2xl font-mono text-white/90">142</div>
    <div className="text-sm font-mono text-green-400">+12</div>
  </div>
</div>
```

### 4. Status Badge

```jsx
{/* Live/Active */}
<span className="px-2 py-0.5 text-xs font-mono border bg-green-400/5 text-green-400 border-green-400/20">
  LIVE
</span>

{/* Pending */}
<span className="px-2 py-0.5 text-xs font-mono border bg-yellow-400/5 text-yellow-400 border-yellow-400/20">
  PENDING
</span>

{/* Inactive */}
<span className="px-2 py-0.5 text-xs font-mono border bg-white/[0.02] text-white/30 border-white/[0.05]">
  IDLE
</span>
```

### 5. Terminal Button

```jsx
{/* Primary */}
<button className="px-6 py-3 bg-white text-black text-sm font-mono uppercase tracking-wider hover:bg-white/90 transition-all border border-white/20">
  Execute
</button>

{/* Secondary */}
<button className="px-6 py-3 bg-white/[0.06] text-white text-sm font-mono uppercase tracking-wider hover:bg-white/[0.10] transition-all border border-white/10">
  Cancel
</button>

{/* Yellow Accent */}
<button className="px-6 py-3 bg-yellow-400 text-black text-sm font-mono uppercase tracking-wider hover:bg-yellow-300 transition-all">
  Confirm
</button>
```

---

## Section Guidelines

### Hero Section

- Large monospace headers for key metrics
- Status indicators with live data
- Clean, table-like layout
- Minimal decoration
- Sharp, rectangular containers

### Portfolio/Products

- Product cards as terminal panels
- Feature lists as data tables
- Status badges for availability
- Monospace for all data points

### Team Section

- Profile cards as terminal panels
- Clean grid layouts
- Monospace for roles/titles
- Minimal profile images

### Footer

- Single-line terminal aesthetic
- Monospace fonts
- Minimal decoration

---

## Animation Guidelines

### Principles

- Subtle, professional
- No flashy effects
- Functional state changes
- Fast timing (200-300ms)

### Approved Patterns

```jsx
{/* Fade in on scroll */}
<motion.div
  initial={{ opacity: 0, y: 10 }}
  whileInView={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4 }}
  viewport={{ once: true }}
/>

{/* Hover states */}
className="transition-all duration-200 hover:bg-white/[0.02]"
```

---

## Border & Line Rules

### Border Specifications

```css
/* Always 1px */
border: 1px solid;

/* Opacity Levels */
border-white/[0.03]  /* Very subtle */
border-white/[0.04]  /* Subtle */
border-white/[0.05]  /* Light */
border-white/[0.06]  /* Medium */
border-white/[0.08]  /* Strong */
border-white/[0.10]  /* Very strong */
```

### Corner Radius

- **Containers**: No border radius (sharp rectangles)
- **Small elements**: `rounded` (4px) max
- **Badges/pills**: `rounded-sm` (2px)
- **Buttons**: No radius or minimal `rounded-sm`

---

## Don'ts

❌ **Never:**
- **Use emojis in production UI** (CRITICAL RULE - only acceptable in minimal TL;DR/footer sections)
- Add rounded corners to main containers
- Use decorative gradients (only functional glows)
- Use fonts other than Inter/JetBrains Mono
- Ignore the spacing grid
- Use bright, saturated colors
- Over-animate
- Add unnecessary decorations

✅ **Always:**
- Use monospace for all data
- Keep sharp, rectangular edges
- Maintain high contrast
- Follow the spacing system
- Use status colors appropriately
- Keep it minimal and professional
- Use terminal symbols (+, -, *, ·) for decorative elements instead of emojis

---

## Implementation Checklist

- [ ] JetBrains Mono font loaded
- [ ] Inter font loaded
- [ ] All numbers use `font-mono`
- [ ] All containers have sharp edges
- [ ] Status indicators properly color-coded
- [ ] Borders use correct opacity levels
- [ ] Spacing follows 4px grid
- [ ] Hover states implemented
- [ ] Mobile responsive
- [ ] Performance optimized

---

**Version 2.0** | Terminal Edition | Pendle Fund
