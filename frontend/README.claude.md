# ECHO — AD Dashboard (Person C: Frontend)

Real-time dialogue-continuity monitor for on-set production. Built against
the Master Build Playbook as the hard spec — Section 7's exact UX states,
Section 5's data shapes, no chat interface anywhere.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · framer-motion ·
lucide-react. Fonts are self-hosted IBM Plex Sans/Mono via `@fontsource`
(no external font CDN calls at runtime).

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:3000 — it redirects to `/scenes`.

```bash
npm run build   # production build
npm run lint    # eslint
```

## Screens

- `/scenes` — Scene List, live status per scene (Idle / Live / Awaiting AD / Clear)
- `/scenes/[sceneId]` — Live Take Feed + the demo control panel (on `SC14` only)
- `/ledger` — Continuity Ledger / exportable report (`Export report` triggers print-to-PDF)

## Running the hero demo

Go to `/scenes/SC14` and either:
- Click **Take 1 → Take 2 → Take 3** individually to watch each take move
  through `RECEIVED → EXTRACTING → COMPARING_SCRIPT → COMPARING_PRIOR →
  CLASSIFYING → result`, or
- Click **Run full demo (1→2→3)** to auto-play the whole sequence.

Take 3 lands as `DRIFT` and opens the Comparison View (Take 1 vs Take 3,
"really" highlighted, confidence, reason). Use the Approval Gate to
**Accept** or **Flag for reshoot** — the decision writes to the Continuity
Ledger immediately. A bonus **Take 4** demonstrates the low-confidence →
`NEEDS_REVIEW` routing path from the playbook's failure/retry rules.

Click **Reset scene** to clear SC14 and replay.

## Architecture — swapping in the real backend

Every screen and component is built against the types and interface in
`src/types/index.ts`, not against the demo engine. The contract is
`EchoDataSource`:

```ts
interface EchoDataSource {
  subscribeConnectionStatus(cb): Unsubscribe;
  subscribeScenes(cb): Unsubscribe;
  subscribeSceneTakes(sceneId, cb): Unsubscribe;
  subscribeLedger(cb): Unsubscribe;
  submitHumanDecision(sceneId, takeNumber, decision): Promise<void>;
}
```

`src/lib/demoEngine.ts` implements this today with an in-memory, timed
simulation. To go live:

1. Write a new file, e.g. `src/lib/firestoreDataSource.ts`, implementing
   `EchoDataSource` against real Firestore `onSnapshot` listeners
   (`subscribeConnectionStatus` → Kafka consumer health doc,
   `subscribeSceneTakes` → `scenes/{sceneId}` listener, etc. — the
   Firestore schema in Section 5 of the playbook maps directly onto
   `SceneState`/`TakeRecord`).
2. In `src/components/shell/AppShell.tsx`, swap
   `<DataSourceProvider source={demoEngine}>` for
   `<DataSourceProvider source={firestoreDataSource}>`.

No component or hook changes needed — `useScenes`, `useSceneTakes`,
`useTakeStream`, `useLedger`, and `useSubmitDecision` all read from
`useEchoDataSource()`, never from a concrete implementation.

The only file allowed to import the demo engine directly is
`src/components/demo/DemoControls.tsx` (the explicitly-labeled "DEMO
STREAM" panel) — remove that component (and its usage in
`app/scenes/[sceneId]/page.tsx`) once the real stream is live.

## Key reusable components

| Component | Path | Purpose |
|---|---|---|
| `ConnectionStatus` | `components/status/ConnectionStatus.tsx` | Live link health, props-driven |
| `TakeCard` | `components/takes/TakeCard.tsx` | Renders one `TakeRecord` through its pipeline |
| `AgentStateTimeline` | `components/takes/AgentStateTimeline.tsx` | The exact Section 7 stage stepper |
| `LiveTakeFeed` | `components/takes/LiveTakeFeed.tsx` | Ordered, animated take stream |
| `ComparisonView` | `components/comparison/ComparisonView.tsx` | DRIFT side-by-side + divergence highlight |
| `ApprovalGate` | `components/approval/ApprovalGate.tsx` | Accept / Flag for reshoot, emits decision |
| `ContinuityLedger` | `components/ledger/ContinuityLedger.tsx` | Scene-by-scene report table |

## Data model

See `src/types/index.ts` — `TakeEvent`, `ReferenceLine`,
`ClassificationResult`, `TakeRecord`, `SceneState`, `LedgerEntry` mirror
the Kafka/Firestore JSON in Section 5 of the playbook field-for-field.

## Notes / known deviations

- IBM Plex fonts are self-hosted via `@fontsource` packages rather than
  `next/font/google`, since the build sandbox had no network access to
  `fonts.googleapis.com`. Visually identical; just resolved via npm.
- "React Bits" isn't an installable npm package — the brief's intent
  (heavy, tasteful, on-brand motion) is implemented with hand-built
  framer-motion components: tally-light pulsing badges, animated
  count-up confidence, the stage-stepper progress line, slide-in
  Comparison panel, and animated divergence highlighting.
