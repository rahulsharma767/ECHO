# ECHO AD Dashboard — Final Dependency Audit

## Fixed in this build

- Removed `framer-motion` entirely. The project now uses the current Motion package and `motion/react` imports consistently.
- This specifically prevents the `activeAnimations` / `motion-dom` export mismatch caused by older `framer-motion` builds resolving against newer `motion-dom` releases.
- Pinned Motion to `13.2.0` and overrides `motion-dom` / `motion-utils` to `13.2.0` so the animation runtime stays on one compatible release line.
- All React Bits components use the current copy-paste architecture: local TSX components importing from `motion/react` where required.
- React Bits barrel exports are explicit and consistent with the default exports of each component.
- Next dev/build use Webpack on purpose for Windows compatibility with this project.
- Windows x64 Lightning CSS optional native dependency is declared and checked by `npm run doctor`.
- Next project root configuration is scoped to the project directory.

## React Bits basis

React Bits currently documents copy-paste components and TS/Tailwind variants. This project keeps the components locally under `src/components/react-bits` rather than depending on an unstable runtime package. Components used by the dashboard include BlurText, ShinyText, SpotlightCard, AnimatedContent and CountUp.

Official source checked on 2026-09-09:
https://github.com/DavidHDev/react-bits
