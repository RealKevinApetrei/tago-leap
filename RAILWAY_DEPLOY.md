# Railway Deployment Guide

## Overview

This monorepo deploys as **4 separate Railway services**:
- `pear-service` - Pear Protocol integration (port 3001)
- `salt-service` - Salt risk management (port 3003)
- `lifi-service` - LI.FI bridge integration (port 3002)
- `frontend` - Next.js web app

## Quick Setup

### 1. Create Railway Project

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create new project
railway init
```

### 2. Create Services

In Railway Dashboard:
1. Go to your project
2. Click **"New Service"** → **"GitHub Repo"**
3. Select this repo
4. Repeat for each service (4 total)

### 3. Configure Each Service

#### Service: pear-service

**Settings:**
- **Root Directory:** `/` (repo root - Dockerfile handles paths)
- **Dockerfile Path:** `services/pear-service/Dockerfile`
- **Port:** `3001`

**Environment Variables:**
```
NODE_ENV=production
PEAR_SERVICE_PORT=3001
PEAR_API_BASE_URL=https://hl-v2.pearprotocol.io
PEAR_CLIENT_ID=HLHackathon10
ANTHROPIC_API_KEY=<your-anthropic-key>
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
```

---

#### Service: salt-service

**Settings:**
- **Root Directory:** `/`
- **Dockerfile Path:** `services/salt-service/Dockerfile`
- **Port:** `3003`

**Environment Variables:**
```
NODE_ENV=production
SALT_SERVICE_PORT=3003
PEAR_SERVICE_URL=https://<pear-service>.railway.app
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
```

---

#### Service: lifi-service

**Settings:**
- **Root Directory:** `/`
- **Dockerfile Path:** `services/lifi-service/Dockerfile`
- **Port:** `3002`

**Environment Variables:**
```
NODE_ENV=production
LIFI_SERVICE_PORT=3002
LIFI_API_BASE_URL=https://li.quest/v1
LIFI_INTEGRATOR=tago-leap
HYPERLIQUID_API_BASE_URL=https://api.hyperliquid.xyz
HYPEREVM_CHAIN_ID=999
SALT_SERVICE_URL=https://<salt-service>.railway.app
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
```

---

#### Service: frontend

**Settings:**
- **Root Directory:** `apps/frontend`
- **Build Command:** `cd ../.. && pnpm install && pnpm turbo run build --filter=frontend`
- **Start Command:** `pnpm start`
- **Port:** `3000`

**Environment Variables:**
```
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
NEXT_PUBLIC_PEAR_SERVICE_URL=https://<pear-service>.railway.app
NEXT_PUBLIC_SALT_SERVICE_URL=https://<salt-service>.railway.app
NEXT_PUBLIC_LIFI_SERVICE_URL=https://<lifi-service>.railway.app
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<your-walletconnect-project-id>
```

---

## Service Dependencies

Deploy in this order (or Railway will auto-retry):

1. **pear-service** (no dependencies)
2. **salt-service** (depends on pear-service URL)
3. **lifi-service** (depends on salt-service URL)
4. **frontend** (depends on all service URLs)

## Custom Domains

After deployment, add custom domains in Railway:
1. Go to Service → Settings → Domains
2. Add your domain
3. Update DNS records as shown

## Health Checks

Each service exposes a health endpoint:
- `GET /health` - Returns service status

## Monitoring

Railway provides:
- Real-time logs
- Metrics (CPU, Memory, Network)
- Deploy history

## Cost Estimate

Railway Hobby plan ($5/month):
- Includes $5 of usage
- ~500 hours of compute

For production, consider the Pro plan ($20/month) for:
- More resources
- Team features
- Priority support

## Troubleshooting

### Build fails
- Check Dockerfile paths are correct
- Ensure pnpm-lock.yaml is committed

### Service can't connect to another service
- Use Railway's internal networking: `<service-name>.railway.internal`
- Or use the public URLs with HTTPS

### Environment variables not loading
- Railway auto-injects `PORT` - services should use `process.env.PORT || defaultPort`
