# TAGO Leap Architecture

## Overview

TAGO Leap is a narrative-driven trading platform that combines AI-powered trade suggestions with automated risk management. Users describe market theses in plain English, receive AI-generated pair/basket trade suggestions, and execute trades on Hyperliquid via Pear Protocol—all governed by Salt's policy-controlled accounts.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TAGO Leap Frontend                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  AI Trade   │  │  Portfolio  │  │  Settings   │  │   History   │        │
│  │   Builder   │  │    View     │  │   & Robo    │  │             │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
└─────────┼────────────────┼────────────────┼────────────────┼────────────────┘
          │                │                │                │
          ▼                ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Service Layer                                   │
│                                                                              │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐      │
│  │   Pear Service   │◄───│   Salt Service   │    │   LI.FI Service  │      │
│  │                  │    │  (Risk Manager)  │    │   (Onboarding)   │      │
│  │  • AI Narratives │    │                  │    │                  │      │
│  │  • Trade Execute │    │  • Policy Check  │    │  • Bridge/Swap   │      │
│  │  • Positions     │    │  • Strategy Loop │    │  • Deposit       │      │
│  └────────┬─────────┘    └────────┬─────────┘    └──────────────────┘      │
│           │                       │                                         │
└───────────┼───────────────────────┼─────────────────────────────────────────┘
            │                       │
            ▼                       ▼
┌───────────────────────┐  ┌───────────────────────┐
│   Pear Protocol API   │  │      Supabase DB      │
│   (Hyperliquid L1)    │  │                       │
│                       │  │  • Users              │
│  • Open Position      │  │  • Auth Tokens        │
│  • Close Position     │  │  • Salt Accounts      │
│  • Get Positions      │  │  • Policies           │
│                       │  │  • Strategies         │
└───────────────────────┘  │  • Strategy Runs      │
                           │  • Trades             │
                           └───────────────────────┘
```

---

## Core Components

### 1. Frontend (Next.js)

The user interface with 4 main tabs:

| Tab | Purpose |
|-----|---------|
| **AI Trade** | Enter thesis → Get AI suggestion → Execute pair/basket trade |
| **Portfolio** | View open positions, P&L, close positions |
| **Settings** | Configure risk policy, toggle strategies, view robo actions |
| **History** | View past trades and their status |

### 2. Pear Service

Handles all trading operations via Pear Protocol:

- **AI Narrative Generation** - Claude AI suggests trades based on user thesis
- **Trade Execution** - Opens positions on Hyperliquid via Pear API
- **Position Management** - Fetches open positions, closes positions
- **Authentication** - EIP-712 wallet signing for Pear Protocol

### 3. Salt Service (Risk Manager)

Policy-controlled account management:

- **Account Management** - Creates Salt accounts linked to user wallets
- **Policy Enforcement** - Validates trades against user-defined limits
- **Strategy Execution** - Runs automated trading strategies
- **Audit Trail** - Logs all strategy runs and decisions

### 4. LI.FI Service

Cross-chain onboarding:

- **Bridge + Swap** - Routes assets from any chain to HyperEVM
- **Deposit Flow** - Deposits into Hyperliquid trading account

---

## Transaction Flow

### Manual Trade Execution

```
User                    Frontend                Pear Service              Salt Service           Pear Protocol
  │                        │                        │                         │                      │
  │  1. Enter thesis       │                        │                         │                      │
  │ ──────────────────────►│                        │                         │                      │
  │                        │  2. POST /narratives/suggest                     │                      │
  │                        │ ──────────────────────►│                         │                      │
  │                        │                        │                         │                      │
  │                        │  3. AI generates trade suggestion                │                      │
  │                        │ ◄──────────────────────│                         │                      │
  │                        │                        │                         │                      │
  │  4. Adjust & Execute   │                        │                         │                      │
  │ ──────────────────────►│                        │                         │                      │
  │                        │                        │                         │                      │
  │                        │  5. POST /bets/execute │                         │                      │
  │                        │ ──────────────────────►│                         │                      │
  │                        │                        │                         │                      │
  │                        │                        │  6. Verify auth token   │                      │
  │                        │                        │ ────────────────────────►                      │
  │                        │                        │                         │                      │
  │                        │                        │  7. Open position       │                      │
  │                        │                        │ ────────────────────────────────────────────────►
  │                        │                        │                         │                      │
  │                        │                        │  8. Position opened     │                      │
  │                        │                        │ ◄────────────────────────────────────────────────
  │                        │                        │                         │                      │
  │                        │  9. Trade result       │                         │                      │
  │                        │ ◄──────────────────────│                         │                      │
  │                        │                        │                         │                      │
  │  10. Success!          │                        │                         │                      │
  │ ◄──────────────────────│                        │                         │                      │
