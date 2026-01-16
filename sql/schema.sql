-- TAGO Leap Database Schema
-- Applied via Supabase migration

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trades table
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  narrative_id TEXT NOT NULL,
  direction TEXT NOT NULL,
  stake_usd NUMERIC NOT NULL,
  risk_profile TEXT NOT NULL,
  mode TEXT NOT NULL,
  pear_order_payload JSONB,
  pear_response JSONB,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Onboarding flows table
CREATE TABLE onboarding_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  from_chain_id INTEGER NOT NULL,
  from_token_address TEXT NOT NULL,
  to_token_address TEXT NOT NULL,
  amount TEXT NOT NULL,
  lifi_route JSONB,
  tx_hashes JSONB DEFAULT '[]',
  status TEXT DEFAULT 'initiated',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Salt accounts table
CREATE TABLE salt_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  salt_account_address TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Salt policies table
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

-- Salt strategies table
CREATE TABLE salt_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salt_account_id UUID REFERENCES salt_accounts(id),
  strategy_id TEXT NOT NULL,
  params JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Strategy runs table
CREATE TABLE strategy_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID REFERENCES salt_strategies(id),
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  result JSONB,
  error TEXT,
  status TEXT DEFAULT 'running'
);

-- Indexes for common queries
CREATE INDEX idx_users_wallet_address ON users(wallet_address);
CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_trades_status ON trades(status);
CREATE INDEX idx_onboarding_flows_user_id ON onboarding_flows(user_id);
CREATE INDEX idx_onboarding_flows_status ON onboarding_flows(status);
CREATE INDEX idx_salt_accounts_user_id ON salt_accounts(user_id);
CREATE INDEX idx_salt_strategies_salt_account_id ON salt_strategies(salt_account_id);
CREATE INDEX idx_salt_strategies_active ON salt_strategies(active);
CREATE INDEX idx_strategy_runs_strategy_id ON strategy_runs(strategy_id);
CREATE INDEX idx_strategy_runs_status ON strategy_runs(status);
