# Salt + Pear Integration Guide

This document describes how Salt-service and the frontend should integrate with pear-service for executing narrative trades.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                    │
├─────────────────────────────────────────────────────────────────────────┤
│  1. User connects wallet (EOA)                                          │
│  2. User authenticates EOA with Pear (via pear-service)                 │
│  3. User creates Salt account (via salt-service)                        │
│  4. User deposits funds to Salt account                                 │
│  5. User configures policies and strategies                             │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            SALT-SERVICE                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  - Manages Salt accounts, policies, and strategies                      │
│  - Enforces policy checks before trade execution                        │
│  - Calls pear-service to execute trades                                 │
│  - Logs strategy runs and decisions                                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            PEAR-SERVICE                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  - Stores Pear auth tokens (keyed by wallet address)                    │
│  - Verifies Salt account ownership                                      │
│  - Executes trades via Pear Protocol API                                │
│  - Records trades with source='salt' and account_ref                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          PEAR PROTOCOL API                               │
├─────────────────────────────────────────────────────────────────────────┤
│  - Executes trades on Hyperliquid                                       │
│  - Returns order status and fills                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Pear-Service API Reference

### Authentication Endpoints

#### GET /auth/message
Get EIP-712 message for wallet authentication.

```typescript
GET /auth/message?wallet=0xUserEOA

Response:
{
  "success": true,
  "data": {
    "domain": { "name": "Pear", "version": "1", ... },
    "types": { ... },
    "primaryType": "...",
    "message": { ... }
  }
}
```

#### POST /auth/verify
Verify signature and store auth tokens.

```typescript
POST /auth/verify
{
  "walletAddress": "0xUserEOA",
  "signature": "0x...",
  "message": { /* EIP712Message */ }
}

Response:
{
  "success": true,
  "data": { "authenticated": true }
}
```

#### GET /auth/status
Check authentication status.

```typescript
GET /auth/status?wallet=0xUserEOA

Response:
{
  "success": true,
  "data": {
    "authenticated": true,
    "expiresAt": "2025-01-16T12:00:00Z"
  }
}
```

---

### Trade Execution Endpoints

#### POST /bets/execute-narrative ⭐ (Primary endpoint for Salt)
Execute a narrative-based trade. This is the main endpoint Salt-service should use.

```typescript
POST /bets/execute-narrative
{
  "userWalletAddress": "0xUserEOA",     // Required: User's EOA for Pear auth
  "narrativeId": "ai-vs-eth",           // Required: Narrative to trade
  "direction": "longNarrative",          // Required: "longNarrative" | "shortNarrative"
  "stakeUsd": 250,                       // Required: Stake amount in USD (min $1)
  "riskProfile": "standard",             // Required: "conservative" | "standard" | "degen"
  "mode": "pair",                        // Required: "pair" | "basket"
  "accountRef": "0xSaltAccount",         // Required for Salt: Salt account address
  "source": "salt"                       // Required for Salt: Must be "salt"
}

Response (success):
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "narrative_id": "ai-vs-eth",
    "direction": "long",
    "stake_usd": 250,
    "risk_profile": "standard",
    "mode": "pair",
    "status": "completed",
    "source": "salt",
    "account_ref": "0xSaltAccount",
    "pear_order_payload": { ... },
    "pear_response": { ... },
    "created_at": "2025-01-16T10:00:00Z"
  }
}

Response (errors):
- 400: Missing required fields / Invalid values
- 401: User not authenticated with Pear
- 403: User does not own this Salt account
- 500: Trade execution failed
```

**Available Narratives:**
| narrativeId | Name | Long Asset | Short Asset |
|-------------|------|------------|-------------|
| `ai-vs-eth` | AI vs ETH | FET | ETH |
| `sol-eco-vs-btc` | SOL Ecosystem vs BTC | SOL | BTC |
| `defi-vs-eth` | DeFi vs ETH | UNI | ETH |
| `l2-vs-eth` | L2s vs ETH | ARB | ETH |
| `meme-momentum` | Meme Momentum | DOGE | BTC |