```

### Policy-Controlled Trade (via Salt)

```
User                    Frontend                Salt Service              Pear Service           Pear Protocol
  │                        │                        │                         │                      │
  │  1. Execute trade      │                        │                         │                      │
  │ ──────────────────────►│                        │                         │                      │
  │                        │                        │                         │                      │
  │                        │  2. POST /accounts/:id/trade                     │                      │
  │                        │ ──────────────────────►│                         │                      │
  │                        │                        │                         │                      │
  │                        │                        │  3. Load policy         │                      │
  │                        │                        │  ┌─────────────────┐    │                      │
  │                        │                        │  │ max_leverage: 5 │    │                      │
  │                        │                        │  │ max_daily: $10k │    │                      │
  │                        │                        │  │ max_drawdown: 10%│   │                      │
  │                        │                        │  └─────────────────┘    │                      │
  │                        │                        │                         │                      │
  │                        │                        │  4. Validate trade      │                      │
  │                        │                        │ ────────────────────────►                      │
  │                        │                        │                         │                      │
  │                        │                        │  5. Compute notional    │                      │
  │                        │                        │ ◄────────────────────────                      │
  │                        │                        │                         │                      │
  │                        │                        │  6. Check policy:       │                      │
  │                        │                        │     leverage ≤ 5? ✓     │                      │
  │                        │                        │     daily ≤ $10k? ✓     │                      │
  │                        │                        │                         │                      │
  │                        │                        │  7. Execute trade       │                      │
  │                        │                        │ ────────────────────────►                      │
  │                        │                        │                         │                      │
  │                        │                        │                         │  8. Open position    │
  │                        │                        │                         │ ────────────────────►│
  │                        │                        │                         │                      │
  │                        │                        │                         │  9. Result           │
  │                        │                        │                         │ ◄────────────────────│
  │                        │                        │                         │                      │
  │                        │  10. Trade result      │                         │                      │
  │                        │ ◄──────────────────────│                         │                      │
  │                        │                        │                         │                      │
  │  11. Success!          │                        │                         │                      │
  │ ◄──────────────────────│                        │                         │                      │
```

### Automated Strategy Execution (Robo Manager)

```
                        Salt Service                Pear Service           Pear Protocol
                            │                           │                      │
  ┌─────────────────────────┴─────────────────────────┐ │                      │
  │           STRATEGY LOOP (runs every 60s)          │ │                      │
  └─────────────────────────┬─────────────────────────┘ │                      │
                            │                           │                      │
                            │  1. Load active strategies│                      │
                            │  ┌──────────────────────┐ │                      │
                            │  │ momentum_strategy    │ │                      │
                            │  │ sentiment_strategy   │ │                      │
                            │  └──────────────────────┘ │                      │
                            │                           │                      │
                            │  2. For each strategy:    │                      │
                            │     - Fetch market data   │                      │
                            │     - Apply strategy logic│                      │
                            │     - Generate signal     │                      │
                            │                           │                      │
                            │  3. If signal triggered:  │                      │
                            │     Load account policy   │                      │
                            │  ┌──────────────────────┐ │                      │
                            │  │ Check policy limits  │ │                      │
                            │  └──────────────────────┘ │                      │
                            │                           │                      │
                            │  4. If policy allows:     │                      │
                            │ ─────────────────────────►│                      │
                            │  POST /bets/execute-narrative                    │
                            │  (source: 'salt')         │                      │
                            │                           │                      │
                            │                           │  5. Open position    │
                            │                           │ ────────────────────►│
                            │                           │                      │
                            │                           │  6. Result           │
                            │                           │ ◄────────────────────│
                            │                           │                      │
                            │  7. Log strategy_run      │                      │
                            │  ┌──────────────────────┐ │                      │
                            │  │ status: completed    │ │                      │
                            │  │ result: {trade_id}   │ │                      │
                            │  └──────────────────────┘ │                      │
                            │                           │                      │
