---
name: AICR
description: AI Content Repurposer — Convert YouTube to shorts
colors:
  primary: "#FF6B4A"
  neutral-bg: "#faf9f7"
  neutral-fg: "#171717"
  neutral-border: "#E7E5E4"
  neutral-muted: "#9CA3AF"
  dark-bg: "#0e0e0e"
  dark-fg: "#f0ede6"
  dark-border: "#2a2a2a"
  dark-muted: "#888888"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontWeight: 700
    lineHeight: 1.2
  headline:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontWeight: 600
    lineHeight: 1.3
  title:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontWeight: 500
    lineHeight: 1.4
  body:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  container: "24px"
  control: "12px"
  button: "12px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.button}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "#e55a3a"
  input-field:
    backgroundColor: "{colors.neutral-bg}"
    textColor: "{colors.neutral-fg}"
    borderColor: "{colors.neutral-border}"
    rounded: "{rounded.control}"
  card:
    backgroundColor: "{colors.neutral-bg}"
    rounded: "{rounded.container}"
---

# Design System: AICR

## 1. Overview

**Creative North Star: "The Welcoming Workshop"**

AICR's visual system is warm, approachable, and stripped of unnecessary complexity. The interface should feel like a well-organized workshop — everything has its place, tools are within reach, and the work flows naturally. Unlike cold enterprise dashboards or flashy marketing SaaS, this is a place where creators feel comfortable doing the repetitive work of content repurposing.

The aesthetic rejects generic SaaS patterns: no blue gradient heroes, no glassmorphism as decoration, no identical card grids. Instead, surfaces are clean, colors are purposeful, and every interaction feels tactile and confident.

**Key Characteristics:**
- Warm neutral backgrounds with coral accent as the sole color voice
- Rounded corners (12–24px) for a friendly, approachable feel
- Flat by default — no shadows unless serving a functional purpose
- Plus Jakarta Sans throughout — modern, geometric, highly legible
- Dark mode supported with inverted neutrals, same coral accent

## 2. Colors

**The Coral Energy Rule.** The primary accent (#FF6B4A) is used sparingly — only on primary actions, active states, and focal points. Its warmth is the point. Restrained use preserves its power.

### Primary
- **Warm Coral** (#FF6B4A): The single accent color. Used for primary buttons, active navigation states, and focus indicators. Also used in dark mode — never muted or desaturated.

### Neutral
- **Soft Stone** (#faf9f7): Default light-mode background. Warm off-white, not clinical white.
- **Charcoal** (#171717): Primary text in light mode. Soft black, not pure black.
- **Warm Gray** (#E7E5E4): Borders and dividers. Subtle, never stark.
- **Muted Gray** (#9CA3AF): Secondary text, placeholders, disabled states.

### Dark Mode
- **Deep Black** (#0e0e0e): Light-absorbing dark background, not pure #000.
- **Soft Cream** (#f0ede6): Text in dark mode — warm, not harsh.
- **Dark Border** (#2a2a2a): Borders in dark mode — visible but not distracting.
- **Dark Muted** (#888888): Secondary text in dark mode.

## 3. Typography

**Display Font:** Plus Jakarta Sans (with system sans fallback)
**Body Font:** Plus Jakarta Sans
**Label Font:** Plus Jakarta Sans (500 weight for labels)

**Character:** Modern geometric sans with subtle warmth. The rounded terminal on 'a' and the approachable 'g' give it a friendly feel without being playful. Optimized for interfaces — high x-height, excellent legibility at small sizes.

### Hierarchy
- **Display** (700, ~48px, 1.2): Hero headlines on landing, section titles.
- **Headline** (600, ~32px, 1.3): Page titles, major section headers.
- **Title** (500, ~24px, 1.4): Card titles, component headings.
- **Body** (400, ~16px, 1.5): Paragraphs, descriptions. Max-width capped at 65–75ch for readability.
- **Label** (500, ~14px, 1.4, 0.5px letter-spacing): Form labels, small UI text, buttons.

**The Single Typeface Rule.** All text uses Plus Jakarta Sans. No second font for code — monospace only where semantic (timestamps, technical data), not for aesthetic variety.

## 4. Elevation

**The Flat-by-Default Rule.** Surfaces are flat at rest. Depth is conveyed through:
- Background tonal contrast (different shades of neutral)
- Border presence or absence
- Size and spacing relationships

No ambient shadows. No lifted layers. When something needs emphasis, it gets a border, a background tint, or positional prominence — not a shadow.

Motion (fade-up on page load) provides subtle entrance animation, but no shadow-based elevation exists in this system.

## 5. Components

### Buttons
- **Shape:** 12px radius
- **Primary:** Background #FF6B4A, white text, 12px 24px padding. Hover: #e55a3a (darker coral). No shadow, no border.
- **Secondary:** Transparent background, #FF6B4A text, border: 1px solid #FF6B4A. Hover: light coral tint background.
- **Ghost:** No background, no border, #171717 text. Hover: subtle background tint.

### Cards / Containers
- **Corner Style:** 24px radius for large containers (hero sections), 12px for smaller cards
- **Background:** Uses neutral backgrounds (Soft Stone in light mode)
- **Shadow Strategy:** None — flat design
- **Border:** Optional 1px Warm Gray border for definition
- **Internal Padding:** 24px standard

### Inputs / Fields
- **Style:** 12px radius, 1px Warm Gray border, Soft Stone background
- **Focus:** Border shifts to primary Coral (#FF6B4A), subtle glow
- **Error:** Border shifts to red (not green — avoid red/green as sole differentiators per accessibility)

### Navigation
- **Style:** Minimal horizontal nav, text-based links
- **States:** Default (Charcoal), Hover (Coral underline or tint), Active (Coral solid)
- **Mobile:** Stacked vertical layout, same styling

## 6. Do's and Don'ts

### Do:
- **Do** use the coral accent (#FF6B4A) for primary actions only
- **Do** maintain warm neutral backgrounds — never use pure white (#ffffff) or pure black (#000000)
- **Do** use 12px radius on interactive elements (buttons, inputs), 24px on container/hero elements
- **Do** keep all typography in Plus Jakarta Sans
- **Do** support both light and dark modes with the same color tokens
- **Do** use motion sparingly — fade-up on page load, subtle transitions on hover/focus

### Don't:
- **Don't** add blue/purple gradient hero sections — this is a tool, not a marketing site
- **Don't** use glassmorphism or backdrop blur as decorative elements
- **Don't** create identical card grids with icon + heading + text repeated endlessly
- **Don't** use hero-metric templates (big number, small label, gradient accent)
- **Don't** use border-left or border-right as colored accent stripes (side-stripe borders)
- **Don't** use gradient text — emphasis comes from weight or size, never gradients
- **Don't** use red/green as the sole indicator of success/failure (accessibility)
- **Don't** add unnecessary animations, onboarding tours, or attention-demanding empty states