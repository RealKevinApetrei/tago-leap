# Salt Service

Policy-controlled trading accounts for the TAGO Leap platform. Salt Service enables users to create trading accounts with configurable risk policies and automated strategy execution through Pear Protocol.

## Overview

Salt Service provides:
- **Policy-Enforced Trading** - Define leverage limits, daily notional caps, and allowed trading pairs
- **Automated Strategies** - Run pre-built trading strategies with customizable parameters
- **Zero Custody** - Policy enforcement without taking custody of user assets
- **Pear Protocol Integration** - Execute trades on Hyperliquid via Pear Protocol

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run strategy worker (separate process)
pnpm dev:worker
```

The service runs on `http://localhost:3003` by default.

## Environment Variables

Required variables in root `.env`:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Service Configuration
SALT_SERVICE_PORT=3003
PEAR_SERVICE_URL=http://localhost:3001

# Salt SDK (optional)
SALT_ENVIRONMENT=TESTNET
SALT_MNEMONIC=your-mnemonic
SALT_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
```

## API Endpoints

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Basic health check |
| GET | `/health/ready` | Database connectivity check |

### Wallets

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/salt/wallets/:address` | Get or create Salt wallet for user |

### Accounts

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/salt/accounts` | Create a Salt account |
| GET | `/salt/accounts/:id` | Get account with policy and strategies |

### Policies

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/salt/accounts/:id/policies` | Create or update account policy |

### Strategies

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/salt/strategies` | Get all available strategy definitions |
| POST | `/salt/accounts/:id/strategies` | Add strategy to account |
| GET | `/salt/accounts/:id/strategy-runs` | Get strategy execution history |

### Trading

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/salt/accounts/:id/trade` | Execute a narrative-based trade |
| GET | `/salt/accounts/:id/trades` | Get trade history for account |

## Policy Configuration

Policies enforce trading limits:

```typescript
{
  maxLeverage: 5,           // 1-10x
  maxDailyNotionalUsd: 10000, // $100 - $1,000,000
  maxDrawdownPct: 10,       // 1-50%
  allowedPairs: [           // Restrict trading to specific pairs
    'BTC-USD',
    'ETH-USD',
    'SOL-USD'
  ]
}
```

**Default Policy:**
- Max Leverage: 2x
- Max Daily Notional: $10,000
- Max Drawdown: 10%
- Allowed Pairs: BTC-USD, ETH-USD, SOL-USD

## Available Strategies

| Strategy | ID | Description |
|----------|------|-------------|
| Mean Reversion: AI vs ETH | `meanReversionAiVsEth` | Trade AI tokens against ETH on mean reversion signals |
| SOL Ecosystem vs BTC | `solEcoVsBtc` | Momentum-based SOL ecosystem vs Bitcoin |
| DeFi Momentum | `defiMomentum` | DeFi blue chips vs ETH momentum strategy |

Each strategy has configurable parameters:
- `entryThreshold` - Signal threshold to enter trade
- `exitThreshold` - Signal threshold to exit
- `positionSizeUsd` - Default position size
- `maxPositions` - Maximum concurrent positions
- `rebalanceInterval` - Minutes between rebalances

## Trade Execution Flow

1. **Authenticate** - Verify user is authenticated with Pear Protocol
2. **Validate** - Dry-run trade validation via Pear service
3. **Enforce Policy** - Check against Salt policy (leverage, daily limits, pairs)
4. **Execute** - Submit trade to Pear Protocol with `source: 'salt'`
5. **Record** - Store trade result in database

```bash
# Example: Execute a trade
curl -X POST http://localhost:3003/salt/accounts/{id}/trade \
  -H "Content-Type: application/json" \
  -d '{
    "narrativeId": "ai-vs-eth",
    "direction": "longNarrative",
    "stakeUsd": 100,
    "riskProfile": "standard",
    "mode": "pair"
  }'
```

## Project Structure

```
salt-service/
├── src/
│   ├── index.ts              # Entry point
│   ├── config/
│   │   └── saltConfig.ts     # Environment configuration
│   ├── clients/
│   │   ├── pearServiceClient.ts  # Pear Protocol integration
│   │   └── saltSdkClient.ts      # Salt SDK integration
│   ├── domain/
│   │   ├── policyEnforcer.ts     # Policy validation logic
│   │   ├── strategyExecutor.ts   # Strategy execution
│   │   ├── saltRepo.ts           # Database operations
│   │   └── saltWalletService.ts  # Wallet management
│   ├── plugins/
│   │   └── supabase.ts       # Fastify Supabase plugin
│   ├── routes/
│   │   └── accounts.ts       # API route handlers
│   └── worker/
│       └── strategyLoop.ts   # Automated strategy runner
├── package.json
└── tsconfig.json
```

## Database Schema

The service uses the following Supabase tables:

- `users` - Wallet addresses
- `salt_accounts` - User → Salt account mappings
- `salt_policies` - Account policies with version history
- `salt_strategies` - Configured strategies per account
- `strategy_runs` - Strategy execution history
- `trades` - Trade records with Pear payload

## Scripts

```bash
pnpm dev          # Start dev server with hot reload
pnpm dev:worker   # Start strategy loop worker
pnpm build        # Compile TypeScript
pnpm start        # Run production server
pnpm start:worker # Run production strategy worker
pnpm typecheck    # Type check without emitting
pnpm clean        # Remove build artifacts
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend                            │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    Salt Service                          │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │   Routes    │→ │ Policy       │→ │ Pear Service  │  │
│  │             │  │ Enforcer     │  │ Client        │  │
│  └─────────────┘  └──────────────┘  └───────────────┘  │
│         │                                    │          │
│         ▼                                    ▼          │
│  ┌─────────────┐                    ┌───────────────┐  │
│  │  Supabase   │                    │ Pear Protocol │  │
│  │  (Database) │                    │ (Hyperliquid) │  │
│  └─────────────┘                    └───────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Integration with TAGO Leap

Salt Service is part of the TAGO Leap trading platform:

- **Frontend** → Calls Salt Service for account management
- **Pear Service** → Handles authentication and trade execution
- **LI.FI Service** → Cross-chain onboarding (deposits)

## License

Private - TAGO Leap
