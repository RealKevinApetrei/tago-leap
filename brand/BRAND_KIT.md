# Brand Research Brand Kit

> *Abstracting DeFi for Everyone*

## Overview

This brand kit defines the visual identity, design principles, and component library for Brand Research. Inspired by Hyperliquid's minimalist aesthetic, our branding emphasizes clarity, elegance, and accessibility through a black and white foundation with strategic yellow accents.

---

## Core Design Principles

### 1. **Minimalist Elegance**
- Clean, uncluttered interfaces
- Strategic use of whitespace
- Focus on content hierarchy
- Subtle, purposeful animations

### 2. **Monochromatic Foundation**
- Pure black (`#000000`) and pure white (`#FFFFFF`) as primary colors
- Grayscale spectrum for depth and hierarchy
- Yellow as the sole accent color for emphasis

### 3. **Sophisticated Typography**
- Liberal use of *italics* for emphasis and brand voice
- Light font weights for elegance (300-400)
- Strategic use of bold (600) for hierarchy
- Generous letter-spacing for readability

---

## Color Palette

### Primary Colors

```css
/* Black & White Foundation */
--tago-black: #000000;
--tago-white: #FFFFFF;

/* Grayscale Spectrum */
--tago-gray-50: rgba(255, 255, 255, 0.95);
--tago-gray-100: rgba(255, 255, 255, 0.85);
--tago-gray-200: rgba(255, 255, 255, 0.70);
--tago-gray-300: rgba(255, 255, 255, 0.60);
--tago-gray-400: rgba(255, 255, 255, 0.40);
--tago-gray-500: rgba(255, 255, 255, 0.20);
--tago-gray-600: rgba(255, 255, 255, 0.10);
--tago-gray-700: rgba(255, 255, 255, 0.05);
--tago-gray-800: rgba(255, 255, 255, 0.03);
--tago-gray-900: rgba(255, 255, 255, 0.01);
```

### Accent Color - Brand Yellow

```css
/* Yellow Spectrum */
--tago-yellow-50: #FFF9E6;
--tago-yellow-100: #FFF3CC;
--tago-yellow-200: #FFE999;
--tago-yellow-300: #FFDF66;
--tago-yellow-400: #FFD633;  /* Primary Yellow */
--tago-yellow-500: #FFCD00;
--tago-yellow-600: #E6B800;
--tago-yellow-700: #CC9F00;
--tago-yellow-800: #997800;
--tago-yellow-900: #665000;
```

### Usage Guidelines

| Element | Color | Usage |
|---------|-------|-------|
| Background | `--tago-black` | Primary background |
| Primary Text | `--tago-white` | Headings, important content |
| Secondary Text | `--tago-gray-200` | Body text, descriptions |
| Tertiary Text | `--tago-gray-400` | Captions, metadata |
| Borders | `--tago-gray-700` | Subtle dividers |
| Hover Borders | `--tago-gray-600` | Interactive elements |
| Primary CTA | `--tago-yellow-400` | Primary buttons, links |
| Accent Text | `--tago-yellow-400` | Brand emphasis |
| Hover States | `--tago-yellow-300` | Button hover |
| Active States | `--tago-yellow-500` | Pressed states |

---

## Typography

### Font Families

```css
/* Primary Font Stack */
--font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Monospace Font Stack */
--font-mono: 'Source Code Pro', 'SF Mono', Monaco, Menlo, monospace;

/* Alternative Sans-Serif */
--font-alt: 'Space Grotesk', sans-serif;
```

### Type Scale

```css
/* Display Styles */
--text-display: 5rem;      /* 80px - Hero headings */
--text-h1: 3.75rem;        /* 60px - Page titles */
--text-h2: 3rem;           /* 48px - Section headings */
--text-h3: 2.25rem;        /* 36px - Subsections */
--text-h4: 1.875rem;       /* 30px - Card titles */
--text-h5: 1.5rem;         /* 24px - Small headings */
--text-h6: 1.25rem;        /* 20px - Captions */

/* Body Styles */
--text-xl: 1.25rem;        /* 20px - Large body */
--text-lg: 1.125rem;       /* 18px - Body large */
--text-base: 1rem;         /* 16px - Base body */
--text-sm: 0.875rem;       /* 14px - Small text */
--text-xs: 0.75rem;        /* 12px - Tiny text */
```

### Font Weights

```css
--weight-light: 300;       /* Light - Elegant, modern */
--weight-normal: 400;      /* Normal - Body text */
--weight-medium: 500;      /* Medium - Subtle emphasis */
--weight-semibold: 600;    /* Semi-bold - Strong emphasis */
--weight-bold: 700;        /* Bold - Headers (use sparingly) */
```

### Typography Patterns

#### Headings with Italics
```jsx
<h1 className="text-5xl font-light">
  <span className="italic text-yellow-400">Abstracting DeFi</span>
  {' '}for Everyone
</h1>
```

#### Body Text
```jsx
<p className="text-lg font-light text-white/70 leading-relaxed">
  Building the future of decentralized finance through innovative products and education.
</p>
```

