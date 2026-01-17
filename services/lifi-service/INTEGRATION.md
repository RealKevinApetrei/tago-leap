# LIFI Service Integration Guide

This document describes how to use the lifi-service component with other parts of the TAGO Leap application.

## Overview

The lifi-service handles **one-click onboarding to Hyperliquid/HyperEVM** using LI.FI routing. It satisfies the [LIFI] bounty requirements from REPO_RULES.md:

> "Build a dApp or component that bridges users from any chain into HyperEVM (and optionally into a Hyperliquid trading account) using LI.FI routing."

### Key Features

- Bridge from 12+ source chains to HyperEVM in a single flow
- Real-time quotes from LI.FI API with full route transparency
- Fast bridging via Across V4 (~3-6 seconds)
- Salt wallet integration for policy-controlled deposits
- Progress tracking (Idle → Quoted → Bridging → Completed)

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend  │────>│ lifi-service │────>│ salt-service │
└─────────────┘     └──────────────┘     └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   LI.FI API  │
                    │ li.quest/v1  │
                    └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  HyperEVM    │
                    │ (Chain 999)  │
                    └──────────────┘
```

## Supported Chains & Tokens

### Source Chains (bridging FROM)

| Chain | Chain ID | Example USDC Address |
|-------|----------|---------------------|
| Ethereum | 1 | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` |
| Arbitrum | 42161 | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` |
| Optimism | 10 | `0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85` |
| Polygon | 137 | `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359` |
| Base | 8453 | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| BSC | 56 | `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d` |
| Avalanche | 43114 | `0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E` |
| zkSync Era | 324 | - |
| Linea | 59144 | - |
| Scroll | 534352 | - |
| Fantom | 250 | - |
| Gnosis | 100 | - |

### Destination Chain (bridging TO)

| Chain | Chain ID | USDC Address |
|-------|----------|--------------|
| **HyperEVM** | **999** | `0xb88339CB7199b77E23DB6E890353E22632Ba630f` |

### Other HyperEVM Tokens

| Token | Address |
|-------|---------|
| HYPE (native) | `0x0000000000000000000000000000000000000000` |
| ETH | `0x1fbcCdc677c10671eE50b46C61F0f7d135112450` |
| WBTC | `0x0555E30da8f98308EdB960aa94C0Db47230d2B9c` |
| USDe | `0x5d3a1Ff2b6BAb83b63cd9ad0787074081a52ef34` |

## API Endpoints

### GET /onboard/options

Returns supported source chains and tokens for bridging. Data is fetched from LI.FI API with 5-minute caching.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "chainId": 42161,
      "chainName": "Arbitrum",
      "tokens": [
        { "address": "0x0000000000000000000000000000000000000000", "symbol": "ETH", "decimals": 18 },
        { "address": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "symbol": "USDC", "decimals": 6 }
      ]
    }
  ]
}
```

### GET /onboard/salt-wallet/:address

Gets or creates a salt wallet for a user. Calls salt-service internally.

**Parameters:**
- `address` (path) - User's connected wallet address

**Response:**
```json
{
  "success": true,
  "data": {
    "userWalletAddress": "0x123...",
    "saltWalletAddress": "0xabc...",
    "exists": true
  }
}
```

### POST /onboard/quote

Creates a quote for bridging from any chain to HyperEVM. Calls the real LI.FI API (`https://li.quest/v1/quote`).

**Request Body:**
```json
{
  "userWalletAddress": "0x123...",
  "fromChainId": 42161,
  "fromTokenAddress": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  "amount": "10000000",
  "toTokenAddress": "0xb88339CB7199b77E23DB6E890353E22632Ba630f",
  "depositToSaltWallet": true
}
```

**Parameters:**
- `userWalletAddress` - User's connected wallet address (required for LI.FI quote)
- `fromChainId` - Source chain ID (1 = Ethereum, 42161 = Arbitrum, etc.)
- `fromTokenAddress` - Token address on source chain
- `amount` - Amount in token's smallest unit (e.g., 10000000 for 10 USDC)
- `toTokenAddress` - Destination token on HyperEVM (use `0xb88339CB7199b77E23DB6E890353E22632Ba630f` for USDC)
- `depositToSaltWallet` (optional) - If true, deposits to user's salt wallet

