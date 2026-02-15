#!/usr/bin/env tsx
/**
 * Debug script to check trade execution flow
 * Usage: npx tsx debug-trade.ts <wallet-address> <account-id>
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const PEAR_API_BASE = process.env.PEAR_API_BASE_URL || 'https://hl-v2.pearprotocol.io';

async function debugTrade(walletAddress: string, accountId?: string) {
  console.log('🔍 开始诊断交易执行问题...\n');

  // 1. Check Supabase connection
  console.log('1️⃣ 检查数据库连接...');
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ 缺少 Supabase 配置');
    console.error('   SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_KEY ? '✓' : '✗');
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  console.log('✅ 数据库连接成功\n');

  // 2. Check user exists
  console.log('2️⃣ 检查用户信息...');
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('wallet_address', walletAddress)
    .single();

  if (userError || !user) {
    console.error('❌ 用户不存在:', walletAddress);
    console.error('   错误:', userError?.message);
    return;
  }
  console.log('✅ 用户存在:', user.id);

  // 3. Check authentication token
  console.log('\n3️⃣ 检查 Pear 认证状态...');
  const { data: auth, error: authError } = await supabase
    .from('pear_auth_tokens')
    .select('*')
    .eq('wallet_address', walletAddress)
    .single();

  if (authError || !auth) {
    console.error('❌ 未找到认证令牌');
    console.error('   用户需要先登录 Pear Protocol');
    return;
  }

  const now = new Date();
  const expiresAt = new Date(auth.expires_at);
  const isExpired = expiresAt < now;

  console.log('   Access Token:', auth.access_token ? `${auth.access_token.substring(0, 20)}...` : '无');
  console.log('   过期时间:', auth.expires_at);
  console.log('   状态:', isExpired ? '❌ 已过期' : '✅ 有效');

  if (isExpired) {
    console.error('❌ 认证令牌已过期，需要重新登录');
    return;
  }

  // 4. Check agent wallet
  console.log('\n4️⃣ 检查 Agent Wallet...');
  try {
    const response = await fetch(`${PEAR_API_BASE}/agent-wallet`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.access_token}`,
      },
    });

    if (!response.ok) {
      console.error('❌ 无法获取 Agent Wallet 信息');
      console.error('   HTTP 状态:', response.status);
      const errorText = await response.text();
      console.error('   错误信息:', errorText);
      return;
    }

    const agentWallet = await response.json();
    console.log('   Agent Wallet 地址:', agentWallet.address || '未设置');
    console.log('   状态:', agentWallet.exists ? '✅ 已创建' : '❌ 未创建');

    if (!agentWallet.exists) {
      console.error('\n❌ Agent Wallet 未设置');
      console.error('   请先创建 Agent Wallet 并在 Hyperliquid 上批准');
      return;
    }
  } catch (err: any) {
    console.error('❌ 检查 Agent Wallet 失败:', err.message);
    return;
  }

  // 5. Check Salt account if provided
  if (accountId) {
    console.log('\n5️⃣ 检查 Salt 账户...');
    const { data: account, error: accountError } = await supabase
      .from('salt_accounts')
      .select('*, users(*)')
      .eq('id', accountId)
      .single();

    if (accountError || !account) {
      console.error('❌ Salt 账户不存在:', accountId);
      return;
    }

    console.log('✅ Salt 账户存在');
    console.log('   账户地址:', account.salt_account_address);
    console.log('   所有者:', account.users.wallet_address);

    if (account.users.wallet_address !== walletAddress) {
      console.error('❌ 钱包地址不匹配');
      console.error('   提供的地址:', walletAddress);
      console.error('   账户所有者:', account.users.wallet_address);
      return;
    }

    // Check policy
    console.log('\n6️⃣ 检查交易策略...');
    const { data: policy } = await supabase
      .from('salt_policies')
      .select('*')
      .eq('salt_account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (policy) {
      console.log('   最大杠杆:', policy.max_leverage || '无限制');
      console.log('   每日最大名义金额:', policy.max_daily_notional_usd ? `$${policy.max_daily_notional_usd}` : '无限制');
      console.log('   最大回撤:', policy.max_drawdown_pct ? `${policy.max_drawdown_pct}%` : '无限制');
      console.log('   允许的交易对:', policy.allowed_pairs ? (policy.allowed_pairs as any[]).join(', ') : '全部');
    } else {
      console.log('   未设置策略（无限制）');
    }

    // Check recent trades
    console.log('\n7️⃣ 检查最近的交易...');
    const { data: trades } = await supabase
      .from('trades')
      .select('*')
      .eq('account_ref', account.salt_account_address)
      .order('created_at', { ascending: false })
      .limit(5);

    if (trades && trades.length > 0) {
      console.log(`   最近 ${trades.length} 笔交易:`);
      for (const trade of trades) {
        const status = trade.status === 'completed' ? '✅' :
                      trade.status === 'failed' ? '❌' : '⏳';
        console.log(`   ${status} ${trade.created_at} - $${trade.stake_usd} (${trade.status})`);

        if (trade.status === 'failed' && trade.pear_response) {
          const response = trade.pear_response as any;
          if (response.error) {
            console.log(`      错误: ${response.error}`);
          }
        }
      }
    } else {
      console.log('   没有交易记录');
    }
  }

  // 8. Test Pear API connectivity
  console.log('\n8️⃣ 测试 Pear API 连接...');
  try {
    const response = await fetch(`${PEAR_API_BASE}/positions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.access_token}`,
      },
    });

    console.log('   HTTP 状态:', response.status);

    if (response.ok) {
      const positions = await response.json();
      console.log('✅ Pear API 连接成功');
      console.log('   当前持仓数:', positions.positions?.length || 0);
    } else {
      const errorText = await response.text();
      console.error('❌ Pear API 返回错误');
      console.error('   错误信息:', errorText);
    }
  } catch (err: any) {
    console.error('❌ 无法连接到 Pear API:', err.message);
  }

  console.log('\n✅ 诊断完成');
  console.log('\n💡 建议:');
  console.log('   1. 如果认证令牌过期，请重新登录');
  console.log('   2. 如果 Agent Wallet 未设置，请先创建并批准');
  console.log('   3. 检查 Hyperliquid 账户是否有足够的 USDC 余额');
  console.log('   4. 查看浏览器控制台和网络请求获取详细错误信息');
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('用法: npx tsx debug-trade.ts <wallet-address> [account-id]');
  console.error('示例: npx tsx debug-trade.ts 0x1234... salt-account-123');
  process.exit(1);
}

const walletAddress = args[0];
const accountId = args[1];

debugTrade(walletAddress, accountId).catch(console.error);
