# Demo smoke vector

Expected deterministic results from `src/lib/demoEngine.ts`:

- Take 1 → MATCH / 0.98
- Take 2 → ACCEPTABLE_ADLIB / 0.87
- Take 3 → DRIFT / 0.91 / diverging phrase `really`
- Take 4 → DRIFT / 0.68 → terminal stage `NEEDS_REVIEW`
- Human decision on a flagged take → decision is persisted into the continuity ledger
