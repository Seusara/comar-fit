---
name: Kinetic Glow
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#b9cacb'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#849495'
  outline-variant: '#3b494b'
  surface-tint: '#00dbe9'
  primary: '#dbfcff'
  on-primary: '#00363a'
  primary-container: '#00f0ff'
  on-primary-container: '#006970'
  inverse-primary: '#006970'
  secondary: '#e5b4ff'
  on-secondary: '#4f0077'
  secondary-container: '#ad00fe'
  on-secondary-container: '#fef0ff'
  tertiary: '#fff3f6'
  on-tertiary: '#610046'
  tertiary-container: '#ffcbe4'
  on-tertiary-container: '#b40084'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#7df4ff'
  primary-fixed-dim: '#00dbe9'
  on-primary-fixed: '#002022'
  on-primary-fixed-variant: '#004f54'
  secondary-fixed: '#f5d9ff'
  secondary-fixed-dim: '#e5b4ff'
  on-secondary-fixed: '#30004b'
  on-secondary-fixed-variant: '#7000a7'
  tertiary-fixed: '#ffd8ea'
  tertiary-fixed-dim: '#ffaed9'
  on-tertiary-fixed: '#3c002a'
  on-tertiary-fixed-variant: '#890064'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-lg:
    fontFamily: Montserrat
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-md:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-lg-mobile:
    fontFamily: Montserrat
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  stats-num:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '800'
    lineHeight: 24px
    letterSpacing: -0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 16px
  margin_mobile: 20px
  margin_desktop: 48px
---

## Brand & Style

The design system is engineered for high-intensity motivation and head-to-head competition. It targets active pairs who value performance tracking and social accountability. The aesthetic is "Elite Kinetic"—combining the professional precision of high-end sports equipment with the immersive energy of modern gaming interfaces.

The UI leverages a **Dark-Mode Glassmorphism** style. Deep, ink-like backgrounds provide a high-contrast stage for vibrant, glowing accents and translucent surface layers. Visuals should evoke a sense of momentum, utilizing blurred background highlights and sharp, legible data visualizations to keep the focus on progress and competition.

## Colors

The palette is anchored in **Graphite Grey** and **Deep Black** to reduce visual noise and maximize the impact of data. 

- **Primary Accents:** Electric Blue and Vibrant Purple are used for primary actions and "User A" metrics.
- **Secondary Accents:** Neon Pink is reserved for "User B" metrics and competitive "versus" states.
- **Gradients:** Use the "Action" gradient for buttons and progress rings. The "Streak" gradient is specifically for "on-fire" status effects and high-performance milestones.
- **Glassmorphism:** Surfaces use a semi-transparent Graphite Grey (`#1C1C1E` at 80% opacity) with a `20px` background blur to create depth without losing the dark aesthetic.

## Typography

This design system uses a dual-font approach. **Montserrat** provides a geometric, bold character for headlines and numerical data, echoing the look of athletic apparel branding. **Inter** is used for body copy and UI labels to ensure maximum legibility at smaller sizes.

- **Stats-Num:** Specifically for workout metrics (BPM, Pace, Reps). Use "Tnum" (tabular figures) settings to prevent layout jitter during live updates.
- **Labels:** Always use the uppercase `label-md` for category headers and navigation items to maintain a structured, professional appearance.

## Layout & Spacing

The layout follows a **Fluid Grid** model with a heavy emphasis on vertical momentum. 

- **Mobile:** 4-column grid with 20px side margins. Elements should feel "oversized" to facilitate easy tapping during physical activity.
- **Desktop/Tablet:** 12-column grid. Content is usually contained in a "Comparison View" split vertically down the center to represent the two competitors.
- **Rhythm:** Use increments of 8px for most spacing. 16px is the standard gutter between cards; 24px is the standard vertical rhythm between distinct content sections.

## Elevation & Depth

Hierarchy is established through **Tonal Layering** and **Glassmorphism** rather than traditional heavy shadows.

- **Level 0 (Base):** Deep Black `#000000`.
- **Level 1 (Cards):** Graphite Grey `#1C1C1E` with a 1px `glass_stroke` border.
- **Level 2 (Modals/Popovers):** Elevated Grey `#2C2C2E` with an `Outer Glow` (8px blur) using the primary color at 15% opacity to simulate a light-emitting screen.
- **Active State:** Any "live" or "active" workout card should utilize a subtle pulse animation on its border using the "Action" gradient.

## Shapes

The shape language is friendly yet structured. A consistent **16px (1rem)** corner radius is applied to all primary containers and cards to echo the rounded aesthetics of premium wearable hardware.

- **Primary Buttons:** Use the `rounded-xl` (24px) or full pill-shape to differentiate them from informational cards.
- **Input Fields:** Match the card roundedness (16px).
- **Avatars:** Always circular to provide a soft counterpoint to the structured grid.

## Components

- **Action Buttons:** Large height (56px minimum). Use the "Action" gradient for primary tasks. Text is always `label-md` bold.
- **Metric Chips:** Small, semi-transparent capsules used to display quick data like "12 min" or "Indoor". Background: `rgba(255, 255, 255, 0.1)`.
- **Comparison Cards:** A layout component where two data points are placed side-by-side. The "leader" receives a subtle outer glow in their respective accent color (Blue or Pink).
- **The "Streak" Flame:** A custom icon component using the "Streak" gradient. For streaks >10 days, add a secondary "glow" layer behind the icon with a `30px` blur.
- **Progress Rings:** Large stroke width (12px+). Background track is `rgba(255, 255, 255, 0.05)`. The active track uses a gradient stroke with rounded caps.
- **Glass Lists:** List items separated by 1px dividers (`rgba(255, 255, 255, 0.05)`) with no background, allowing the base layer to show through.