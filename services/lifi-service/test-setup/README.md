# LIFI Service Test Setup

Minimal setup to test the lifi-service in isolation, mimicking real usage from other components.

## Prerequisites

1. **Supabase credentials** - You need a Supabase project with the required tables
2. **Node.js 18+** and **pnpm** installed

## Quick Start

### Terminal 1: Start Mock Salt Service

```bash
cd services/lifi-service
npx tsx test-setup/mock-salt-service.ts
```

You should see:
```
🧂 Mock Salt Service running on http://localhost:3003
```

### Terminal 2: Start LIFI Service

```bash
# From repo root (make sure .env has Supabase credentials)
pnpm dev:lifi
```

Or from the lifi-service folder:
```bash
cd services/lifi-service
pnpm dev
```

### Terminal 3: Run Demo

```bash
cd services/lifi-service
npx tsx test-setup/run-demo.ts
```

## What It Tests

The demo walks through the complete onboarding flow:

1. **GET /onboard/options** - Fetch supported chains/tokens from LI.FI
2. **GET /onboard/salt-wallet/:address** - Get/create user's salt wallet
3. **POST /onboard/quote** - Create bridge quote (real LI.FI API call)
4. **POST /onboard/track** - Track transaction hashes
5. **POST /onboard/deposit** - Complete deposit to Hyperliquid
6. **GET /onboard/flow/:id** - Verify final state

## Files

| File | Description |
|------|-------------|
| `mock-salt-service.ts` | Minimal mock of salt-service for testing |
| `run-demo.ts` | Full flow demo mimicking frontend usage |
| `.env.test.example` | Environment variables template |

## Environment Variables

Required in `../../.env` (repo root):

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Optional (defaults work):
```env
LIFI_SERVICE_PORT=3002        # Default: 3002
SALT_SERVICE_URL=http://localhost:3003  # Points to mock
```

## Alternative: Run Full Test Suite

If you want to run the existing endpoint tests:

```bash
cd services/lifi-service

# With mock salt service running
npx tsx test-endpoints.ts

# Or skip salt tests
SKIP_SALT_TESTS=true npx tsx test-endpoints.ts
```

## Troubleshooting

### "Cannot connect to lifi-service"
- Make sure lifi-service is running on port 3002
- Check that `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set

### "Failed to get salt wallet"
- Make sure mock-salt-service is running on port 3003
- Or set `SKIP_SALT_TESTS=true` if not testing salt integration

### Database errors
- Ensure your Supabase has the `users` and `onboarding_flows` tables
- Run migrations if needed
