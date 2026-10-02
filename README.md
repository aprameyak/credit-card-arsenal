# Arsenal

Wallet-first credit card strategy: coverage, pathways, and spend routing from deterministic engines. The UI shows the numbers; it does not invent them.

## Run

```bash
npm install
npm run dev
npm test
npm run build
```

http://localhost:3000 — use **Explore demo arsenal** for a seeded wallet.

## Engines

| Module | Role |
|--------|------|
| `engines/spending` | Category routing, caps, coverage |
| `engines/arsenal` | Roles, insights, incremental value |
| `engines/pathway` | Sequenced paths, eligibility heuristics |
| `engines/optimizer` | Y1 vs ongoing, complexity |
| `engines/welcome` | Bonus progress, natural-spend fit |
| `engines/fees` / `renewal` | Fee and renewal reviews |
| `engines/simulator` | What-if add/remove/spend |
| `engines/complexity` | Wallet complexity score |
| `engines/ecosystems` | Programs and transfer partners |
| `engines/explain` | Structured “why this card” |
| `money` | Cent-based math helpers |

## Routes

`/onboarding` `/arsenal` `/coverage` `/guide` `/calendar` `/router` `/buy` `/spending` `/optimize` `/simulate` `/compare` `/pathway` `/discover` `/welcome` `/benefits` `/fees` `/renewal` `/timeline` `/settings` `/admin`

## Notes

- No bank linking; no PAN/CVV/SSN collection
- Revolving-balance path warns that interest can erase rewards
- Welcome planner uses normal spend only
- Settings supports local export/delete; demo mode uses browser storage
- Tests under `src/lib/engines/__tests__` and `src/lib/money.test.ts`

Not financial advice. Verify issuer terms. Point valuations are assumptions.

## License

MIT
