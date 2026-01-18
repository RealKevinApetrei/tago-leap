# TAGO Leap

**Trade ideas, not tokens.**

TAGO Leap is a narrative-first trading terminal for [Hyperliquid](https://hyperliquid.xyz). Instead of picking individual tokens, users bet on themes and narratives - AI dominance, ETH killers, meme seasons - and the platform handles position construction, hedging, and risk management automatically.

Built for **HLH 2025** (Hyperliquid Hackathon).

---

## What It Does

1. **Describe your thesis** - "AI tokens will outperform ETH over the next month"
2. **AI suggests a trade** - Claude generates a hedged pair: long TAO/RENDER, short ETH
3. **One-click execution** - Pear Protocol executes both legs atomically on Hyperliquid
4. **Automated management** - Salt-powered robo managers enforce risk limits and run exit strategies

---

## Bounty Tracks

### [PEAR] Narrative Trading via Pear Execution API

| Feature | Status |
|---------|--------|
| AI-powered trade generation from user thesis | ✅ |
| Long/short pair execution via Pear OpenPosition API | ✅ |
| Basket trades (multiple assets per side) | ✅ |
| EIP-712 auth + JWT token management | ✅ |
| Position management (fetch, close) | ✅ |
| Historical backtesting before execution | ✅ |

**Key implementation:** Claude Sonnet generates `NarrativeSuggestion` objects with validated assets, then Pear's API executes atomic pair trades on Hyperliquid L1.

### [LIFI] One-Click Onboarding
- Bridge from any chain to Hyperliquid
- Real-time USD value display for all tokens
- Route details with ETA and expected amounts
- Progress tracking (Idle → Quoted → In-Progress → Completed)

### [SALT] Robo Managers
- Policy-controlled trading accounts
- Automated strategy execution
- Risk constraints (max leverage, daily limits, allowed pairs...)
- Non-custodial - user funds stay in their account

### Performance Analytics
- Historical backtesting before trading
- Long-only, short-only, and pair trade charts
- Max drawdown and return metrics
- CoinGecko integration with caching and rate limiting

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        TAGO Leap Frontend                       │
│                    (Next.js 14 + TailwindCSS)                   │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  Pear Service │    │  LIFI Service │    │  Salt Service │
│   (Fastify)   │    │   (Fastify)   │    │   (Fastify)   │
└───────┬───────┘    └───────┬───────┘    └───────┬───────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ Pear Protocol │    │    LI.FI      │    │   Supabase    │
│  (Hyperliquid)│    │  (Bridging)   │    │  (Policies)   │
└───────────────┘    └───────────────┘    └───────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, TailwindCSS, Framer Motion |
| Wallet | wagmi, RainbowKit, viem |
| Database | Supabase (PostgreSQL) |
| Charts | Recharts |
| Services | Fastify (TypeScript) |
| AI | Anthropic Claude Sonnet |
| Monorepo | Turborepo, pnpm |

---

## Quick Start

```bash
# Clone
git clone https://github.com/RealKevinApetrei/tago-leap.git
cd tago-leap

# Install
pnpm install

# Configure
cp .env.example .env
# Edit .env with your API keys
```

### Environment Variables

Create a `.env` file in the root directory:

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Service Ports
PEAR_SERVICE_PORT=3001
LIFI_SERVICE_PORT=3002
SALT_SERVICE_PORT=3003

# Pear Protocol
PEAR_API_BASE_URL=https://hl-v2.pearprotocol.io

# LI.FI
LIFI_API_BASE_URL=https://li.quest/v1
LIFI_INTEGRATOR=tago-leap
LIFI_API_KEY=your-lifi-api-key

# Anthropic (AI suggestions)
ANTHROPIC_API_KEY=your-anthropic-api-key

# Hyperliquid
HYPERLIQUID_API_BASE_URL=https://api.hyperliquid.xyz
HYPEREVM_CHAIN_ID=999

# Salt Service
PEAR_SERVICE_URL=http://localhost:3001

# Frontend (public)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_PEAR_SERVICE_URL=http://localhost:3001
NEXT_PUBLIC_LIFI_SERVICE_URL=http://localhost:3002
NEXT_PUBLIC_SALT_SERVICE_URL=http://localhost:3003
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-walletconnect-project-id
```

### Running Locally

```bash
# Start frontend (port 3000)
pnpm dev
```

**Requirements:** Node.js >= 20, pnpm >= 9

---

## Demo Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Connect   │────▶│   Onboard   │────▶│    Trade    │────▶│    Robo     │
│   Wallet    │     │  (Bridge)   │     │ (Narratives)│     │ (Automate)  │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │                   │
       │              LI.FI API           Pear API            Salt Policies
       │           (any chain → HL)    (pair execution)     (risk limits)
       │                   │                   │                   │
       └───────────────────┴───────────────────┴───────────────────┘
                                    │
                              Hyperliquid L1
                           (perpetual trading)
```

1. **Connect** - RainbowKit wallet connection (any EVM chain)
2. **Onboard** - LI.FI bridges assets to Hyperliquid in one click
3. **Trade** - Describe a narrative, AI suggests a pair trade, execute via Pear
4. **Robo** - Enable automated strategies with policy guardrails

---

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/pear/narratives/suggest` | AI generates pair trade from thesis |
| `POST /api/pear/bets/execute` | Execute pair trade via Pear |
| `GET /api/pear/narratives/custom/performance` | Historical backtest data |
| `GET /api/lifi/onboard/options` | Get bridge route options |
| `POST /api/salt/accounts/[id]/pair-trade` | Execute with policy enforcement |
| `GET /api/salt/strategies` | List automated strategies |

---

## What's Implemented

| Component | Files | Description |
|-----------|-------|-------------|
| **Pear Auth** | `usePearAuth.ts`, `pearClient.ts` | EIP-712 signing, JWT tokens, agent wallet setup |
| **Trade Execution** | `betBuilder.ts`, `execute/route.ts` | Order construction, dry-run validation, atomic execution |
| **AI Narratives** | `claudeClient.ts`, `narrativeService.ts` | Claude Sonnet generates validated trade suggestions |
| **Backtesting** | `coingeckoClient.ts`, `hyperliquidClient.ts` | 180-day historical data, pair performance, max drawdown |
| **Bridging** | `lifiClient.ts`, `onboard/` routes | Multi-chain quotes, route optimization, progress tracking |
| **Policy Engine** | `policyEnforcer.ts` | Leverage, daily notional, allowed pairs validation |
| **Strategies** | `takeProfit.ts`, `trailingStop.ts`, `vwapExit.ts`, `adxMomentum.ts` | Automated exit strategies with 60s loop |

---

## Team

Built for Hyperstack Hackathon 2025


---

## Links

- [Pear Protocol](https://pearprotocol.io) - Pair trade execution
- [LI.FI](https://li.fi) - Cross-chain bridging
- [Salt](https://salt.xyz) - Policy-controlled accounts
- [Hyperliquid](https://hyperliquid.xyz) - Perpetual DEX
- [Anthropic](https://anthropic.com) - Claude AI
