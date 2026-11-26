# Accessibility

**Hologram Studio** is an interactive 3D volumetric card creator and showcase built for the web. Everyone should be able to explore, customize, and contribute to the project regardless of ability, hardware, or assistive technology.

This document outlines what we prioritize to make the experience more accessible, what we ask from contributors, and how to let us know if you run into a barrier.

## Priorities

We aim to make interactive 3D and UI experiences smoother and more predictable across different needs and setups (treating accessibility guidelines as an ongoing, aspirational target rather than a formal certification):

- **Motion and visual comfort:** 3D tilt, parallax, and holographic shader animations can be distracting or uncomfortable for users sensitive to motion. We aim to respect system reduced-motion preferences and keep visual controls clear and legible.
- **Keyboard and clear controls:** Interactive buttons, sliders, and presets should remain reachable and understandable without relying solely on pointer gestures.
- **Readable layout and contrast:** Text, labels, and card previews should stay clear and well-structured across screen sizes and browser zoom levels.

## Contributor expectations

When you open a pull request or add new features to **Hologram Studio**:

- Keep UI controls properly labeled and usable with keyboard navigation where applicable.
- Consider motion intensity and visual contrast when introducing new holographic shaders, animations, or card presets.
- Include a screenshot or brief description of user-facing UI or visual changes in your pull request so reviewers can check layout and readability.

## Reporting accessibility issues

If something in **Hologram Studio** is hard to use, read, or navigate—or if an interactive 3D element gets in your way—please open an issue on GitHub and include:

- What you were trying to do and where it happened (page, control, or preset)
- What barrier you experienced
- Your browser, operating system, and any assistive tools (such as a screen reader or keyboard-only navigation) you were using