**Risk Profile → Leverage Mapping:**
| riskProfile | Leverage |
|-------------|----------|
| `conservative` | 1x |
| `standard` | 2x |
| `degen` | 5x |

---

#### POST /bets/validate
Dry-run validation without executing. Use this to pre-check trades against Salt policies.

```typescript
POST /bets/validate
{
  "narrativeId": "ai-vs-eth",
  "direction": "longNarrative",
  "stakeUsd": 250,
  "riskProfile": "standard",
  "mode": "pair"
}

Response:
{
  "success": true,
  "data": {
    "valid": true,
    "errors": [],
    "warnings": ["High leverage (5x) - consider risk carefully"],
    "computedPayload": {
      "longAssets": [{ "asset": "FET", "weight": 1.0 }],
      "shortAssets": [{ "asset": "ETH", "weight": 1.0 }],
      "leverage": 2,
      "estimatedNotional": 500  // stakeUsd * leverage
    }
  }
}
```

---

#### POST /bets/execute
Direct asset execution (alternative to narrative-based). Use when you have specific assets.

```typescript
POST /bets/execute
{
  "userWalletAddress": "0xUserEOA",
  "longAssets": [{ "asset": "FET", "weight": 1.0 }],
  "shortAssets": [{ "asset": "ETH", "weight": 1.0 }],
  "stakeUsd": 250,
  "leverage": 2,
  "slippage": 0.01,                      // Optional, default 1%
  "accountRef": "0xSaltAccount",         // Required for Salt
  "source": "salt"                       // Required for Salt
}
```

---

### Trade Query Endpoints

#### GET /trades
Query trades with filters.

```typescript
// By user wallet
GET /trades?wallet=0xUserEOA

// By Salt account (for Salt-service)
GET /trades?accountRef=0xSaltAccount

// Combined filters
GET /trades?wallet=0xUserEOA&accountRef=0xSaltAccount&source=salt&status=completed

Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "narrative_id": "ai-vs-eth",
      "direction": "long",
      "stake_usd": 250,
      "status": "completed",
      "source": "salt",
      "account_ref": "0xSaltAccount",
      "created_at": "2025-01-16T10:00:00Z",
      ...
    }
  ]
}
```

---

## Salt-Service Implementation Requirements

### 1. Pear-Service Client

Create a client to call pear-service endpoints.

```typescript
// services/salt-service/src/clients/pearServiceClient.ts

const PEAR_SERVICE_URL = process.env.PEAR_SERVICE_URL || 'http://localhost:3002';

export async function executeNarrativeTrade(params: {
  userWalletAddress: string;
  narrativeId: string;
  direction: 'longNarrative' | 'shortNarrative';
  stakeUsd: number;
  riskProfile: 'conservative' | 'standard' | 'degen';
  mode: 'pair' | 'basket';
  saltAccountAddress: string;
}) {
  const response = await fetch(`${PEAR_SERVICE_URL}/bets/execute-narrative`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userWalletAddress: params.userWalletAddress,
      narrativeId: params.narrativeId,
      direction: params.direction,
      stakeUsd: params.stakeUsd,
      riskProfile: params.riskProfile,
      mode: params.mode,
      accountRef: params.saltAccountAddress,
      source: 'salt',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Trade execution failed');
  }

  return response.json();
}

export async function validateTrade(params: {
  narrativeId: string;
  direction: 'longNarrative' | 'shortNarrative';
  stakeUsd: number;
  riskProfile: 'conservative' | 'standard' | 'degen';
  mode: 'pair' | 'basket';
}) {
  const response = await fetch(`${PEAR_SERVICE_URL}/bets/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  return response.json();
}

export async function getTradesBySaltAccount(saltAccountAddress: string) {
  const response = await fetch(
    `${PEAR_SERVICE_URL}/trades?accountRef=${saltAccountAddress}`
  );
  return response.json();
}

