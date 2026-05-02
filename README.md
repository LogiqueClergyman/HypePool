<div align="center">

# HypePool

**Turn audience attention into tradeable outcomes—on Stellar.**

Prediction markets for creator and social content. On-chain pools, oracle settlement, and a full-stack reference implementation built for production-grade demos and deployments.

<br/>

</div>

---

## Positioning

Creator economies move fast; **attention is measurable**, but **conviction is fragmented across comment sections and group chats**. HypePool packages that conviction into **markets with transparent rules**: stake on whether content hits defined thresholds within fixed windows, settle against verifiable signals, and distribute payouts according to contract-enforced economics—not platform discretion.

It is designed as a **product-shaped stack**, not a toy contract: indexed content, operational APIs, wallet flows, and Soroban programs that separate **market creation**, **liquidity**, **resolution**, and **claims**.

---

## What You Ship

| Capability | What it means for users and operators |
|------------|--------------------------------------|
| **Markets tied to real content** | Track items such as YouTube videos; configure view thresholds, time windows, and tiers that match how teams actually run campaigns. |
| **Soroban-native economics** | Per-market contracts created from a factory; YES/NO pools, oracle-only resolution, fee logic, and claims executed on-chain. |
| **Off-chain intelligence, on-chain truth** | Metrics flow through your ingestion stack (e.g. YouTube Data API); resolution follows your oracle model while outcomes remain auditable on Stellar. |
| **Operator-ready runtime** | PostgreSQL + Prisma for state and sync, Express API with jobs and rate limits, Next.js client with Stellar wallet integration—ready to deploy behind your domain and policies. |

---

## Why Stellar

- **Final settlement on a public ledger** — Rules and payouts are verifiable; participants do not rely on a black-box database for fund movements.
- **Soroban for programmable markets** — Factory pattern for deploying isolated market contracts; suitable for scaling many concurrent markets without one monolithic program.
- **Low-friction Web3 UX path** — Familiar wallet flows (e.g. Freighter) alongside optional custodial helpers for onboarding experiments.

---

## Architecture

```text
┌─────────────┐     ┌──────────────────┐     ┌─────────────────────────┐
│  Web (Next) │────▶│  API (Express)   │────▶│  PostgreSQL (Prisma)    │
│  + Wallet   │     │  Jobs · Oracle   │     │  Content · Markets ·    │
└─────────────┘     │  bridge          │     │  Bets · Sync metadata   │
       │            └────────┬─────────┘     └─────────────────────────┘
       │                     │
       └─────────────────────┼──────────────────────────────────────────▶
                             ▼
                  ┌──────────────────────┐
                  │  Stellar · Soroban   │
                  │  Factory → Markets   │
                  │  Pools · Resolve ·   │
                  │  Claim               │
                  └──────────────────────┘
```

| Layer | Responsibility |
|-------|------------------|
| **Soroban** | Market factory, per-market instances, pool accounting, authorized resolution, claims, fees. |
| **API** | Content ingestion, market lifecycle, signed-transaction submission, custodial utilities where enabled, scheduled reconciliation. |
| **Data** | System of record for content metadata, market parameters, bet records, and chain alignment. |
| **Web** | Discovery, wallet interactions, and operator-facing flows; consumes the public API. |

---

## Getting Started

### Requirements

- Node.js (LTS)
- PostgreSQL
- Rust toolchain and **Stellar CLI** for contract build/deploy (`stellar/`)
- Funded Stellar account on target network (testnet or mainnet)
- YouTube Data API credentials when using YouTube-backed ingestion

### Install

```bash
git clone <repository-url> hypepool && cd hypepool
npm install && (cd frontend && npm install && cd ..)
cp .env.example .env   # configure before running
npm run db:migrate
```

### Run

| Surface | Command | Notes |
|---------|---------|--------|
| API | `npm run dev` | From repo root; default port per `.env`. |
| Web | `cd frontend && npm run dev` | Set `NEXT_PUBLIC_API_URL` to your API base (`…/api`). |

Production: `npm run build && npm run start` for the API; `frontend`: `npm run build && npm start`. Use managed Postgres, restrict `CORS_ORIGIN`, and run with `NODE_ENV=production`.

---

## Repository Layout

```text
├── frontend/       # Next.js application
├── prisma/         # Schema and migrations
├── src/            # API, Stellar service, routes, jobs
└── stellar/        # Soroban contracts, WASM builds, deploy scripts
```

Build output: `stellar/target/wasm32v1-none/release/*.wasm`. Deployment scripts include `stellar/deploy.sh` (testnet), `stellar/deploy_mainnet.sh`, and `stellar/deploy_factory_only.sh` for incremental mainnet rollout.

---

## Configuration (High Level)

| Concern | Guidance |
|---------|-----------|
| Network | `STELLAR_*` variables must match the network where contracts are deployed. |
| Contracts | `FACTORY_CONTRACT_ADDRESS` and `TOKEN_CONTRACT_ADDRESS` come from deploy output (`stellar/.env.deploy` or mainnet equivalent). |
| Market cadence | `APP_MODE`, `MARKET_WINDOW_UNIT`, and related env vars switch between rapid test windows and hour-based production-style ladders—see `.env.example`. |
| Secrets | Oracle keys, encryption material, and DB URLs stay out of git; rotate if exposed. |

---

## Security & Operations

- Treat **oracle keys** as production-critical; they authorize resolution on-chain.
- Enforce **rate limits** and tight **CORS** before public exposure.
- Run **migrations** in CI/CD or a controlled release path; back up Postgres before schema changes.
- For deploy timeouts or ambiguous submissions, verify transaction status on [Stellar Expert](https://stellar.expert) before retrying state-changing operations.

---

## License

Backend package metadata references **ISC**; add an explicit `LICENSE` file in the repository root if your organization requires a standard OSS text for distribution or contribution.

---

<div align="center">

**HypePool** · Prediction infrastructure on **Stellar** · Soroban · Next.js · TypeScript

</div>