#### Emphasized Text
```jsx
<span className="italic text-yellow-400 font-normal">Key insight</span>
```

---

## Spacing System

```css
/* Spacing Scale (based on 4px grid) */
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
--space-24: 6rem;     /* 96px */
--space-32: 8rem;     /* 128px */
```

---

## Component Styles

### Buttons

#### Primary Button
```jsx
<button className="
  px-8 py-3.5
  bg-white text-black
  text-sm font-normal tracking-wide
  rounded-lg
  transition-all duration-200
  hover:bg-white/90
  active:scale-95
">
  Explore Products
</button>
```

#### Yellow Accent Button
```jsx
<button className="
  px-8 py-3.5
  bg-gradient-to-r from-yellow-400 to-yellow-500
  hover:from-yellow-300 hover:to-yellow-400
  text-black text-sm font-medium tracking-wide
  rounded-lg
  transition-all duration-200
  shadow-lg shadow-yellow-500/20
  hover:shadow-yellow-500/30
  active:scale-95
">
  Get Started
</button>
```

#### Ghost Button
```jsx
<button className="
  px-8 py-3.5
  bg-transparent text-white
  border border-white/10
  hover:border-white/20 hover:bg-white/5
  text-sm font-light tracking-wide
  rounded-lg
  transition-all duration-200
">
  Learn More
</button>
```

### Cards

#### Standard Card
```jsx
<div className="
  p-8
  bg-gradient-to-br from-white/[0.03] to-white/[0.01]
  border border-white/[0.08]
  hover:border-white/[0.15]
  rounded-2xl
  backdrop-blur-xl
  transition-all duration-500
  group
">
  {/* Content */}
</div>
```

#### Featured Card with Yellow Accent
```jsx
<div className="
  p-8
  bg-gradient-to-br from-yellow-400/5 to-transparent
  border border-yellow-400/10
  hover:border-yellow-400/20
  rounded-2xl
  backdrop-blur-xl
  transition-all duration-500
">
  {/* Content */}
</div>
```

### Typography Components

#### Section Heading
```jsx
<h2 className="
  text-4xl md:text-5xl
  font-light
  tracking-tight
  text-white
  mb-4
">
  <span className="italic text-yellow-400">Innovative</span>
  {' '}Solutions
</h2>
```

#### Body Text
```jsx
<p className="
  text-lg
  font-light
  text-white/60
  leading-relaxed
  max-w-2xl
">
  Clear, concise description of your product or service.
</p>
```

#### Caption/Metadata
```jsx
<span className="
  text-sm
  font-light
  text-white/40
  tracking-wide
">
  Published on Jan 1, 2024
</span>
```

### Navigation

#### Navbar
```jsx
<nav className="
  fixed top-0 left-0 right-0
  z-50
  bg-black/80 backdrop-blur-md
  border-b border-white/[0.05]
  transition-all duration-300
">
  {/* Nav content */}
</nav>
```

#### Nav Link
```jsx
<a href="#section" className="
  relative
  text-sm font-light tracking-wide
  text-white/60
  hover:text-white
  transition-colors duration-300
  px-3 py-2
  group
">
  Link Text
  <span className="
    absolute bottom-0 left-0 right-0
    h-0.5
    bg-gradient-to-r from-yellow-400 to-yellow-500
    opacity-0 scale-x-0
    group-hover:opacity-100 group-hover:scale-x-100
    transition-all duration-300
  " />
</a>
```

---

## Effects & Interactions

### Glassmorphism

```css
.glass-light {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.glass-dark {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
```

### Subtle Glow Effects

```css
/* White glow */
.glow-white {
  box-shadow: 0 0 30px rgba(255, 255, 255, 0.1);
}

/* Yellow glow */
.glow-yellow {
  box-shadow: 0 0 30px rgba(255, 205, 0, 0.2);
}

/* Yellow glow on hover */
.glow-yellow-hover:hover {
  box-shadow: 0 0 40px rgba(255, 205, 0, 0.3);
}
```

### Transitions

```css
/* Standard transition */
--transition-standard: all 0.2s ease-out;

/* Smooth transition */
--transition-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

/* Slow transition */
--transition-slow: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
```

### Hover States

```jsx
// Lift on hover
<div className="transition-transform duration-200 hover:-translate-y-1" />

// Scale on hover
<div className="transition-transform duration-200 hover:scale-105" />

// Glow on hover
<div className="transition-shadow duration-300 hover:shadow-lg hover:shadow-yellow-500/20" />
```

---

## Layout Patterns

### Container Widths

```css
/* Max widths for content */
--container-sm: 640px;
--container-md: 768px;
--container-lg: 1024px;
--container-xl: 1280px;
--container-2xl: 1536px;
```

### Grid Patterns

```jsx
// Three-column grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
  {/* Items */}
</div>

// Auto-fit responsive grid
<div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-8">
  {/* Items */}
</div>
```

### Section Spacing

```jsx
// Standard section
<section className="py-20 md:py-32">
  {/* Content */}
</section>

// Hero section
<section className="pt-32 pb-20 md:pt-40 md:pb-32">
  {/* Content */}
</section>
```

---