export async function checkUserAuth(walletAddress: string) {
  const response = await fetch(
    `${PEAR_SERVICE_URL}/auth/status?wallet=${walletAddress}`
  );
  return response.json();
}
```

---

### 2. Strategy Execution Flow

When a strategy decides to execute a trade:

```typescript
// services/salt-service/src/domain/strategyExecutor.ts

export async function executeStrategyTrade(
  saltAccountId: string,
  trade: {
    narrativeId: string;
    direction: 'longNarrative' | 'shortNarrative';
    stakeUsd: number;
    riskProfile: 'conservative' | 'standard' | 'degen';
  }
) {
  // 1. Get Salt account with user info
  const saltAccount = await getSaltAccountById(supabase, saltAccountId);
  const user = await getUserById(supabase, saltAccount.user_id);

  // 2. Check user is authenticated with Pear
  const authStatus = await checkUserAuth(user.wallet_address);
  if (!authStatus.data?.authenticated) {
    throw new Error('User not authenticated with Pear. Please sign in first.');
  }

  // 3. Get and validate against policy
  const policy = await getLatestPolicy(supabase, saltAccountId);

  // 3a. Validate trade against policy using /bets/validate
  const validation = await validateTrade({
    narrativeId: trade.narrativeId,
    direction: trade.direction,
    stakeUsd: trade.stakeUsd,
    riskProfile: trade.riskProfile,
    mode: 'pair',
  });

  if (!validation.data?.valid) {
    throw new Error(`Validation failed: ${validation.data?.errors.join(', ')}`);
  }

  // 3b. Check computed values against policy
  const { computedPayload } = validation.data;

  if (policy.max_leverage && computedPayload.leverage > policy.max_leverage) {
    throw new Error(`Leverage ${computedPayload.leverage}x exceeds policy max ${policy.max_leverage}x`);
  }

  if (policy.max_daily_notional_usd) {
    const todayNotional = await getTodayNotional(saltAccountId);
    if (todayNotional + computedPayload.estimatedNotional > policy.max_daily_notional_usd) {
      throw new Error('Would exceed daily notional limit');
    }
  }

  // 4. Execute the trade
  const result = await executeNarrativeTrade({
    userWalletAddress: user.wallet_address,
    narrativeId: trade.narrativeId,
    direction: trade.direction,
    stakeUsd: trade.stakeUsd,
    riskProfile: trade.riskProfile,
    mode: 'pair',
    saltAccountAddress: saltAccount.salt_account_address,
  });

  // 5. Log the strategy run
  await createStrategyRun(supabase, {
    strategy_id: strategyId,
    result: result.data,
    status: 'completed',
  });

  return result;
}
```

---

### 3. Policy Enforcement Helpers

```typescript
// services/salt-service/src/domain/policyEnforcer.ts

export async function getTodayNotional(saltAccountId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const trades = await getTradesBySaltAccount(saltAccountAddress);

  return trades.data
    .filter((t: any) => new Date(t.created_at) >= today)
    .filter((t: any) => t.status === 'completed')
    .reduce((sum: number, t: any) => {
      // Approximate notional from stake * leverage (stored in pear_order_payload)
      const leverage = t.pear_order_payload?.leverage || 1;
      return sum + (t.stake_usd * leverage);
    }, 0);
}

export function validateAgainstPolicy(
  policy: SaltPolicy,
  computedPayload: { leverage: number; estimatedNotional: number },
  todayNotional: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (policy.max_leverage && computedPayload.leverage > policy.max_leverage) {
    errors.push(`Leverage ${computedPayload.leverage}x exceeds max ${policy.max_leverage}x`);
  }

  if (policy.max_daily_notional_usd) {
    const newTotal = todayNotional + computedPayload.estimatedNotional;
    if (newTotal > policy.max_daily_notional_usd) {
      errors.push(`Would exceed daily notional limit ($${newTotal} > $${policy.max_daily_notional_usd})`);
    }
  }

  return { valid: errors.length === 0, errors };
}
```

---

### 4. Salt-Service API Endpoints to Add

```typescript
// services/salt-service/src/routes/trading.ts

