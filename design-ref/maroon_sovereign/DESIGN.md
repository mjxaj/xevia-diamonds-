# Design System Documentation: The Nocturnal Atelier

## 1. Overview & Creative North Star

### The Creative North Star: "The Nocturnal Atelier"
This design system is built to evoke the hushed, reverent atmosphere of a private high-jewelry viewing. We are moving away from the "e-commerce template" and toward a **Digital Editorial** experience. Every element must feel curated, not generated. 

To achieve this, we employ **Intentional Asymmetry**. Instead of rigid, centered grids, use the "Negative Space as Luxury" principle. Large areas of `surface` (maroon) are not "empty"; they are a canvas that signifies exclusivity. We break the digital plane by overlapping high-resolution jewelry photography with `display-lg` typography, creating a sense of physical depth and craftsmanship.

---

## 2. Colors

The palette is anchored in a deep, atmospheric maroon with gold light-sources. We do not use "colors"; we use "lighting."

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to define sections or cards. Boundaries must be defined solely through:
1.  **Tonal Shifts:** Placing a `surface-container-low` section against a `surface` background.
2.  **Negative Space:** Using large gutters (64px+) to separate content blocks.
3.  **Shadow Depth:** Using ambient, feathered light to suggest an edge.

### Surface Hierarchy & Nesting
Treat the UI as a series of velvet-lined trays. 
*   **Base:** `surface` (#240c10) is your floor.
*   **Interactive Layers:** Use `surface-container` tiers (Lowest to Highest) to create "nested" depth. For instance, a product detail drawer should use `surface-container-high` to visually "rise" toward the user.
*   **The "Glass & Gradient" Rule:** For floating navigation or modal overlays, use `surface` with a 70% opacity and a `20px backdrop-blur`. 
*   **Signature Textures:** For primary CTAs, do not use flat gold. Apply a subtle linear gradient from `primary` (#e9c349) to `primary_fixed_dim` to simulate the metallic luster of 18k gold.

---

## 3. Typography

The typographic voice is a conversation between heritage and modernity.

*   **The Display Voice (Noto Serif):** Used for headlines and hero moments. The high contrast of Noto Serif mimics the elegance of *Vogue* or *Harper’s Bazaar*. Use `display-lg` for product names to command the page.
*   **The Functional Voice (Manrope):** Used for body copy and labels. Manrope provides a clean, technical counterpoint to the serif, suggesting the precision of a master jeweler’s tools.
*   **Scale Contrast:** To achieve a premium feel, maximize the contrast between sizes. Pair a `display-lg` headline with a `label-sm` in all-caps (letter-spaced 15%) to create an editorial "caption" look.

---

## 4. Elevation & Depth

We reject the standard material shadow. Elevation in this system is "Ambient Light."

*   **The Layering Principle:** Place a `surface-container-lowest` card on a `surface-container-low` section. This "recessed" look creates a sense of a jewelry box compartment.
*   **Ambient Shadows:** If a component must float, use a shadow with a 32px blur, 0px spread, and 6% opacity, using the `on-background` color as the shadow tint. It should look like a soft glow, not a dark drop-shadow.
*   **The "Ghost Border" Fallback:** If accessibility requires a container edge, use the `outline-variant` token at **15% opacity**. It should be felt, not seen.
*   **Glassmorphism:** Use semi-transparent `surface-variant` for tooltips or hover-states to allow the deep maroon of the background to bleed through, maintaining the "no-line" aesthetic.

---

## 5. Components

### Buttons
*   **Primary:** A gold gradient (`primary` to `primary_fixed_dim`). Text in `on-primary` (Manrope, Bold). Corner radius: `sm` (0.125rem) for a sharp, tailored look.
*   **Secondary:** No background. A "Ghost Border" (15% `outline-variant`). On hover, the background fills to 10% `primary`.
*   **Tertiary:** Text-only in `primary`. Manrope Bold, All-caps, 0.1rem letter spacing.

### Input Fields
*   **Style:** Minimalist underline. No box. 
*   **States:** Default uses `outline-variant` at 30% opacity. Focus uses `primary` with a 2px underline.
*   **Typography:** Labels use `label-md` floating above the input.

### Cards & Lists
*   **The Rule:** **No dividers.**
*   **Execution:** Separate list items with 24px of vertical space. For product grids, use asymmetrical image heights (e.g., a 4:5 ratio next to a 1:1 ratio) to mimic a high-fashion magazine layout.
*   **Product Cards:** Use `surface-container-lowest` as the image background to create a subtle "platform" for the jewelry.

### Signature Component: The "Atelier Carousel"
A full-bleed horizontal scroll where images overlap the typography. Use `display-md` Noto Serif text that sits *behind* a transparent PNG of a jewelry piece to create 3D depth.

---

## 6. Do's and Don'ts

### Do:
*   **Embrace the Dark:** Keep 90% of the screen in the maroon/dark-surface range. High-key light is only for gold accents and product photography.
*   **Letter Spacing:** Increase letter spacing on all `label` and `title` tokens (0.05rem to 0.1rem).
*   **Micro-interactions:** Use slow, ease-in-out transitions (400ms+) for hovers. Luxury is never rushed.

### Don't:
*   **Don't use 100% White:** For text, use `on-surface` (#ffd9dc), which is a soft, tinted white that feels more natural against the deep maroon.
*   **Don't use `lg` or `xl` Rounding:** High-end luxury jewelry is about precision cuts. Stick to `none`, `sm`, or `md` for containers. `full` is reserved only for icon buttons or chips.
*   **Don't Grid-Lock:** Avoid putting every element into a perfectly symmetrical box. Let an image bleed off the edge of the screen to suggest the world is larger than the viewport.

---

## 7. Spacing
Luxury is defined by the space you *don't* fill.
*   **Hero Sections:** Minimum 120px top/bottom padding.
*   **Content Blocks:** Minimum 80px vertical separation.
*   **The "Breathing" Margin:** Maintain a minimum 64px side margin on desktop to keep content centered and prestigious.