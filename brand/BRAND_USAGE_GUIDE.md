# Brand Research Brand Usage Guide

## Quick Start

Your Brand Research website now features a **black and white minimalist design system** inspired by Hyperliquid, with **Brand yellow** (`#FFD633`) as the primary accent color and increased use of **italics** for brand personality.

## What's New

### ✅ Brand Kit Created
- **Location**: `BRAND_KIT.md` in the project root
- **Contains**: Complete design system, color palette, typography, components, and usage guidelines

### ✅ Design Tokens
- **Location**: `src/styles/brand-tokens.css`
- **Contains**: CSS custom properties for all brand colors, spacing, typography, and effects

### ✅ Reusable Brand Components
- **Location**: `src/components/brand/`
- **Components**:
  - `BrandButton.jsx` - Consistent button styles
  - `BrandCard.jsx` - Standardized card layouts
  - `BrandHeading.jsx` - Typography with italic emphasis
  - `BrandText.jsx` - Body text components
  - `BrandSection.jsx` - Section layouts

### ✅ Updated Components
All major components now use the new branding:
- ✓ Hero - More italics, updated yellow colors
- ✓ Navbar - Consistent yellow accents
- ✓ Portfolio - Italic headings, updated gradients
- ✓ Blockchain4Students - Enhanced branding
- ✓ Team - Consistent styling

## Using the Brand Components

### Example: Button
```jsx
import { BrandButton } from './components/brand';

// Primary white button
<BrandButton variant="primary" href="#section">
  Explore Products
</BrandButton>

// Yellow accent button
<BrandButton variant="yellow" onClick={handleClick}>
  Get Started
</BrandButton>

// Ghost button
<BrandButton variant="ghost" size="lg">
  Learn More
</BrandButton>
```

### Example: Card
```jsx
import { BrandCard } from './components/brand';

// Standard card
<BrandCard>
  <h3>Your Title</h3>
  <p>Your content</p>
</BrandCard>

// Featured card with yellow accent
<BrandCard variant="featured">
  <h3>Featured Content</h3>
  <p>This stands out with yellow accents</p>
</BrandCard>
```

### Example: Heading with Italic Emphasis
```jsx
import { BrandHeading } from './components/brand';

// Automatically adds italic yellow emphasis
<BrandHeading level={1} emphasize="Abstracting DeFi">
  for Everyone
</BrandHeading>

// Output: <h1><span className="italic text-yellow-400">Abstracting DeFi</span> for Everyone</h1>
```

## Typography Guidelines

### Use Italics For:
- Brand keywords and emphasis (e.g., *Abstracting DeFi*, *Building the future*)
- Product/service names
- Key value propositions
- Section headings that need emphasis

### Font Weights:
- **300 (Light)**: Default for most text - creates elegant, modern look
- **400 (Normal)**: Body text, normal paragraphs
- **500 (Medium)**: Subtle emphasis
- **600 (Semi-bold)**: Strong emphasis, CTAs

### Examples:
```jsx
// Heading with italic emphasis
<h2 className="text-4xl font-light">
  <span className="italic text-yellow-400">Building the Future</span> of DeFi
</h2>

// Body text with inline italics
<p className="text-lg font-light text-white/70">
  We <span className="italic">simplify DeFi</span> to make it accessible for all.
</p>
```

## Color Usage

### Black & White Foundation
- **Background**: Pure black `#000000`
- **Primary Text**: White `#FFFFFF`
- **Secondary Text**: White at 70% opacity `rgba(255,255,255,0.7)`
- **Tertiary Text**: White at 40% opacity `rgba(255,255,255,0.4)`

### Yellow Accent (Use Sparingly)
- **Primary Yellow**: `#FFD633` (Brand yellow-400)
- **Hover**: `#FFDF66` (yellow-300)
- **Active**: `#FFCD00` (yellow-500)

### When to Use Yellow:
✅ Primary CTAs
✅ Brand keywords in headings
✅ Active/selected states
✅ Important icons
✅ Featured cards/sections

❌ Don't use for body text
❌ Don't use for multiple elements at once
❌ Don't use for backgrounds (only as accents)

## Spacing & Layout

All spacing uses an 8px grid:
- `4px` - Tiny gaps
- `8px` - Small spacing
- `16px` - Standard spacing
- `24px` - Medium spacing
- `32px` - Large spacing
- `48px` - Section spacing
- `80px` - Hero spacing

## Glassmorphism Effect

```jsx
<div className="glass-light">
  {/* Semi-transparent white background with blur */}
</div>

<div className="glass-dark">
  {/* Semi-transparent black background with blur */}
</div>
```

## Applying to New Components

1. **Use the brand tokens** from `brand-tokens.css`
2. **Import brand components** when possible
3. **Follow the patterns** in `BRAND_KIT.md`
4. **Add italics** to brand keywords and emphasis
5. **Use yellow sparingly** for maximum impact

### Example New Component:
```jsx
import { BrandCard, BrandHeading, BrandText, BrandButton } from './components/brand';

const MyNewComponent = () => {
  return (
    <BrandCard variant="standard">
      <BrandHeading level={3} emphasize="Innovative">
        Solution
      </BrandHeading>

      <BrandText size="base" variant="secondary">
        Description of your solution with clean typography.
      </BrandText>

      <BrandButton variant="yellow" href="#learn-more">
        Learn More
      </BrandButton>
    </BrandCard>
  );
};
```

## Portability to Other Apps

The brand kit is designed to be portable. To use in another app:

1. **Copy the brand kit**: `BRAND_KIT.md`
2. **Copy design tokens**: `src/styles/brand-tokens.css`
3. **Copy brand components**: `src/components/brand/`
4. **Install fonts**: Inter (with italic variants), Source Code Pro, Space Grotesk
5. **Configure Tailwind** with the color tokens from `brand-tokens.css`

## Testing

Run the development server to see all changes:
```bash
npm run dev
```

Visit the site and verify:
- ✓ Black background with white text
- ✓ Yellow accents on buttons and emphasis
- ✓ Italics used throughout for brand personality
- ✓ Light font weights (300-400) for elegant feel
- ✓ Consistent spacing and layout

## Resources

- **Full Brand Kit**: `BRAND_KIT.md`
- **Design Tokens**: `src/styles/brand-tokens.css`
- **Brand Components**: `src/components/brand/`
- **Hyperliquid Inspiration**: Minimalist, black/white, elegant design

---

**Remember**: Consistency is key! Always refer to the brand kit when creating new components or pages.

For questions or clarifications, refer to `BRAND_KIT.md` or check existing components for patterns.