// Execute a trade for a Salt account
app.post('/salt/accounts/:id/trade', async (request, reply) => {
  const { id } = request.params;
  const { narrativeId, direction, stakeUsd, riskProfile } = request.body;

  try {
    const result = await executeStrategyTrade(id, {
      narrativeId,
      direction,
      stakeUsd,
      riskProfile,
    });

    return { success: true, data: result };
  } catch (err) {
    return reply.badRequest(err.message);
  }
});

// Get trades for a Salt account
app.get('/salt/accounts/:id/trades', async (request, reply) => {
  const { id } = request.params;
  const saltAccount = await getSaltAccountById(supabase, id);

  const trades = await getTradesBySaltAccount(saltAccount.salt_account_address);
  return { success: true, data: trades.data };
});
```

---

## Frontend Implementation Requirements

### 1. Authentication Flow

The user must authenticate their EOA with Pear before Salt can execute trades.

```typescript
// apps/frontend/src/hooks/usePearAuth.ts

export function usePearAuth() {
  const { address, signTypedDataAsync } = useAccount();

  const authenticate = async () => {
    // 1. Get EIP-712 message
    const messageRes = await fetch(`/api/pear/auth/message?wallet=${address}`);
    const { data: message } = await messageRes.json();

    // 2. Sign with wallet
    const signature = await signTypedDataAsync({
      domain: message.domain,
      types: message.types,
      primaryType: message.primaryType,
      message: message.message,
    });

    // 3. Verify signature
    const verifyRes = await fetch('/api/pear/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress: address,
        signature,
        message,
      }),
    });

    return verifyRes.json();
  };

  const checkStatus = async () => {
    const res = await fetch(`/api/pear/auth/status?wallet=${address}`);
    return res.json();
  };

  return { authenticate, checkStatus };
}
```

---

### 2. Salt Account Creation Flow

```typescript
// apps/frontend/src/hooks/useSaltAccount.ts

export function useSaltAccount() {
  const { address } = useAccount();

  const createAccount = async () => {
    const res = await fetch('/api/salt/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userWalletAddress: address }),
    });
    return res.json();
  };

  const getAccount = async () => {
    const res = await fetch(`/api/salt/wallets/${address}`);
    return res.json();
  };

  return { createAccount, getAccount };
}
```

---

### 3. Complete User Onboarding Flow

```tsx
// apps/frontend/src/components/SaltOnboarding.tsx

export function SaltOnboarding() {
  const { address, isConnected } = useAccount();
  const { authenticate, checkStatus } = usePearAuth();
  const { createAccount, getAccount } = useSaltAccount();

  const [step, setStep] = useState<'connect' | 'auth' | 'create' | 'deposit' | 'ready'>('connect');
  const [saltAccount, setSaltAccount] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (isConnected) {
      checkInitialState();
    }
  }, [isConnected, address]);

  const checkInitialState = async () => {
    // Check Pear auth
    const authStatus = await checkStatus();
    setIsAuthenticated(authStatus.data?.authenticated || false);

    // Check Salt account
    const account = await getAccount();
    if (account.data?.saltWalletAddress) {
      setSaltAccount(account.data.saltWalletAddress);
    }

    // Determine step
    if (!authStatus.data?.authenticated) {
      setStep('auth');
    } else if (!account.data?.saltWalletAddress) {
      setStep('create');
    } else {
      setStep('ready');
    }
  };

  const handleAuthenticate = async () => {
    await authenticate();
    setIsAuthenticated(true);
    setStep('create');
  };

  const handleCreateAccount = async () => {
    const result = await createAccount();
    setSaltAccount(result.data.saltAccountAddress);
    setStep('deposit');
  };

  return (
    <div>
      {step === 'connect' && <p>Please connect your wallet</p>}

      {step === 'auth' && (
        <div>
          <p>Authenticate with Pear Protocol to enable trading</p>
          <button onClick={handleAuthenticate}>Sign to Authenticate</button>
        </div>
      )}

      {step === 'create' && (
        <div>
          <p>Create your Salt trading account</p>
          <button onClick={handleCreateAccount}>Create Salt Account</button>
        </div>
      )}

      {step === 'deposit' && (
        <div>
          <p>Deposit funds to your Salt account</p>
          <p>Salt Account: {saltAccount}</p>
          {/* Deposit UI here */}
        </div>
      )}

      {step === 'ready' && (
        <div>
          <p>Your Salt account is ready!</p>
          <p>Salt Account: {saltAccount}</p>
          <p>Pear Auth: ✅</p>
        </div>
      )}
    </div>
  );
}
```

---

### 4. Trade History Component

```tsx
// apps/frontend/src/components/SaltTradeHistory.tsx