```

---

## Policy Enforcement

Salt Service enforces the following risk controls before any trade:

```typescript
interface SaltPolicy {
  max_leverage: number;        // e.g., 5 (max 5x leverage)
  max_daily_notional_usd: number; // e.g., 10000 (max $10k/day)
  allowed_pairs: string[];     // e.g., ['BTC-USD', 'ETH-USD', 'SOL-USD']
  max_drawdown_pct: number;    // e.g., 10 (stop at 10% loss)
}
```

### Policy Check Flow

```
                    ┌─────────────────────────────────────┐
                    │         INCOMING TRADE              │
                    │  narrative: 'sol-ecosystem'         │
                    │  stakeUsd: $500                     │
                    │  leverage: 3x                       │
                    └──────────────────┬──────────────────┘
                                       │
                                       ▼
                    ┌─────────────────────────────────────┐
                    │     1. LEVERAGE CHECK               │
                    │     leverage (3) ≤ max (5)?         │
                    │     ✓ PASS                          │
                    └──────────────────┬──────────────────┘
                                       │
                                       ▼
                    ┌─────────────────────────────────────┐
                    │     2. DAILY NOTIONAL CHECK         │
                    │     today_total + (500 × 3)         │
                    │     = $2000 + $1500 = $3500         │
                    │     $3500 ≤ $10000?                 │
                    │     ✓ PASS                          │
                    └──────────────────┬──────────────────┘
                                       │
                                       ▼
                    ┌─────────────────────────────────────┐
                    │     3. ALLOWED PAIRS CHECK          │
                    │     SOL, ETH in allowed_pairs?      │
                    │     ✓ PASS                          │
                    └──────────────────┬──────────────────┘
                                       │
                                       ▼
                    ┌─────────────────────────────────────┐
                    │     ✅ TRADE APPROVED               │
                    │     Forward to Pear Service         │
                    └─────────────────────────────────────┘
```

### Policy Violation Example

```
                    ┌─────────────────────────────────────┐
                    │         INCOMING TRADE              │
                    │  stakeUsd: $5000                    │
                    │  leverage: 8x                       │
                    └──────────────────┬──────────────────┘
                                       │
                                       ▼
                    ┌─────────────────────────────────────┐
                    │     1. LEVERAGE CHECK               │
                    │     leverage (8) ≤ max (5)?         │
                    │     ✗ FAIL                          │
                    └──────────────────┬──────────────────┘
                                       │
                                       ▼
                    ┌─────────────────────────────────────┐
                    │     ❌ TRADE REJECTED               │
                    │     Error: "Leverage exceeds        │
                    │     policy limit of 5x"             │
                    └─────────────────────────────────────┘
```

---

## Data Models

### Database Schema

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     users       │       │  salt_accounts  │       │  salt_policies  │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id              │◄──────│ user_id         │       │ id              │
│ wallet_address  │       │ id              │◄──────│ salt_account_id │
│ created_at      │       │ salt_account_   │       │ max_leverage    │
│                 │       │   address       │       │ max_daily_      │
└─────────────────┘       │ created_at      │       │   notional_usd  │
                          └────────┬────────┘       │ allowed_pairs   │
                                   │                │ max_drawdown_pct│
                                   │                └─────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
              ▼                    ▼                    ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ salt_strategies │    │  strategy_runs  │    │     trades      │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ id              │◄───│ strategy_id     │    │ id              │
│ salt_account_id │    │ id              │    │ user_id         │
│ strategy_id     │    │ status          │    │ narrative_id    │
│ params          │    │ result          │    │ direction       │
│ active          │    │ error           │    │ stake_usd       │
└─────────────────┘    │ created_at      │    │ status          │
                       │ completed_at    │    │ source          │
                       └─────────────────┘    │ account_ref     │
                                              │ pear_order_     │
                                              │   payload       │
                                              │ pear_response   │
                                              └─────────────────┘
```

---

## Authentication Flow