**Response (Real LI.FI Data):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "initiated",
    "from_chain_id": 42161,
    "from_token_address": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    "to_token_address": "0xb88339CB7199b77E23DB6E890353E22632Ba630f",
    "amount": "10000000",
    "lifi_route": {
      "routeId": "63206e27-0f40-46d0-b029-c6bbea2f242f:0",
      "fromChainId": 42161,
      "fromChain": { "chainId": 42161, "name": "Arbitrum" },
      "toChainId": 999,
      "toChain": { "chainId": 999, "name": "HyperEVM" },
      "fromTokenInfo": { "symbol": "USDC", "decimals": 6, "priceUsd": "1.00" },
      "toTokenInfo": { "symbol": "USDC", "decimals": 6, "priceUsd": "1.00" },
      "fromAmountFormatted": "10.00",
      "toAmountFormatted": "9.97",
      "estimatedDurationSeconds": 3,
      "estimatedDurationFormatted": "~3 seconds",
      "fees": {
        "gasCostUsd": "0.01",
        "protocolFeeUsd": "0.03",
        "totalFeeUsd": "0.04"
      },
      "steps": [
        {
          "stepIndex": 1,
          "type": "swap",
          "action": "Swap USDC to USDC via Integrator Fee",
          "toolName": "Integrator Fee",
          "fromChainName": "Arbitrum",
          "toChainName": "Arbitrum"
        },
        {
          "stepIndex": 2,
          "type": "bridge",
          "action": "Bridge USDC to USDC via AcrossV4",
          "toolName": "AcrossV4",
          "fromChainName": "Arbitrum",
          "toChainName": "HyperEVM",
          "estimatedDurationSeconds": 3
        }
      ]
    },
    "saltWalletAddress": "0xabc..."
  }
}
```

### POST /onboard/track

Tracks transaction hashes for an onboarding flow.

**Request Body:**
```json
{
  "flowId": "uuid",
  "txHashes": ["0x..."]
}
```

### POST /onboard/deposit

Initiates deposit to Hyperliquid trading account.

**Request Body:**
```json
{
  "flowId": "uuid"
}
```

### GET /onboard/flow/:id

Gets an onboarding flow by ID.

## Real Performance Data

Based on actual LI.FI API responses:

| Route | Amount | Output | Duration | Total Fee |
|-------|--------|--------|----------|-----------|
| Arbitrum → HyperEVM | $10 USDC | $9.97 USDC | ~3 sec | $0.04 |
| Ethereum → HyperEVM | $10 USDC | $9.97 USDC | ~6 sec | $0.06 |

**Bridge Protocol:** Across V4 (fast finality, low fees)

## Route Transparency

The `lifi_route` object provides full transparency for each swap/bridge operation:

### Route-Level Information

| Field | Description |
|-------|-------------|
| `routeId` | Unique identifier from LI.FI for tracking |
| `fromChain` / `toChain` | Chain metadata with name |
| `fromTokenInfo` / `toTokenInfo` | Token details with symbol, decimals, price |
| `fromAmountFormatted` / `toAmountFormatted` | Human-readable amounts |
| `toAmountMin` | Minimum output after slippage |
| `estimatedDurationSeconds` | Total time in seconds |
| `estimatedDurationFormatted` | Human-readable ETA (e.g., "~3 seconds") |
| `fees` | Complete fee breakdown (gas + protocol) |

### Step-Level Information

Each step in `steps[]` includes:

| Field | Description |
|-------|-------------|
| `stepIndex` | 1-based step number for display |
| `type` | Operation type: `swap`, `bridge`, or `cross` |
| `action` | Human-readable description (e.g., "Bridge USDC to HyperEVM via AcrossV4") |
| `toolName` | Protocol name (e.g., "AcrossV4", "Uniswap") |
| `fromChainName` / `toChainName` | Chain names for display |
| `fromTokenSymbol` / `toTokenSymbol` | Token symbols |
| `estimatedDurationSeconds` | Time for this specific step |
| `fees` | Per-step fee breakdown |
| `status` | Execution status: `pending`, `in_progress`, `completed`, `failed` |

## Frontend Integration

### Complete Deposit Flow

```typescript
const HYPEREVM_USDC = '0xb88339CB7199b77E23DB6E890353E22632Ba630f';

