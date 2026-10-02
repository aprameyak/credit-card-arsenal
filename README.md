# Arsenal

**Build your credit-card arsenal** — wallet-first strategy, not single-card leaderboards.

Deterministic engines calculate rewards, gaps, pathways, and fees. The UI explains those numbers; it does not invent them.

## Run

```bash
npm install
npm run dev
npm test
npm run build
```

Open [http://localhost:3000](http://localhost:3000) (or the port Next assigns). Use **Explore demo arsenal** for a seeded wallet.

## Engines

| Module | Responsibility |
|--------|----------------|
| `engines/spending` | Category routing, caps, coverage, purchase router |
| `engines/arsenal` | Roles, insights, incremental value, target wallets |
| `engines/pathway` | Sequenced paths + eligibility heuristics |
| `engines/optimizer` | Unified optimization run (Y1 vs ongoing, complexity) |
| `engines/welcome` | Bonus progress + natural-spend fit |
| `engines/fees` / `renewal` | Fee justification & renewal reviews |
| `engines/simulator` | What-if add/remove/spend/valuation |
| `engines/complexity` | Wallet complexity score |
| `engines/ecosystems` | Reward programs & transfer partners |
| `engines/explain` | Structured “why this card” blocks |
| `money` | Cent-based helpers for financial math |

## Product surfaces

| Route | Purpose |
|-------|---------|
| `/onboarding` | Credit-card profile (no PAN/CVV/SSN) |
| `/arsenal` | Wallet dashboard |
| `/coverage` | Category coverage map |
| `/guide` | Optimal spend allocation |
| `/calendar` | Monthly / quarterly guide |
| `/router` | What card should I use? (mobile-first) |
| `/buy` | Payment optimization vs spending context |
| `/optimize` | Routing lift + target wallets |
| `/simulate` | What-if simulator |
| `/compare` | Incremental wallet comparison |
| `/pathway` | Alternative pathway tree |
| `/discover` | Personalized discovery |
| `/welcome` | Welcome-bonus tracker / planner |
| `/benefits` | Credits & benefits |
| `/fees` / `/renewal` | Fee & renewal analysis |
| `/timeline` | Application history |
| `/settings` | Guardrails, export/delete, preferences |
| `/admin` | Card data freshness |

## Privacy & guardrails

- Manual-first MVP — no bank linking required.
- Never collects card numbers, CVV, SSN, or bank passwords.
- If revolving balances are indicated, UI warns that interest can outweigh rewards.
- Welcome planner projects **normal** spend; does not encourage manufactured spend.
- Fee/renewal UI suggests options to **investigate**, never auto-close advice.
- Local export / delete via Settings. Guest/demo mode persists in browser storage.

## Tests

Financial calculation fixtures live under `src/lib/engines/__tests__` and `src/lib/money.test.ts`.

## Stack

Next.js · React · TypeScript · Tailwind · Zustand · Vitest · Prisma schema prepared for future Postgres.

## Disclaimer

Not financial advice. Verify issuer terms. Point valuations are assumptions, not guaranteed cash value. Community-reported application heuristics are labeled separately from published issuer rules.
