# HypePool — Stellar Garage Submission Guide
> Deadline: **May 2nd, 2025**

---

## Checklist

- [ ] Project is mainnet-ready
- [ ] Business logic is clear and documented (see below)
- [ ] Working demo is prepared
- [ ] 5-slide PPT is complete
- [ ] Demo video is recorded and embedded in PPT
- [ ] Project is deployed with a domain
- [ ] User onboarding has begun

---

## 1. Project Name

**HypePool**
*The world's first viral prediction market — bet on content before it blows up.*

Tagline: *Spot a banger before it explodes. Stake XLM. Earn big.*

---

## 2. Team Introduction

> Fill in your team members below.

| Name | Role |
|------|------|
| — | Founder / Full-Stack |
| — | Smart Contracts / Stellar |
| — | Design / Product |

---

## 3. Problem We Are Solving

**The internet rewards lucky observers, not informed predictors.**

- Millions of people spot viral content early — a video at 10K views that hits 5M — but have no way to profit from that insight.
- Existing prediction markets focus on finance, politics, and sports. No one has built a market around *content performance*.
- Creators, marketers, and trend-spotters have genuine alpha on what goes viral — and nowhere to put it to work.

**Pain points:**
1. No financial upside for people who correctly spot viral trends early.
2. No low-stakes, low-fee prediction infrastructure for everyday internet content.
3. Existing blockchain prediction markets are too complex and too expensive for casual users.

---

## 4. Our Solution

**HypePool** is a decentralized prediction market where users bet on whether a YouTube video will hit a specific view milestone within a set time window — all powered by Stellar Soroban smart contracts.

### How It Works

```
User submits YouTube URL
        ↓
Platform fetches live stats + generates available milestones (e.g. 1M, 2.5M, 5M views)
        ↓
User creates a market: "Will this video hit 2.5M views in 24 hours?"
        ↓
Other users bet YES or NO with XLM (min ~0.25 XLM)
        ↓
Automated resolver checks YouTube API at deadline
        ↓
Winners receive stake back + proportional share of losing pool
```

### Key Features

| Feature | Description |
|---------|-------------|
| **Content Markets** | Any YouTube video can become a prediction market |
| **Dynamic Tiers** | Milestones auto-generated based on current view count |
| **Dual Wallet Support** | Freighter (self-custody) + custodial wallet for onboarding newcomers |
| **Near-Zero Fees** | Stellar's ~0.00001 XLM transaction fees make micro-bets viable |
| **Automated Resolution** | YouTube API + Soroban smart contracts settle markets trustlessly |
| **Live Feed** | Browse all active markets grouped by content |
| **Portfolio Tracking** | Users see active bets, winnings, and history |

### Why Stellar

- **Fee structure** makes sub-$1 bets economically viable — impossible on Ethereum.
- **Soroban smart contracts** enable trustless on-chain settlement.
- **Finality in seconds** — users know the result immediately when a market resolves.
- **XLM liquidity** is widely accessible globally, lowering the onboarding barrier.

---

## 5. Business Logic & Impact on Stellar

### Revenue Model

| Stream | Mechanism |
|--------|-----------|
| **Protocol fee** | 1–2% of losing pool retained per resolved market |
| **Market creation fee** | Small flat fee in XLM to create a new market (spam prevention + revenue) |
| **Future: sponsored markets** | Brands/creators pay to feature their content as a market |

### Unit Economics (Example)

- Market: "Will this video hit 2M views in 24H?"
- Total pool: 500 XLM (300 YES, 200 NO)
- Outcome: YES wins
- Protocol takes 2% of NO pool = 4 XLM
- YES bettors split remaining 196 XLM proportionally

At scale: 100 markets/day × avg 200 XLM pool × 2% = **400 XLM/day** in protocol fees.

### Impact on Stellar

- **Drives XLM utility** — every bet, market creation, and payout is an on-chain XLM transaction.
- **Brings crypto-native audiences** (gaming, content, streamer communities) onto Stellar.
- **Demonstrates Soroban viability** for consumer-facing, real-time dApps.
- **Showcases near-zero fee advantage** in a use case where fee sensitivity matters most.

### Traction & Growth Path

- **Phase 1 (Now):** Launch with YouTube content markets, onboard early community members.
- **Phase 2:** Add Twitch, Twitter/X, TikTok content support.
- **Phase 3:** Creator partnerships — creators promote their own markets to their audience.
- **Phase 4:** Social feed, leaderboards, market discovery algorithm.

---

## 5-Slide PPT Outline

### Slide 1 — Project Name
- **HypePool** wordmark + logo
- Tagline: *Bet on viral trends before they blow up*
- Built on Stellar Soroban

### Slide 2 — Team
- Photos, names, and roles
- Brief background (1 line each)
- Link to GitHub / project repo

### Slide 3 — Problem
- Hook: "You knew this video was going viral at 50K views. Now what?"
- 3 bullet points (see Section 3 above)
- Visual: chart of a viral video's view trajectory

### Slide 4 — Solution
- App screenshot or demo GIF on left
- How It Works flow on right (5 steps, see Section 4)
- Highlight: Dual wallet, near-zero fees, auto-resolution

### Slide 5 — Business Logic & Stellar Impact
- Revenue model table (simple, 2 rows)
- Stellar integration callouts (fees, Soroban, finality)
- Growth roadmap (Phase 1–4, timeline)
- **Embed demo video here**

---

## Demo Script (2–3 minutes)

1. **Open** the Markets feed — show live markets with real YouTube thumbnails.
2. **Connect** a wallet (show both Freighter and custodial options).
3. **Create a market** — paste a YouTube URL, select a milestone tier and time window, submit.
4. **Place a bet** — pick YES or NO, enter XLM amount, confirm on-chain.
5. **Show portfolio** — active bets, past results, total staked/won.
6. **Explain resolution** — briefly explain how the YouTube API + Soroban contract auto-settles.

> Keep it fast and visual. Let the UI do the talking.

---

## Deployment Checklist

- [ ] Backend deployed (Railway / Render / Fly.io)
- [ ] Frontend deployed on Vercel (`vercel.json` already in repo)
- [ ] Custom domain pointed to Vercel deployment
- [ ] Environment variables set in production (API keys, DB URL, Stellar network)
- [ ] Switched from `TESTNET` → `MAINNET` in Stellar config
- [ ] Smart contract deployed to Soroban mainnet
- [ ] YouTube API quota checked for production load
- [ ] Rate limiting tuned for real traffic

---

## User Onboarding

### Target Early Users
- YouTube/content creator communities (Reddit: r/NewTubers, r/videos)
- Crypto-curious audiences on Twitter/X — tweet "bet I can predict this video goes viral"
- Stellar / Soroban developer community
- Friends + founders in Stellar Garage cohort

### Onboarding Flow
1. User lands on homepage → sees live feed of active markets
2. Connects wallet **or** uses custodial wallet (zero setup friction)
3. Places first bet with as little as 0.25 XLM (~$0.05)
4. Wins or loses → shares result on social

### Talking Point
> "It's like a fantasy sports draft, but for YouTube videos. And it costs less than a coffee."

---

## Links

| Resource | URL |
|----------|-----|
| Live App | *(add your domain)* |
| GitHub | *(add repo link)* |
| Demo Video | *(add video link)* |
| Deck | *(add Google Slides / Canva link)* |
