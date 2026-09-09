# ECHO — AD Dashboard (Person C: Frontend)

Runnable Person C frontend reconstructed from the uploaded Claude work and the ECHO Master Build Playbook. The Playbook remains the product hard spec: ECHO is an on-set dialogue-continuity operations dashboard, not a chatbot.

## Run

### Video take demo
Open **Scenes → SC14**. The **Live take input** panel accepts local video/audio files, previews video in the browser, lets you confirm the transcript, and sends the take through the local ECHO demo pipeline. The local demo uses the confirmed transcript as a stand-in for speech-to-text; production transcription can be connected later through the data-source/backend layer.


Requirements: Node.js 20.9+.

```bash
npm install
npm run dev
```

Open `http://localhost:3000` — it redirects to `/scenes`.

This package intentionally uses Next.js Webpack mode for the default `dev` and `build` scripts. Next.js 16 documents `--webpack` as the supported opt-out when Turbopack/native bindings are problematic on a machine.

Production verification (optional):

```bash
npm run lint
npm run build
npm start
```

## Hero demo

Open `/scenes/SC14` and run Take 1 → Take 2 → Take 3. Take 3 becomes DRIFT with `really` isolated in Comparison View. Use the required Human Approval Gate to Accept or Flag for reshoot; the decision is written to the Continuity Ledger. Take 4 demonstrates low-confidence `NEEDS_REVIEW`.

## Architecture

`src/types/index.ts` defines the shared contract. `src/lib/demoEngine.ts` implements the deterministic `EchoDataSource`. Hooks consume the interface through `src/lib/dataSourceContext.tsx`. The UI therefore does not depend on the demo implementation.

## React Bits

React Bits is integrated as local copy-paste components under `src/components/react-bits`. The components are kept in-repo using the current official TypeScript/Tailwind copy-paste model. Motion components use `motion/react`, matching the current Motion/React Bits direction. Current components used include `BlurText`, `ShinyText`, `SpotlightCard`, `AnimatedContent`, and `CountUp`, with `TiltedCard` retained for future scene/card enhancement.

Official React Bits documentation: https://reactbits.dev/get-started/index
Official repository: https://github.com/DavidHDev/react-bits

## Windows dependency handling

`lightningcss-win32-x64-msvc` is declared as an optional platform dependency so Windows x64 installs receive the native Lightning CSS binding when npm resolves optional dependencies. The `doctor` script verifies the critical native/font files before starting the dev server.

## Included

- Scene List
- Scene Detail / Live Take Feed
- Exact processing state machine
- Comparison View and phrase-level divergence highlight
- Human Approval Gate
- Continuity Ledger / print report
- Deterministic SC14 demo stream
- Firestore/Confluent-ready `EchoDataSource` abstraction
- Uploaded Master Build Playbook
- Local React Bits components based on the current official source variants

## React Bits Pro / Squircle Shift

The project is pre-wired for the React Bits registries through `components.json`.
Put your paid key in `.env.local` as `REACTBITS_LICENSE_KEY` when you have one.
Then install the official component with:

```bash
npx shadcn@latest add @reactbits-starter/squircle-shift-tw
```

The current hackathon build includes a lightweight local `SquircleShift` visual with the same public prop vocabulary so the UI remains runnable without a license. Replace the local component with the registry-installed version when the license is available.

Official docs: https://pro.reactbits.dev/docs/installation
Official component: https://pro.reactbits.dev/docs/components/squircle-shift

## React Bits Pro note
The shipped ECHO demo uses a local Squircle Shift-inspired visual and does not require a React Bits Pro license. The official Pro registry can be added later with a valid REACTBITS_LICENSE_KEY.
