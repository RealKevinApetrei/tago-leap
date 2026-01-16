# LIFI Service Integration Guide

This document describes how to use the lifi-service component with other parts of the TAGO Leap application.

## Overview

The lifi-service handles one-click onboarding to Hyperliquid/HyperEVM using LI.FI routing. It provides endpoints for:

1. Getting supported chains and tokens
2. Creating bridge+deposit quotes
3. Tracking transaction progress
4. Initiating deposits to Hyperliquid trading accounts

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend  │────>│ lifi-service │────>│ salt-service │
└─────────────┘     └──────────────┘     └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   LI.FI API  │
                    └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ Hyperliquid  │
                    └──────────────┘
```

## API Endpoints

### GET /onboard/options

Returns supported source chains and tokens for bridging.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "chainId": 1,
      "chainName": "Ethereum",
      "tokens": [
        { "address": "0x...", "symbol": "ETH", "decimals": 18 },
        { "address": "0x...", "symbol": "USDC", "decimals": 6 }
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

Creates a quote for bridging from any chain to HyperEVM.

**Request Body:**
```json
{
  "userWalletAddress": "0x123...",
  "fromChainId": 1,
  "fromTokenAddress": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  "amount": "1000000",
  "toTokenAddress": "0x...",
  "depositToSaltWallet": true
}
```

**Parameters:**
- `userWalletAddress` - User's connected wallet address
- `fromChainId` - Source chain ID (1 = Ethereum, 42161 = Arbitrum, etc.)
- `fromTokenAddress` - Token address on source chain
- `amount` - Amount in token's smallest unit (e.g., 1000000 for 1 USDC)
- `toTokenAddress` - Destination token on HyperEVM
- `depositToSaltWallet` (optional) - If true, deposits to user's salt wallet

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "initiated",
    "from_chain_id": 1,
    "from_token_address": "0x...",
    "to_token_address": "0x...",
    "amount": "1000000",
    "lifi_route": {
      "fromChainId": 1,
      "toChainId": 999,
      "steps": [...],
      "estimatedGas": "0.005",
      "toAmount": "1000000"
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

## Frontend Integration

### Complete Deposit Flow

```typescript
// 1. Get supported options
const optionsRes = await fetch('/onboard/options');
const { data: options } = await optionsRes.json();

// 2. Get/create salt wallet for user
const saltRes = await fetch(`/onboard/salt-wallet/${userAddress}`);
const { data: saltWallet } = await saltRes.json();

// 3. Create quote with salt wallet destination
const quoteRes = await fetch('/onboard/quote', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userWalletAddress: userAddress,
    fromChainId: 1,
    fromTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    amount: '1000000',
    toTokenAddress: '0x...',
    depositToSaltWallet: true,
  }),
});
const { data: flow } = await quoteRes.json();

// 4. Display route details to user
// - Show: steps, ETA, expected amount, gas estimate
// - flow.lifi_route contains all details

// 5. User approves and signs transaction (using wallet)
const txHash = await signAndSendTransaction(flow.lifi_route);

// 6. Track transaction
await fetch('/onboard/track', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    flowId: flow.id,
    txHashes: [txHash],
  }),
});

// 7. After bridge completes, initiate deposit
await fetch('/onboard/deposit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    flowId: flow.id,
  }),
});
```

### React Component Example

```tsx
import { useState } from 'react';

interface DepositToHyperliquidProps {
  userAddress: string;
}

export function DepositToHyperliquid({ userAddress }: DepositToHyperliquidProps) {
  const [step, setStep] = useState<'idle' | 'quoting' | 'signing' | 'bridging' | 'completed'>('idle');
  const [saltWallet, setSaltWallet] = useState<string | null>(null);
  const [flow, setFlow] = useState<any>(null);

  // Get salt wallet on mount
  useEffect(() => {
    fetch(`/api/lifi/onboard/salt-wallet/${userAddress}`)
      .then(res => res.json())
      .then(({ data }) => setSaltWallet(data.saltWalletAddress));
  }, [userAddress]);

  const handleDeposit = async (amount: string, fromChainId: number, fromToken: string) => {
    setStep('quoting');

    // Create quote
    const quoteRes = await fetch('/api/lifi/onboard/quote', {
      method: 'POST',
      body: JSON.stringify({
        userWalletAddress: userAddress,
        fromChainId,
        fromTokenAddress: fromToken,
        amount,
        toTokenAddress: '0x...', // USDC on HyperEVM
        depositToSaltWallet: true,
      }),
    });
    const { data: flowData } = await quoteRes.json();
    setFlow(flowData);

    // Sign and send
    setStep('signing');
    const txHash = await wallet.sendTransaction(/* ... */);

    // Track
    setStep('bridging');
    await fetch('/api/lifi/onboard/track', {
      method: 'POST',
      body: JSON.stringify({ flowId: flowData.id, txHashes: [txHash] }),
    });

    // Complete deposit
    await fetch('/api/lifi/onboard/deposit', {
      method: 'POST',
      body: JSON.stringify({ flowId: flowData.id }),
    });

    setStep('completed');
  };

  return (
    <div>
      <h2>Deposit to Hyperliquid</h2>
      {saltWallet && <p>Salt wallet: {saltWallet}</p>}
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
2. **Deposit Destination**: When `depositToSaltWallet: true`, the deposit goes to the user's salt wallet instead of their regular wallet

### Environment Configuration

```env
SALT_SERVICE_URL=http://localhost:3003
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
- `500` - Internal server error (e.g., salt-service unavailable)

## Testing

Run the test suite:

```bash
# Start services
pnpm dev:lifi
pnpm dev:salt  # Optional, for salt wallet tests

# Run tests
cd services/lifi-service
pnpm test
```

Set `SKIP_SALT_TESTS=true` to skip salt wallet integration tests.

## LIFI Bounty Checklist Compliance

This service satisfies the LIFI acceptance checklist from REPO_RULES.md:

- [x] `GET /onboard/options` - Returns supported chains/tokens
- [x] `POST /onboard/quote` - Creates bridge+deposit quote
- [x] `POST /onboard/track` - Tracks transaction hashes
- [x] `POST /onboard/deposit` - Initiates Hyperliquid deposit
- [x] `GET /onboard/salt-wallet/:address` - Salt wallet integration
- [x] No direct LI.FI HTTP calls from frontend
- [x] No direct Hyperliquid deposit API calls from frontend
- [x] Quote shows route details (steps, ETA, amounts)
- [x] Progress states are tracked (initiated → bridging → completed)