export function SaltTradeHistory({ saltAccountId }: { saltAccountId: string }) {
  const [trades, setTrades] = useState([]);

  useEffect(() => {
    fetchTrades();
  }, [saltAccountId]);

  const fetchTrades = async () => {
    const res = await fetch(`/api/salt/accounts/${saltAccountId}/trades`);
    const data = await res.json();
    setTrades(data.data || []);
  };

  return (
    <div>
      <h3>Trade History</h3>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Narrative</th>
            <th>Direction</th>
            <th>Stake</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade: any) => (
            <tr key={trade.id}>
              <td>{new Date(trade.created_at).toLocaleString()}</td>
              <td>{trade.narrative_id}</td>
              <td>{trade.direction}</td>
              <td>${trade.stake_usd}</td>
              <td>{trade.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## Database Schema Reference

### salt_accounts
```sql
CREATE TABLE salt_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  salt_account_address TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### salt_policies
```sql
CREATE TABLE salt_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salt_account_id UUID REFERENCES salt_accounts(id),
  max_leverage NUMERIC,
  max_daily_notional_usd NUMERIC,
  allowed_pairs JSONB DEFAULT '[]',
  max_drawdown_pct NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### trades (with Salt fields)
```sql
-- Existing columns plus:
source TEXT DEFAULT 'user',           -- 'user' | 'salt'
account_ref TEXT                       -- Salt account address when source='salt'
```

---

## Error Handling Reference

| HTTP Code | Error | Meaning |
|-----------|-------|---------|
| 400 | Missing required fields | Request body incomplete |
| 400 | accountRef is required when source is "salt" | Salt trades need accountRef |
| 400 | Unknown narrative: X | Invalid narrativeId |
| 401 | Authentication required | User's EOA not authenticated with Pear |
| 403 | User does not own this Salt account | userWalletAddress doesn't own accountRef |
| 500 | Trade execution failed | Pear Protocol API error |

---

## Testing Checklist

### Salt-Service
- [ ] Can call `/bets/validate` and get computed payload
- [ ] Can call `/bets/execute-narrative` with Salt account
- [ ] Ownership verification returns 403 for wrong user
- [ ] Policy enforcement blocks trades exceeding limits
- [ ] Strategy runs are logged correctly

### Frontend
- [ ] User can authenticate EOA with Pear
- [ ] User can create Salt account
- [ ] Auth status is checked before showing trade UI
- [ ] Trade history displays correctly
- [ ] Error messages are user-friendly

---

## Environment Variables

### Salt-Service
```env
PEAR_SERVICE_URL=http://localhost:3002
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
```

### Frontend
```env
NEXT_PUBLIC_PEAR_SERVICE_URL=http://localhost:3002
NEXT_PUBLIC_SALT_SERVICE_URL=http://localhost:3003
```
