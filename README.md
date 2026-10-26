This project now lives in [routely/optimizer](https://github.com/aprameyak/routely/tree/main/optimizer).

# Credit Card Arsenal

A browser-only tool for people who carry several credit cards. You enter the cards you own and your monthly or annual spending, and it shows which card to use per category, where your wallet has gaps, and what adding or dropping a card would change. Everything runs on the client and is stored in your browser.

## Features

- Spending guide and purchase router: best card in your wallet for each spend category or a single purchase, with caps and restrictions noted where they are modeled.
- Wallet simulator: toggle owned and catalog cards to compare net value, annual fees, points ecosystems, and complexity before applying.
- Pathways: suggested next cards based on gaps in your coverage, with eligibility checks such as Chase 5/24.
- Fee and renewal review, benefit and credit tracking, welcome offer progress, and a card timeline.
- Editable point valuations and a browser-local card editor at `/admin`.
- Export your profile as JSON, load a demo wallet, or delete all local data from Settings.

The card catalog is a hand-entered list of 16 US cards in `src/lib/cards/database.ts` (Chase, Amex, Citi, Capital One, Discover, Wells Fargo, Bilt, U.S. Bank). Terms were last verified on the date set in that file and will drift; check issuer sites before applying. This is not financial advice, and the app never asks for card numbers, CVVs, or SSNs.

## Tech stack

- Next.js 16, React 19, TypeScript
- Tailwind CSS 4, Framer Motion
- Zustand with `persist` middleware (localStorage)
- Vitest, ESLint

## Getting started

Requires Node 20 or newer. No environment variables are needed.

```bash
npm install
npm run dev
```

Open http://localhost:3000. Use "Explore demo arsenal" to load a seeded wallet.

Other scripts:

```bash
npm test           # vitest run
npm run lint
npm run typecheck  # tsc --noEmit
npm run build
```

## How it works

- `src/lib/store.ts` holds the user profile (owned cards, application history, spending, valuations) and an editable copy of the card catalog in a Zustand store persisted to localStorage under `arsenal-store-v1`.
- `src/lib/engines/` contains deterministic functions that compute the figures shown in the UI: `spending.ts` (per-category rewards and routing), `optimizer.ts`, `simulator.ts`, `pathway.ts`, `renewal.ts`, `fees.ts`, `valuation.ts`, `welcome.ts`, and others. Tests for the optimizer, spending, simulator, and fee logic are in `src/lib/engines/__tests__/`.
- `src/app/` has one route per view (`/arsenal`, `/coverage`, `/guide`, `/router`, `/simulate`, `/pathway`, `/settings`, and so on). `src/components/AppShell.tsx` defines the navigation.
- `src/lib/analytics.ts` records usage events to a capped log in localStorage only; nothing is sent to a server.
- `/admin` edits the catalog in your browser. It has no authentication because there is no server.

## Contributing

Issues and pull requests are welcome. Before opening a PR, run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`; CI (`.github/workflows/ci.yml`) runs the same steps.

## License

MIT, see [LICENSE](LICENSE).
