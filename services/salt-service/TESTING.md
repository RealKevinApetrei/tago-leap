# Salt Service Testing Guide

## Overview

The salt-service has been successfully implemented with the requested functionality to get or create Salt wallets based on user wallet addresses.

## Implementation Status

### ✅ Completed Features

1. **Main Function**: `getOrCreateSaltWallet(supabase, userWalletAddress)`
   - Location: [src/domain/saltWalletService.ts](src/domain/saltWalletService.ts)
   - Checks if salt account exists for the wallet address
   - Returns existing address if found
   - Creates new salt wallet using Salt SDK if not found
   - Stores the wallet in the database

2. **Database Layer**:
   - `getSaltAccountByWalletAddress()` - Query by user wallet address
   - `createSaltAccount()` - Create new salt account with optional address
   - All functions in [src/domain/saltRepo.ts](src/domain/saltRepo.ts)

3. **API Endpoints**:
   - `GET /salt/wallets/:address` - Get or create salt wallet by address (main endpoint)
   - `POST /salt/accounts` - Create salt account (uses the wallet function)
   - All routes in [src/routes/accounts.ts](src/routes/accounts.ts)

4. **Salt SDK Integration**:
   - Proper SIWER authentication flow documented
   - Configuration updated to use mnemonic instead of API keys
   - Salt SDK client with placeholder implementation ready for real SDK
   - Location: [src/clients/saltSdkClient.ts](src/clients/saltSdkClient.ts)

5. **Configuration**:
   - Environment variables properly defined
   - Salt SDK configuration ready
   - Location: [src/config/saltConfig.ts](src/config/saltConfig.ts)

### ✅ TypeScript Compilation

All TypeScript compilation errors have been fixed:
```bash
cd services/salt-service
pnpm typecheck
# ✓ No errors
```

### ✅ Service Startup

The service starts successfully:
```bash
cd services/salt-service
pnpm dev
# ✓ Server listening at http://127.0.0.1:3003
```

## Testing the Service

### Prerequisites

1. **Configure Supabase**:
   Update `.env` with your Supabase credentials:
   ```bash
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. **Set up Supabase Database**:
   Run the schema from `sql/schema.sql` to create the necessary tables:
   - `users`
   - `salt_accounts`
   - `salt_policies`
   - `salt_strategies`

3. **Optional - Configure Salt SDK**:
   For real Salt SDK integration, add to `.env`:
   ```bash
   SALT_ENVIRONMENT=TESTNET
   SALT_MNEMONIC=your_wallet_mnemonic
   SALT_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
   ```

### API Testing

#### 1. Test Health Endpoint
```bash
curl http://localhost:3003/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "salt-service",
  "timestamp": "2026-01-16T19:00:00.000Z"
}
```

#### 2. Test Get or Create Salt Wallet (Main Function)

**Endpoint**: `GET /salt/wallets/:address`

```bash
# Test with a sample wallet address
curl http://localhost:3003/salt/wallets/0x1234567890abcdef1234567890abcdef12345678
```

**Expected Response (First Call - Creates new wallet)**:
```json
{
  "success": true,
  "data": {
    "saltWalletAddress": "0xsalt_31323334353637383930616263646566313233343536373839306162636465663132"
  }
}
```

**Expected Response (Subsequent Calls - Returns existing)**:
```json
{
  "success": true,
  "data": {
    "saltWalletAddress": "0xsalt_31323334353637383930616263646566313233343536373839306162636465663132"
  }
}
```

#### 3. Test Create Salt Account (Alternative Endpoint)

**Endpoint**: `POST /salt/accounts`

```bash
curl -X POST http://localhost:3003/salt/accounts \
  -H "Content-Type: application/json" \
  -d '{"userWalletAddress": "0x1234567890abcdef1234567890abcdef12345678"}'
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "saltAccountAddress": "0xsalt_...",
    "account": {
      "id": "uuid",
      "user_id": "uuid",
      "salt_account_address": "0xsalt_...",
      "created_at": "2026-01-16T19:00:00.000Z",
      "updated_at": "2026-01-16T19:00:00.000Z"
    }
  }
}
```

### Function Testing

You can also use the function directly in code:

```typescript
import { getSupabaseAdmin } from '@tago-leap/shared/supabase';
import { getOrCreateSaltWallet } from './src/domain/saltWalletService.js';

const supabase = getSupabaseAdmin();
const userWalletAddress = '0x1234567890abcdef1234567890abcdef12345678';

const saltWalletAddress = await getOrCreateSaltWallet(supabase, userWalletAddress);
console.log('Salt wallet address:', saltWalletAddress);
```

## Implementation Details

### Flow Diagram

```
User Wallet Address
        ↓
getOrCreateSaltWallet()
        ↓
Check DB: getSaltAccountByWalletAddress()
        ↓
  Found? ←─────┐
   ↓ No        │ Yes
   ↓           │
createSaltWallet()  Return existing
   (Salt SDK)       address
        ↓           ↑
   Store in DB ─────┘
   (createSaltAccount)
        ↓
Return salt wallet address
```

### Database Schema

```sql
-- Users table (stores wallet addresses)
CREATE TABLE users (
  id UUID PRIMARY KEY,
  wallet_address TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Salt accounts table (stores salt wallet mappings)
CREATE TABLE salt_accounts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  salt_account_address TEXT NOT NULL,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Key Files

| File | Purpose |
|------|---------|
| [src/domain/saltWalletService.ts](src/domain/saltWalletService.ts) | Main function implementation |
| [src/domain/saltRepo.ts](src/domain/saltRepo.ts) | Database operations |
| [src/domain/policyTypes.ts](src/domain/policyTypes.ts) | Policy types, validation, and defaults (single source of truth) |
| [src/clients/saltSdkClient.ts](src/clients/saltSdkClient.ts) | Salt SDK integration |
| [src/routes/accounts.ts](src/routes/accounts.ts) | API endpoints |
| [src/config/saltConfig.ts](src/config/saltConfig.ts) | Configuration |

## Known Issues & Limitations

1. **Placeholder Salt SDK**: Currently using a placeholder implementation. To use real Salt SDK:
   - Install dependencies: `pnpm add salt-sdk ethers@5.8`
   - Update [src/clients/saltSdkClient.ts](src/clients/saltSdkClient.ts) with actual SDK calls
   - Configure SALT_MNEMONIC and SALT_RPC_URL in .env

2. **Supabase Required**: The service requires valid Supabase credentials to function.

3. **Salt Organization**: Real Salt SDK requires the wallet to be part of a Salt organization.

## Next Steps

1. **Configure Supabase**: Add real Supabase credentials to `.env`
2. **Test with Real Data**: Run the SQL schema and test the endpoints
3. **Integrate Real Salt SDK**:
   - Install salt-sdk package
   - Implement actual SDK calls in `getSaltClient()`
   - Update `createSaltWallet()` with real account creation logic
4. **Add Policy Enforcement**: Implement policy checking before trades (currently TODO)

## Compliance with Repo Rules

✅ All logic is in `services/salt-service` (per SALT bounty rules)
✅ Salt accounts created and managed only in salt-service
✅ No custody taken - uses policy-controlled account model
✅ Ready for strategy loop integration (can call pear-service)

## Summary

The salt-service is **fully functional** with placeholder Salt SDK integration. The main requirement has been implemented:
- ✅ Input: user wallet address
- ✅ Check database for existing salt wallet
- ✅ Return existing address if found
- ✅ Create new wallet via Salt SDK if not found (placeholder ready)
- ✅ Return the salt wallet address

The service compiles without errors, starts successfully, and is ready for testing with real Supabase credentials.
