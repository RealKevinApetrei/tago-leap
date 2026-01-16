# Brand Stars Brand Kit

Flashing ± symbols that add a dynamic, twinkling effect to your components. Perfect for decorative accents and drawing attention to key areas.

## Installation

The `BrandStars` component is located in `src/components/brand/BrandStars.jsx`.

## Components

### BrandStars

Main component for scattering multiple flashing ± symbols across an area.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `count` | number | `5` | Number of ± symbols to display |
| `className` | string | `''` | Additional CSS classes |
| `color` | `'white' \| 'yellow' \| 'white-yellow'` | `'white'` | Color of the symbols |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Size of the symbols |
| `spread` | `'full' \| 'top' \| 'bottom' \| 'left' \| 'right' \| 'center'` | `'full'` | Where to position the stars |

#### Usage Examples

**Basic scattered stars:**
```jsx
import { BrandStars } from './brand/BrandStars';

<div className="relative">
  <BrandStars count={5} />
  {/* Your content */}
</div>
```

**Large yellow stars across top section:**
```jsx
<div className="relative">
  <BrandStars count={10} color="yellow" size="xl" spread="top" />
  {/* Your content */}
</div>
```

**Subtle white stars with custom opacity:**
```jsx
<div className="relative">
  <BrandStars
    count={8}
    color="white"
    size="lg"
    spread="full"
    className="opacity-60"
  />
  {/* Your content */}
</div>
```

**Stars that change color on hover:**
```jsx
<div className="relative group">
  <BrandStars count={6} color="white-yellow" size="md" spread="center" />
  {/* Your content */}
</div>
```

### BrandStar

Single flashing star for inline use.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | string | `''` | Additional CSS classes |
| `color` | `'white' \| 'yellow' \| 'white-yellow'` | `'white'` | Color of the symbol |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Size of the symbol |
| `delay` | number | `0` | Animation delay in seconds |

#### Usage Examples

**Inline with text:**
```jsx
import { BrandStar } from './brand/BrandStars';

<h1>
  Amazing Product <BrandStar color="yellow" size="lg" />
</h1>
```

**Multiple stars with staggered delays:**
```jsx
<div>
  <BrandStar delay={0} />
  <BrandStar delay={0.5} />
  <BrandStar delay={1} />
</div>
```

## Animation

The flashing animation is defined in `src/index.css` as `tago-twinkle`:

```css
@keyframes tago-twinkle {
  0%, 100% {
    opacity: 0.2;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.2);
  }
}
```

- **Duration**: 2 seconds per cycle
- **Effect**: Fades from 20% to 100% opacity while scaling from 1x to 1.2x
- **Timing**: Ease-in-out for smooth transitions
- **Infinite loop**: Stars continuously twinkle

## Use Cases

1. **Hero sections** - Add visual interest to landing pages
2. **Feature highlights** - Draw attention to key features
3. **Decorative accents** - Add subtle movement to static content
4. **Headers** - Enhance section headers with inline stars
5. **Cards** - Add sparkle to card components on hover

## Spread Options

| Spread | X Range | Y Range | Best For |
|--------|---------|---------|----------|
| `full` | 0-100% | 0-100% | General backgrounds |
| `top` | 0-100% | 0-30% | Headers, top sections |
| `bottom` | 0-100% | 70-100% | Footers, bottom sections |
| `left` | 0-30% | 0-100% | Left sidebars, margins |
| `right` | 70-100% | 0-100% | Right sidebars, margins |
| `center` | 30-70% | 30-70% | Focused content areas |

## Color Options

- **`white`** - Clean, modern look for dark backgrounds
- **`yellow`** - Brand color, draws more attention
- **`white-yellow`** - Interactive, changes on hover (requires parent with `group` class)

## Size Reference

| Size | Text Class | Best For |
|------|-----------|----------|
| `sm` | text-sm | Subtle accents, high density |
| `md` | text-base | General use |
| `lg` | text-xl | Hero sections, emphasis |
| `xl` | text-2xl | Large displays, major sections |

## Tips

1. **Opacity control** - Use `className="opacity-60"` to make stars more subtle
2. **Z-index** - Stars use `pointer-events-none` so they won't interfere with clicks
3. **Performance** - Keep `count` under 15 for best performance
4. **Responsive** - Consider using fewer stars on mobile with conditional rendering
5. **Contrast** - White stars work best on dark backgrounds, yellow on medium-dark

## Example Combinations

**Subtle background decoration:**
```jsx
<BrandStars count={12} color="white" size="sm" spread="full" className="opacity-40" />
```

**Hero accent:**
```jsx
<BrandStars count={8} color="yellow" size="xl" spread="top" className="opacity-70" />
```

**Interactive card:**
```jsx
<div className="group relative">
  <BrandStars count={5} color="white-yellow" size="md" spread="center" />
  <div className="card-content">...</div>
</div>
```

**Header decoration:**
```jsx
<h1 className="text-4xl">
  Welcome to Brand <BrandStar color="yellow" size="lg" delay={0.5} />
</h1>
```
