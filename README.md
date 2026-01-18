# TAGO Leap

**Trade ideas, not tokens.**

TAGO Leap is an AI-powered crypto trading platform built for the Hyperstack Hackathon 2025. It combines narrative-driven trading with seamless cross-chain onboarding and automated strategy execution on Hyperliquid.

---

## Features

### [PEAR] Narrative Trading
- AI-powered narrative suggestions (AI tokens, DeFi, Memes, L2s)
- Long/short pair trades with risk scoring
- Basket trades for sector exposure
- Betting-style UX - stake, direction, and risk presets

### [LIFI] One-Click Onboarding
- Bridge from any chain to Hyperliquid
- Real-time USD value display for all tokens
- Route details with ETA and expected amounts
- Progress tracking (Idle → Quoted → In-Progress → Completed)

### [SALT] Robo Managers
- Policy-controlled trading accounts
- Automated strategy execution
- Risk constraints (max leverage, daily limits, allowed pairs)
- Non-custodial - user funds stay in their account

### Performance Analytics
- Historical backtesting before trading
- Long-only, short-only, and pair trade charts
- Max drawdown and return metrics
- CoinGecko integration with caching and rate limiting

---

## Architecture

```
tago-leap/
├── apps/
│   └── frontend/          # Next.js 14 app
├── services/
│   ├── pear-service/      # Trade execution via Pear Protocol
│   ├── lifi-service/      # Cross-chain bridging via LI.FI
│   └── salt-service/      # Policy & strategy management
├── packages/
│   └── shared/            # Shared types and utilities
└── sql/                   # Database migrations
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, TailwindCSS |
| Wallet | wagmi, RainbowKit, viem |
| Data | Supabase (PostgreSQL) |
| Charts | Recharts |
| Services | Fastify (TypeScript) |
| Monorepo | Turborepo, pnpm |

### Integrations

| Service | Purpose |
|---------|---------|
| [Pear Protocol](https://pearprotocol.io) | Pair trade execution on Hyperliquid |
| [LI.FI](https://li.fi) | Cross-chain bridging and swaps |
| [Salt](https://salt.xyz) | Policy-controlled accounts |
| [Hyperliquid](https://hyperliquid.xyz) | Perpetual trading |
| [CoinGecko](https://coingecko.com) | Historical price data |
| [Anthropic Claude](https://anthropic.com) | AI narrative suggestions |

---

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/tago-leap.git
cd tago-leap

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env
# Edit .env with your API keys
```

### Environment Variables

```bash
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# LI.FI
LIFI_API_KEY=
LIFI_INTEGRATOR=tago-leap

# Pear Protocol
PEAR_API_BASE_URL=https://hl-v2.pearprotocol.io

# Anthropic (AI suggestions)
ANTHROPIC_API_KEY=

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
```

### Running Locally

```bash
# Start frontend (port 3000)
pnpm dev

# Or run individual services
pnpm --filter pear-service dev   # port 3001
pnpm --filter lifi-service dev   # port 3002
pnpm --filter salt-service dev   # port 3003
```

### Build

```bash
pnpm build
```

---

## User Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Connect   │────▶│   Onboard   │────▶│    Trade    │────▶│    Robo     │
│   Wallet    │     │  (Bridge)   │     │ (Narratives)│     │ (Automate)  │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                          │                    │                    │
                    ┌─────▼─────┐        ┌─────▼─────┐        ┌─────▼─────┐
                    │  LI.FI    │        │   Pear    │        │   Salt    │
                    │  Service  │        │  Service  │        │  Service  │
                    └───────────┘        └───────────┘        └───────────┘
```

1. **Connect** - User connects wallet (any chain supported)
2. **Onboard** - Bridge assets to Hyperliquid via LI.FI
3. **Trade** - Select AI-suggested narratives and execute pair trades
4. **Robo** - Enable automated strategies with policy controls

---

## API Routes

### Frontend API (Next.js)

| Endpoint | Description |
|----------|-------------|
| `GET /api/pear/narratives` | AI-generated trading narratives |
| `GET /api/pear/narratives/custom/performance` | Historical performance data |
| `POST /api/pear/auth/message` | Get EIP-712 message for signing |
| `POST /api/pear/auth/verify` | Verify signature and authenticate |
| `GET /api/salt/strategies` | List available strategies |
| `POST /api/salt/strategies/toggle` | Enable/disable a strategy |

### Performance API

```
GET /api/pear/narratives/custom/performance?long=ETH&short=BTC&days=180
GET /api/pear/narratives/custom/performance?long=SOL&days=90  # Long-only
GET /api/pear/narratives/custom/performance?short=DOGE&days=30 # Short-only
```

---

## Bounty Alignment

This project targets three Hyperstack bounties:

### [PEAR] Build on Pear Execution API
- Trade narratives, not just tokens
- Pair and basket trade execution
- Betting-style UX (stake, direction, risk)

### [LIFI] One-Click Onboarding to Hyperliquid
- Bridge from any chain via LI.FI routing
- Quote, ETA, steps, and progress tracking
- Reusable deposit component

### [SALT] Programmable Capital & Robo Managers
- Policy-controlled accounts
- Automated strategy execution
- Risk-aware portfolio management

---

## Project Structure

```
apps/frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx           # Main trading dashboard
│   │   ├── onboard/           # Cross-chain bridging
│   │   ├── robo/              # Strategy management
│   │   └── api/               # API routes
│   ├── components/
│   │   ├── PerformanceChart   # Historical backtesting
│   │   ├── DepositModal       # LI.FI bridge UI
│   │   ├── RiskManagementTab  # Policy editor
│   │   └── SidePanels         # AI suggestions
│   ├── hooks/
│   │   └── usePearAuth        # Pear Protocol auth
│   └── lib/
│       ├── api.ts             # API client
│       └── api-server/        # Server-side clients

services/
├── pear-service/              # Trade execution
├── lifi-service/              # Cross-chain bridging
└── salt-service/              # Policy & automation
```

---

## Scripts

```bash
# Development
pnpm dev              # Start frontend with strategy loop
pnpm dev:next         # Start frontend only

# Strategies
pnpm strategies       # Run strategies once
pnpm strategies:loop  # Run strategies in loop (60s interval)
pnpm strategies:fast  # Run strategies in loop (30s interval)

# Build & Lint
pnpm build            # Build all packages
pnpm lint             # Lint all packages
pnpm typecheck        # Type check all packages
pnpm clean            # Clean all build artifacts
```

---

## Team

Built for Hyperstack Hackathon 2025

---

## Links

- [Pear Protocol](https://pearprotocol.io)
- [LI.FI](https://li.fi)
- [Salt](https://salt.xyz)
- [Hyperliquid](https://hyperliquid.xyz)