// 1. Get supported options
const optionsRes = await fetch('/api/lifi/onboard/options');
const { data: options } = await optionsRes.json();

// 2. Get/create salt wallet for user
const saltRes = await fetch(`/api/lifi/onboard/salt-wallet/${userAddress}`);
const { data: saltWallet } = await saltRes.json();

// 3. Create quote with salt wallet destination
const quoteRes = await fetch('/api/lifi/onboard/quote', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userWalletAddress: userAddress,
    fromChainId: 42161, // Arbitrum
    fromTokenAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // Arbitrum USDC
    amount: '10000000', // 10 USDC
    toTokenAddress: HYPEREVM_USDC,
    depositToSaltWallet: true,
  }),
});
const { data: flow } = await quoteRes.json();

// 4. Display route details to user
console.log(`Bridge: ${flow.lifi_route.steps.map(s => s.toolName).join(' → ')}`);
console.log(`Amount: ${flow.lifi_route.fromAmountFormatted} → ${flow.lifi_route.toAmountFormatted}`);
console.log(`ETA: ${flow.lifi_route.estimatedDurationFormatted}`);
console.log(`Fee: $${flow.lifi_route.fees.totalFeeUsd}`);

// 5. User approves and signs transaction (using wallet)
const txHash = await signAndSendTransaction(flow.lifi_route);

// 6. Track transaction
await fetch('/api/lifi/onboard/track', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    flowId: flow.id,
    txHashes: [txHash],
  }),
});

// 7. After bridge completes, initiate deposit
await fetch('/api/lifi/onboard/deposit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    flowId: flow.id,
  }),
});
```

### React Component Example

```tsx
import { useState, useEffect } from 'react';

const HYPEREVM_USDC = '0xb88339CB7199b77E23DB6E890353E22632Ba630f';

interface DepositToHyperliquidProps {
  userAddress: string;
}

export function DepositToHyperliquid({ userAddress }: DepositToHyperliquidProps) {
  const [step, setStep] = useState<'idle' | 'quoting' | 'signing' | 'bridging' | 'completed'>('idle');
  const [saltWallet, setSaltWallet] = useState<string | null>(null);
  const [flow, setFlow] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Get salt wallet on mount
  useEffect(() => {
    fetch(`/api/lifi/onboard/salt-wallet/${userAddress}`)
      .then(res => res.json())
      .then(({ data }) => setSaltWallet(data.saltWalletAddress))
      .catch(err => setError('Failed to get salt wallet'));
  }, [userAddress]);

  const handleDeposit = async (amount: string, fromChainId: number, fromToken: string) => {
    try {
      setStep('quoting');
      setError(null);

      // Create quote
      const quoteRes = await fetch('/api/lifi/onboard/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userWalletAddress: userAddress,
          fromChainId,
          fromTokenAddress: fromToken,
          amount,
          toTokenAddress: HYPEREVM_USDC,
          depositToSaltWallet: true,
        }),
      });

      if (!quoteRes.ok) {
        throw new Error('Failed to get quote');
      }

      const { data: flowData } = await quoteRes.json();
      setFlow(flowData);

      // Sign and send
      setStep('signing');
      const txHash = await wallet.sendTransaction(/* transaction data from flowData */);

      // Track
      setStep('bridging');
      await fetch('/api/lifi/onboard/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flowId: flowData.id, txHashes: [txHash] }),
      });

      // Complete deposit
      await fetch('/api/lifi/onboard/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flowId: flowData.id }),
      });

      setStep('completed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bridge failed');
      setStep('idle');
    }
  };

  return (
    <div>
      <h2>Deposit to Hyperliquid</h2>
      {saltWallet && <p>Salt wallet: {saltWallet}</p>}
      {error && <p className="error">{error}</p>}
      {flow && (
        <div>
          <p>Route: {flow.lifi_route.steps.map((s: any) => s.toolName).join(' → ')}</p>
          <p>You receive: {flow.lifi_route.toAmountFormatted} USDC</p>
          <p>ETA: {flow.lifi_route.estimatedDurationFormatted}</p>
          <p>Fee: ${flow.lifi_route.fees.totalFeeUsd}</p>
        </div>
      )}
      {/* Chain/token selection UI */}
      {/* Amount input */}
      {/* Progress indicator based on step */}
    </div>
  );
}
```

## Integration with Salt Service

The lifi-service integrates with salt-service to:

1. **Get/Create Salt Wallet**: Before deposits, the service checks if the user has a salt wallet via `GET /salt/wallets/:address` on salt-service
2. **Deposit Destination**: When `depositToSaltWallet: true`, the bridge destination is set to the user's salt wallet address

### Environment Configuration

```env
SALT_SERVICE_URL=http://localhost:3003
LIFI_API_BASE_URL=https://li.quest/v1
LIFI_INTEGRATOR=tago-leap
HYPEREVM_CHAIN_ID=999
```

## Flow States

| Status | Description |
|--------|-------------|
| `initiated` | Quote created, waiting for user to sign |
| `bridging` | Transaction submitted, bridge in progress |
| `completed` | Deposit to Hyperliquid completed |
| `failed` | Error occurred during process |

## Error Handling

All endpoints return errors in a consistent format:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Missing required fields"
}
```