```
User                    Frontend                Pear Service              Pear Protocol
  │                        │                        │                         │
  │  1. Connect Wallet     │                        │                         │
  │ ──────────────────────►│                        │                         │
  │                        │                        │                         │
  │                        │  2. GET /auth/message?wallet=0x...               │
  │                        │ ──────────────────────►│                         │
  │                        │                        │                         │
  │                        │                        │  3. Get EIP-712 message │
  │                        │                        │ ────────────────────────►
  │                        │                        │                         │
  │                        │  4. EIP-712 message    │                         │
  │                        │ ◄──────────────────────│                         │
  │                        │                        │                         │
  │  5. Sign message       │                        │                         │
  │ ◄──────────────────────│                        │                         │
  │ ──────────────────────►│                        │                         │
  │                        │                        │                         │
  │                        │  6. POST /auth/verify  │                         │
  │                        │     {wallet, signature, timestamp}               │
  │                        │ ──────────────────────►│                         │
  │                        │                        │                         │
  │                        │                        │  7. Authenticate        │
  │                        │                        │ ────────────────────────►
  │                        │                        │                         │
  │                        │                        │  8. JWT tokens          │
  │                        │                        │ ◄────────────────────────
  │                        │                        │                         │
  │                        │                        │  9. Store in DB         │
  │                        │                        │                         │
  │                        │  10. Authenticated     │                         │
  │                        │ ◄──────────────────────│                         │
  │                        │                        │                         │
  │  11. Ready to trade!   │                        │                         │
  │ ◄──────────────────────│                        │                         │
```

---

## Key Design Principles

### 1. No Custody
- User funds remain in their Hyperliquid account
- Salt accounts are policy-controlled, not custodial
- Agent wallets enable trade execution without fund transfer

### 2. Narrative-First Trading
- Users express ideas, not pick tokens
- AI translates thesis into actionable pair/basket trades
- Feels like "betting on an idea" rather than trading

### 3. Policy Enforcement at Gateway
- All trades pass through Salt Service policy check
- Violations are blocked before reaching Pear Protocol
- Complete audit trail of all decisions

### 4. Composable Architecture
- Services communicate via REST APIs
- Each service owns its domain (trade, risk, onboard)
- Frontend consumes unified API surface

---

## Trade Types

### Pair Trade
Long one asset, short another:
```
Long: SOL (100%)
Short: ETH (100%)
Leverage: 3x
Stake: $100
Notional: $300
```

### Basket Trade
Long a basket of assets against a benchmark:
```
Long: AAVE (40%), UNI (30%), COMP (30%)
Short: ETH (100%)
Leverage: 2x
Stake: $500
Notional: $1000
```

---

## API Endpoints Summary

### Pear Service (`/api/pear`)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/message` | GET | Get EIP-712 message for signing |
| `/auth/verify` | POST | Submit signature, store JWT |
| `/auth/status` | GET | Check auth status |
| `/auth/agent-wallet` | GET/POST | Manage agent wallet |
| `/narratives/suggest` | POST | AI trade suggestion |
| `/bets/execute` | POST | Execute direct trade |
| `/bets/execute-narrative` | POST | Execute narrative trade |
| `/bets/validate` | POST | Dry-run validation |
| `/positions` | GET | Get open positions |
| `/positions/:id/close` | POST | Close position |
| `/trades` | GET | Get trade history |

### Salt Service (`/api/salt`)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/strategies` | GET | List available strategies |
| `/wallets/:address` | GET | Get/create Salt wallet |
| `/accounts` | POST | Create Salt account |
| `/accounts/:id` | GET | Get account with policy |
| `/accounts/:id/policies` | POST | Set policy |
| `/accounts/:id/strategies` | POST | Add/update strategy |
| `/accounts/:id/trade` | POST | Execute policy-checked trade |
| `/accounts/:id/trades` | GET | Get account trades |
| `/accounts/:id/strategy-runs` | GET | Get recent robo actions |

### LI.FI Service (`/api/lifi`)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/onboard/options` | GET | Get supported chains/tokens |
| `/onboard/quote` | POST | Get bridge+swap quote |
| `/onboard/track` | POST | Track transaction status |
| `/onboard/deposit` | POST | Execute deposit |

---

## Security Considerations

1. **JWT Token Management** - Access tokens stored server-side, auto-refreshed
2. **Ownership Verification** - Salt account ownership verified before trade execution
3. **Policy Limits** - Hard limits prevent excessive risk exposure
4. **Audit Logging** - All strategy runs and trades logged with full context
5. **No Private Keys** - Service never handles user private keys; uses signed messages
