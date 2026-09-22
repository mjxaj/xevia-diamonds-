# Design System: High-End Editorial Admin Experience

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Velvet Vault."** 

Unlike standard, utilitarian admin dashboards that feel cold and clinical, this system is designed to feel like a private atelier. It balances the high-stakes precision of a financial engine (Stripe-inspired) with the tactile luxury of a heritage jewelry brand. We break the "template" look by utilizing intentional asymmetry, deep tonal layering, and a high-contrast typographic scale that mirrors a luxury fashion editorial. 

The goal is to move away from a "flat" digital interface and toward a multi-dimensional environment where data is presented as a curated collection.

---

## 2. Colors & Materiality
This palette is rooted in a "Deep Luxury" spectrum, using dark maroon and obsidian black as the foundation, with gold serving as the surgical strike of interactive intent.

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid borders to section off content. In this design system, boundaries are defined strictly through background color shifts. Use `surface_container_low` against a `surface` background to define a card. This creates a more sophisticated, "seamless" aesthetic found in high-end physical packaging.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Use the surface-container tiers to create depth:
*   **Base:** `surface` (#131313) for the primary application background.
*   **Secondary Sections:** `surface_container_low` (#1B1B1B) for sidebar backgrounds or inactive regions.
*   **Primary Work Area:** `surface_container` (#1F1F1F) for the main dashboard canvas.
*   **Floating Elements:** `surface_container_highest` (#353535) for cards or active modules.

### The "Glass & Gradient" Rule
To avoid a flat, "out-of-the-box" appearance:
*   **Glassmorphism:** Use semi-transparent versions of `primary_container` (#5A0F1C) with a 20px-40px backdrop-blur for floating navigation or hovering tooltips.
*   **Signature Textures:** For primary CTAs or high-level summary cards, apply a subtle linear gradient from `primary` (#FFB2B6) to `primary_container` (#5A0F1C) at a 135-degree angle. This adds "soul" and depth that flat hex codes cannot replicate.

---

## 3. Typography
The typography strategy relies on the tension between the classical authority of Noto Serif and the technical precision of Inter.

*   **Display & Headlines (Noto Serif):** Used for "Momentum Moments"—page titles, total revenue figures, and collection names. These should feel like headers in a luxury magazine.
*   **Body & Interface (Inter):** Used for all functional data. Inter provides the "Stripe-like" efficiency required for a powerful backend.
*   **The Scale of Importance:** Use `display-lg` for primary KPIs. The contrast between a massive serif number and a tiny, uppercase `label-sm` in Inter creates an editorial rhythm that feels expensive.

---

## 4. Elevation & Depth
In this design system, we do not use "shadows" in the traditional sense. We use **Tonal Layering**.

### The Layering Principle
Hierarchy is achieved by "stacking" surface tiers. Place a `surface_container_lowest` card on a `surface_container_low` section to create a soft, natural inset effect. This mimics the look of a jewelry display case.

### Ambient Shadows
If a floating effect is required (e.g., a modal or dropdown):
*   **Shadow Specs:** Blur: 40px, Spread: -5px, Opacity: 15%.
*   **Shadow Color:** Use a tinted version of `primary_fixed` (#FFDADB) rather than pure black. This creates a warm, "ambient" glow that feels like soft boutique lighting.

### The "Ghost Border" Fallback
If a border is required for accessibility in forms:
*   Use the `outline_variant` token at **15% opacity**. 
*   **Forbid:** 100% opaque, high-contrast borders. They break the velvet aesthetic.

---

## 5. Components

### Buttons
*   **Primary:** A gradient of `primary_container` to `primary_fixed_dim`. Roundedness: `md` (0.375rem). Text: `label-md` (Inter, Semibold).
*   **Secondary (Gold Accent):** A "Ghost" style button with an `outline` of `secondary` (#E9C349) at 20% opacity and `secondary` text.
*   **Tertiary:** Pure text using `on_surface_variant`, transitioning to `secondary` on hover.

### High-Contrast Charts
*   **Stroke:** Data lines must use `secondary` (Gold) or `primary` (Maroon) with a 2px width.
*   **Area Fills:** Use a gradient from the line color to 0% opacity.
*   **Grid Lines:** Use `outline_variant` at 5% opacity. They should be barely visible, felt rather than seen.

### Tables & Lists
*   **Rule:** Forbid horizontal divider lines.
*   **Structure:** Use vertical whitespace (16px–24px) to separate rows. 
*   **Hover State:** Change the row background to `surface_bright` (#393939) with a 4px corner radius to "lift" the data point for the user.

### Sophisticated Form Fields
*   **Idle:** `surface_container_highest` background with no border.
*   **Focus:** A 1px "Ghost Border" using `secondary` (Gold) at 30% opacity and a subtle inner glow. 
*   **Labels:** Always use `label-sm` in all-caps with a letter-spacing of 0.05rem for a premium, structured feel.

### Sidebar Navigation
*   **Aesthetic:** The sidebar should be a "monolith" of `surface_container_lowest`. 
*   **Active State:** No "pill" shapes. Use a vertical gold sliver (2px) on the left edge of the active item and shift the text color to `secondary_fixed`.

---

## 6. Do’s and Don’ts

### Do:
*   **Use Generous Whitespace:** Luxury is defined by the space you don't use. Allow data points to "breathe."
*   **Embrace Asymmetry:** Place a large serif headline on the left and a small, precise data table on the right to create an editorial layout.
*   **Tone-on-Tone:** Use different shades of maroon and black to create hierarchy rather than introducing new colors.

### Don't:
*   **Don't use pure white (#FFFFFF):** It is too harsh for this palette. Use `on_surface` (#E2E2E2) for text to maintain the soft, premium feel.
*   **Don't use standard icons:** Use "Light" or "Thin" weight icon sets (1px stroke) to match the elegance of the gold accents.
*   **Don't over-shadow:** If the layout feels "muddy," you likely have too many shadows. Revert to Tonal Layering.