## Background Patterns

### Subtle Grid Pattern
```jsx
<div className="
  fixed inset-0
  bg-[radial-gradient(circle_at_center,rgba(255,215,0,0.03)_1px,transparent_1px)]
  bg-[size:24px_24px]
  pointer-events-none
  opacity-30
" />
```

### Gradient Overlay
```jsx
<div className="
  fixed inset-0
  bg-gradient-to-b from-black via-black to-yellow-950/10
  pointer-events-none
" />
```

---

## Iconography

### Icon Sizes
```css
--icon-xs: 16px;
--icon-sm: 20px;
--icon-md: 24px;
--icon-lg: 32px;
--icon-xl: 48px;
--icon-2xl: 64px;
```

### Icon Style
- Use line icons (not filled) for consistency
- Stroke width: 1.5px for most icons
- Use white/grayscale for icons, yellow only for emphasis
- Icon opacity: 0.85 for normal, 1.0 for active

---

## Animation Principles

### Timing
- Fast interactions: 150-200ms
- Standard animations: 300ms
- Complex animations: 500ms
- Ambient animations: 2-4s

### Easing
```css
/* Ease out - Elements entering */
cubic-bezier(0, 0, 0.2, 1)

/* Ease in - Elements exiting */
cubic-bezier(0.4, 0, 1, 1)

/* Ease in-out - Moving elements */
cubic-bezier(0.4, 0, 0.2, 1)
```

### Animation Examples

```jsx
// Fade in
<div className="animate-fade-in" />

// Slide up
<div className="animate-slide-up" />

// Scale in
<div className="animate-scale" />
```

---

## Accessibility Guidelines

### Color Contrast
- Ensure 4.5:1 contrast ratio for body text
- Ensure 3:1 contrast ratio for large text (18px+)
- Yellow on black exceeds WCAG AAA standards

### Focus States
```jsx
<button className="
  focus:outline-none
  focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-black
">
  Accessible Button
</button>
```

### Interactive Elements
- Minimum touch target: 44x44px
- Clear hover/focus/active states
- Keyboard navigation support

---

## Usage in Different Apps

### Quick Start

1. **Copy color variables** from this brand kit into your CSS/Tailwind config
2. **Import fonts**: Inter, Source Code Pro, Space Grotesk
3. **Use the component patterns** provided above
4. **Follow the typography guidelines** (especially italic usage)
5. **Maintain the black/white/yellow color scheme**

### Example Implementation

```jsx
// Your new component
import React from 'react';

export const BrandCard = ({ title, description, icon }) => {
  return (
    <div className="
      p-8
      bg-gradient-to-br from-white/[0.03] to-white/[0.01]
      border border-white/[0.08]
      hover:border-white/[0.15]
      rounded-2xl
      backdrop-blur-xl
      transition-all duration-500
      group
    ">
      {/* Icon */}
      <div className="
        inline-flex items-center justify-center
        w-16 h-16
        bg-yellow-400/10
        text-yellow-400
        rounded-xl
        mb-6
        group-hover:scale-110
        transition-transform duration-500
      ">
        {icon}
      </div>

      {/* Title */}
      <h3 className="
        text-xl font-light text-white
        mb-3
        group-hover:text-white/90
        transition-colors
      ">
        <span className="italic">{title}</span>
      </h3>

      {/* Description */}
      <p className="
        text-sm text-white/60
        font-light leading-relaxed
      ">
        {description}
      </p>

      {/* Decorative line */}
      <div className="
        mt-6 h-px
        bg-gradient-to-r from-white/10 via-white/5 to-transparent
      " />
    </div>
  );
};
```

---

## Brand Voice

### Tone
- **Professional yet approachable**
- **Clear and concise**
- **Innovative and forward-thinking**
- **Inclusive and educational**

### Writing Guidelines
- Use active voice
- Keep sentences short and punchy
- Emphasize simplification and accessibility
- Use *italics* for brand personality and emphasis
- Avoid jargon unless necessary

---

## Examples & Inspiration

### Good Examples
✅ Clean, minimal design with ample whitespace
✅ Strategic use of yellow for CTAs and emphasis
✅ Italics in headings for brand voice
✅ Light font weights for elegance
✅ Subtle borders and glassmorphism

### Avoid
❌ Multiple accent colors
❌ Heavy, bold typography everywhere
❌ Busy backgrounds
❌ Excessive gradients
❌ Colored text (stick to white/yellow)

---

## File Structure

```
your-app/
├── styles/
│   ├── brand-tokens.css     # All brand variables
│   ├── components.css       # Reusable component styles
│   └── global.css          # Global styles
├── components/
│   ├── brand/
│   │   ├── BrandButton.jsx
│   │   ├── BrandCard.jsx
│   │   ├── BrandHeading.jsx
│   │   └── index.js
└── BRAND_KIT.md            # This file
```

---

## Version History

- **v1.0** (2024-11-30): Initial brand kit based on Hyperliquid design principles

---

## Support

For questions about implementing this brand kit, refer to the component examples or reach out to the design team.

**Remember:** Consistency is key. When in doubt, refer back to this brand kit.