Common error scenarios:
- `400` - Missing required fields or invalid input
- `404` - Flow or resource not found
- `500` - Internal server error (e.g., LI.FI API unavailable, salt-service down)

When the LI.FI API is unavailable, the service falls back to simulated routes (indicated by `routeId` starting with `simulated_`).

## Testing

Run the test suite:

```bash
# Start the service
pnpm dev:lifi

# Run endpoint tests (salt-service optional)
npx tsx services/lifi-service/test-endpoints.ts

# Skip salt wallet tests
SKIP_SALT_TESTS=true npx tsx services/lifi-service/test-endpoints.ts
```

### Test Coverage

The test script validates:
- `GET /onboard/options` - Returns supported chains/tokens
- `POST /onboard/quote` - Creates onboarding flow with real LI.FI data
- `POST /onboard/track` - Tracks transaction hashes
- `POST /onboard/deposit` - Initiates deposit
- `GET /onboard/flow/:id` - Retrieves flow by ID
- `GET /onboard/salt-wallet/:address` - Salt wallet integration
- Validation errors (400) and not found (404) handling

## LIFI Bounty Checklist Compliance

This service satisfies the [LIFI] acceptance checklist from REPO_RULES.md:

- [x] `GET /onboard/options` - Returns supported chains/tokens from real LI.FI API
- [x] `POST /onboard/quote` - Creates bridge+deposit quote with real LI.FI routing
- [x] `POST /onboard/track` - Tracks transaction hashes
- [x] `POST /onboard/deposit` - Initiates Hyperliquid deposit
- [x] `GET /onboard/salt-wallet/:address` - Salt wallet integration
- [x] No direct LI.FI HTTP calls from frontend (all routed through lifi-service)
- [x] No direct Hyperliquid deposit API calls from frontend
- [x] Quote shows route details (steps, ETA, amounts, fees)
- [x] Progress states are tracked (initiated → bridging → completed)
- [x] Users see quote, ETA, route steps, and final amount before confirming
- [x] Error handling with actionable messages

### Cross-Bounty Integration

This service supports the full TAGO Leap flow:

1. **[LIFI] Onboard**: User bridges from any chain to HyperEVM via this service
2. **[SALT] Policy Account**: Funds deposited to salt wallet for policy-controlled trading
3. **[PEAR] Trade**: User places narrative pair/basket trades via pear-service
