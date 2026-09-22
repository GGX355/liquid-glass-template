# PULSE on Liquid / 02

Reference: Liquid / 02, commit `aa4c4405a49701bff2eb8743ff812f3043e8e739`.

This is an independent, interactive PULSE visual prototype built inside the lab, using its actual scene and optical material. It does not load the older `99e4937` material or use the earlier Pulse integration. It does not access authentication, databases, voting services or real prize events. Results exist only in page memory and reset on refresh.

## Source boundaries

- `liquid-glass.js`, `liquid-glass.css`, `visual.css`, `optics.js` and `motion.js` are unchanged from the reference commit. The new page directly imports the first four; there is no copied or adapted optical implementation.
- PULSE now uses the role-based presets in `pulse-glass.js`: balanced defaults to hero 50, panel 40, navigation 30 and independent control 22. Controls inside glass share the parent optics and add translucent highlights instead of stacking SVG filters. See [GLASS_SYSTEM.md](GLASS_SYSTEM.md); the fixed-50 statements below are historical verification of earlier revisions.
- `pulse-site.css` defines the new PULSE layout, responsive arrangement and text/buttons. It does not replace the shared liquid pseudo-element styles. Aurora, dune and blueprint use the lab's landscape classes; their positioning is adapted to the page layout.
- `pulse-site.js` contains demo UI state, pointer highlights, three-tab spring navigation, shape switching, the expandable capsule, native dialogs and pause/reduced-motion behavior. `pulse-interactions.js` reuses the lab's `glide` integration for draggable-lens inertia, adds pointer-card tilt and provides a persistent system/dark/light theme control.
- Dialogs preserve the current scroll position and temporarily hide underlying activity copy. Where the scene does not cover the dialog, a stronger backdrop protects legibility; the modal reading surface remains transparent.
- The lab homepage gains a PULSE link. Its original page and interactions remain available at `index.html`.
- Static publication uses the explicit 19-asset allowlist in `prepare-static.mjs`, including the PULSE page and its material, motion and layout modules. Documentation, evidence, tests and server scripts are not published.

## Verified on 2026-09-22

- Six existing optics/motion tests pass; JS syntax check, static build and Git whitespace check pass.
- Chromium browser previews at 1280, 768, 390 and 320 pixel widths; no document horizontal overflow at measured widths.
- Direct DOM inspection confirms all eight filters have scale 100 and the shared `saturate(1.22)` backdrop material. The active navigation pill itself now carries the optical material.
- Poll submission starts disabled; selecting an option opens confirmation; confirmation displays the chosen option; reset restores the form.
- Draw navigation and random inspiration dialog work. Rules dialog opens and closes. Escape returns focus to the opener; confirmation moves focus to the visible reset action.
- Arrow-key tab navigation, three palettes and pause/resume controls work. Reduced-motion emulation disables animation and the motion toggle; temporary browser emulation was restored afterward.
- No warning/error console entries during the exercised flows.
- Screenshots are retained under ignored `evidence/pulse-lab-*`.

## Complete interaction pass

The initial PULSE preview only ported the surfaces. The revised entry includes the requested interaction set:

1. **Three animated landscapes:** aurora ribbons; dune layers and a moving sun; blueprint grid movement and rotating projected circles. Palette controls remain available below the stage.
2. **Inertia and shape:** the default “光感探索” tab contains a pointer-captured draggable lens. Release continues with bounded momentum and edge bounce using `motion.js`. Rounded rectangle, circle and capsule controls update the original renderer's radius; Home/reset restores position. Only the lens disables touch panning, preserving normal page scrolling elsewhere.
3. **Interaction feedback:** a refracting spring navigation pill; a pointer-tilted invitation card that returns to neutral on leave; a width/height-morphing capsule whose revealed buttons enter the poll or draw flow. Collapsed content is inert.
4. **Presentation:** system/dark/light theme with storage guarded for restricted contexts, mobile headline wrapping, 44px controls, narrow-screen shape bounds, consistent spacing, keyboard navigation, paused/offscreen motion and reduced-motion support.

Browser checks additionally exercised:

- Mouse drag from `(900,370)` to `(710,455)`: lens left moved from 719 to 378, farther than the pointer's 190px drag, demonstrating release inertia; pointer-held state cleared.
- Circle radius 999, pill radius 90 and pill dimensions 340×174 on desktop; pill fits within the 269px scene at a 320px viewport.
- Pointer tilt reaches a non-identity perspective/rotation transform, then resets on pointer leave even when the main stage is offscreen.
- Expanded capsule exposes active navigation buttons; its poll action leads to a completed demo vote. Closing the capsule hides/inerts those actions.
- Blueprint grid/orbit and dune sun animations are running; pause changes their play state to paused; reduced-motion changes animation to none. ArrowUp moves the paused lens exactly 16px.
- Theme preference survives reload. At widths 1280, 768, 390 and 320, document width does not exceed viewport client width.

The browser controller cannot dispatch simulated touch events in this environment. Pointer behavior and mobile layout were checked, but physical touch-device behavior remains unverified.

This verifies the prototype in Chromium, not acceptance of a new PULSE product design. Safari, Firefox, physical touch devices, screen-reader behavior and GPU performance are not yet measured. At this deliberate strength, background lettering is strongly distorted near edges; the page does not automatically weaken the material.

## Readability and motion refinement

The subsequent review keeps all five reference files and strength 50 unchanged. `pulse-polish.css` adjusts only PULSE typography, layout and landscape illumination. Release velocity now averages a short pointer path; invitation-card tilt follows a critically damped spring with an untransformed measurement plane. Pointer highlights batch reads/writes once per frame. See [VISUAL_REVIEW.md](VISUAL_REVIEW.md) for the findings, verification and remaining limits. The current test command runs ten tests.

## Spring disclosure follow-up

The capsule now uses `spring-disclosure.js` and `spring-disclosure.css` for continuous width/height transitions with mild overshoot and velocity-preserving interruption. It is also used by the lab homepage's breathing capsule. See [SPRING_TRANSITIONS.md](SPRING_TRANSITIONS.md). The test command runs fourteen tests. The spring release included fifteen assets; the current glass-system release adds two PULSE assets, for seventeen total.

## Stable activity transitions

The latest preview reserves natural grid space across activity modes and poll states. Panels and copy crossfade with a short elastic translation; native dialogs animate their entry/exit without forced stage scrolling. Inactive states are inert and hidden from accessibility navigation. See [PANEL_TRANSITIONS.md](PANEL_TRANSITIONS.md) for the 18-test and browser observations. The current publication has 19 assets; counts above describe earlier releases.
