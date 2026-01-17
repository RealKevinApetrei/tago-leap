/**
 * LIFI Service Demo Runner - Route Optimization
 *
 * Demonstrates the lifi-service with route optimization and alternatives.
 * Shows how users can choose between fastest, cheapest, or recommended routes.
 *
 * Prerequisites:
 *   1. Mock salt service running: npx tsx test-setup/mock-salt-service.ts
 *   2. LIFI service running: pnpm dev
 *   3. Valid Supabase credentials in .env
 *
 * Usage:
 *   npx tsx test-setup/run-demo.ts
 *   npx tsx test-setup/run-demo.ts --preference=cheapest
 *   npx tsx test-setup/run-demo.ts --preference=fastest
 */

const LIFI_SERVICE_URL = process.env.LIFI_SERVICE_URL || 'http://localhost:3002';

// Parse CLI args for preference
const args = process.argv.slice(2);
const preferenceArg = args.find((a) => a.startsWith('--preference='));
const PREFERENCE = preferenceArg ? preferenceArg.split('=')[1] : 'recommended';

// Test wallet address
const TEST_USER_WALLET = '0x742d35Cc6634C0532925a3b844Bc9e7595f9fDbF';

// Chain/token configs
// LI.FI now supports HyperEVM (chain 999) via Glacis bridges
// See: https://li.fi/knowledge-hub/step-into-hypercore-with-li-fi/
const ARBITRUM_USDC = {
  chainId: 42161,
  tokenAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  symbol: 'USDC',
  decimals: 6,
};

// HyperEVM destination (chain 999)
const HYPEREVM = {
  chainId: 999,
  usdcAddress: '0xb88339CB7199b77E23DB6E890353E22632Ba630f',
  // Native HYPE token
  hypeAddress: '0x0000000000000000000000000000000000000000',
};

// Fallback: Polygon for testing if HyperEVM routes unavailable
const POLYGON_USDC = {
  chainId: 137,
  tokenAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  symbol: 'USDC',
  decimals: 6,
};

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

interface RouteInfo {
  routeId: string;
  fromAmountFormatted: string;
  toAmountFormatted: string;
  estimatedDurationFormatted: string;
  fees: {
    totalFeeUsd: string;
    gasCostUsd: string;
    protocolFeeUsd: string;
  };
  steps: Array<{
    action: string;
    toolName: string;
  }>;
  tags?: string[];
  fromTokenInfo?: { symbol: string };
  toTokenInfo?: { symbol: string };
}

interface QuoteResponse {
  id: string;
  status: string;
  recommended: RouteInfo;
  alternatives: RouteInfo[];
  preference: string;
  routeCount: number;
  saltWalletAddress?: string;
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function checkServiceHealth() {
  console.log('Checking lifi-service health...');
  try {
    const res = await fetch(`${LIFI_SERVICE_URL}/health`);
    if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
    console.log('  lifi-service is healthy\n');
    return true;
  } catch {
    console.error('  lifi-service is not available');
    console.error(`  Make sure it's running at ${LIFI_SERVICE_URL}\n`);
    return false;
  }
}

function displayRoute(route: RouteInfo, index: number, isRecommended: boolean = false) {
  const tags = route.tags?.length ? ` [${route.tags.join(', ')}]` : '';
  const marker = isRecommended ? ' <-- RECOMMENDED' : '';

  console.log(`\n  Route ${index + 1}${tags}${marker}`);
  console.log('  ' + '-'.repeat(50));
  console.log(`    From: ${route.fromAmountFormatted} ${route.fromTokenInfo?.symbol || 'TOKEN'}`);
  console.log(`    To:   ${route.toAmountFormatted} ${route.toTokenInfo?.symbol || 'TOKEN'}`);
  console.log(`    ETA:  ${route.estimatedDurationFormatted}`);
  console.log(`    Fee:  $${route.fees.totalFeeUsd} (gas: $${route.fees.gasCostUsd}, protocol: $${route.fees.protocolFeeUsd})`);
  console.log(`    Steps:`);
  route.steps.forEach((step, i) => {
    console.log(`      ${i + 1}. ${step.action}`);
  });
}

async function demo() {
  console.log('='.repeat(70));
  console.log('LIFI Service - Route Optimization Demo');
  console.log('='.repeat(70));
  console.log(`Service URL: ${LIFI_SERVICE_URL}`);
  console.log(`Preference:  ${PREFERENCE}`);
  console.log(`Test Wallet: ${TEST_USER_WALLET}\n`);

  // Health check
  if (!(await checkServiceHealth())) {
    process.exit(1);
  }

  // Step 1: Get supported options
  console.log('Step 1: Verify supported chains');
  console.log('-'.repeat(50));
  const optionsRes = await fetchJson<ApiResponse<any[]>>(`${LIFI_SERVICE_URL}/onboard/options`);
  const arbitrumSupported = optionsRes.data.some((c) => c.chainId === 42161);
  const hyperevmSupported = optionsRes.data.some((c) => c.chainId === 999);
  const polygonSupported = optionsRes.data.some((c) => c.chainId === 137);
  console.log(`Arbitrum supported:  ${arbitrumSupported ? 'Yes' : 'No'}`);
  console.log(`HyperEVM supported:  ${hyperevmSupported ? 'Yes' : 'No'}`);
  console.log(`Polygon supported:   ${polygonSupported ? 'Yes' : 'No'}`);
  console.log();

  // Step 2: Request quote with route alternatives
  console.log('Step 2: Request bridge quote with route optimization');
  console.log('-'.repeat(50));
  console.log(`From: Arbitrum USDC`);
  console.log(`To:   HyperEVM USDC (chain 999)`);
  console.log(`Amount: 100 USDC`);
  console.log(`Preference: ${PREFERENCE}\n`);

  const amount = '100000000'; // 100 USDC

  let quoteRes: ApiResponse<QuoteResponse>;

  // First try HyperEVM (the actual target)
  try {
    console.log('Attempting Arbitrum -> HyperEVM route...');
    quoteRes = await fetchJson<ApiResponse<QuoteResponse>>(`${LIFI_SERVICE_URL}/onboard/quote`, {
      method: 'POST',
      body: JSON.stringify({
        userWalletAddress: TEST_USER_WALLET,
        fromChainId: ARBITRUM_USDC.chainId,
        fromTokenAddress: ARBITRUM_USDC.tokenAddress,
        amount,
        toTokenAddress: HYPEREVM.usdcAddress,
        preference: PREFERENCE,
      }),
    });
  } catch (error) {
    console.error('HyperEVM route failed:', (error as Error).message);
    console.log('\nTrying fallback: Arbitrum -> Polygon...\n');

    // Fallback to Polygon (well-supported route)
    try {
      quoteRes = await fetchJson<ApiResponse<QuoteResponse>>(`${LIFI_SERVICE_URL}/onboard/quote`, {
        method: 'POST',
        body: JSON.stringify({
          userWalletAddress: TEST_USER_WALLET,
          fromChainId: ARBITRUM_USDC.chainId,
          fromTokenAddress: ARBITRUM_USDC.tokenAddress,
          amount,
          toTokenAddress: POLYGON_USDC.tokenAddress,
          preference: PREFERENCE,
        }),
      });
    } catch (error2) {
      console.error('Polygon fallback also failed:', error2);
      process.exit(1);
    }
  }

  const quote = quoteRes.data;

  console.log('Quote received!');
  console.log(`Flow ID:      ${quote.id}`);
  console.log(`Routes found: ${quote.routeCount}`);
  console.log(`Preference:   ${quote.preference}`);

  // Display all route alternatives
  console.log('\n' + '='.repeat(70));
  console.log('ROUTE ALTERNATIVES');
  console.log('='.repeat(70));

  quote.alternatives.forEach((route, index) => {
    const isRecommended = route.routeId === quote.recommended.routeId;
    displayRoute(route, index, isRecommended);
  });

  // Show comparison summary
  if (quote.alternatives.length > 1) {
    console.log('\n' + '='.repeat(70));
    console.log('COMPARISON SUMMARY');
    console.log('='.repeat(70));

    const fastest = quote.alternatives.reduce((a, b) =>
      parseInt(a.estimatedDurationFormatted) < parseInt(b.estimatedDurationFormatted) ? a : b
    );
    const cheapest = quote.alternatives.reduce((a, b) =>
      parseFloat(a.fees.totalFeeUsd) < parseFloat(b.fees.totalFeeUsd) ? a : b
    );
    const bestReturn = quote.alternatives.reduce((a, b) =>
      parseFloat(a.toAmountFormatted) > parseFloat(b.toAmountFormatted) ? a : b
    );

    console.log(`\n  Fastest:     Route with ${fastest.steps[0]?.toolName || 'N/A'} (${fastest.estimatedDurationFormatted})`);
    console.log(`  Cheapest:    Route with ${cheapest.steps[0]?.toolName || 'N/A'} ($${cheapest.fees.totalFeeUsd} fee)`);
    console.log(`  Best Return: Route with ${bestReturn.steps[0]?.toolName || 'N/A'} (${bestReturn.toAmountFormatted} output)`);
  }

  // Step 3: Show how to select a route
  console.log('\n' + '='.repeat(70));
  console.log('NEXT STEPS');
  console.log('='.repeat(70));
  console.log(`
To proceed with a specific route:

1. User reviews alternatives above
2. User selects preferred route (or accepts recommended)
3. Frontend calls POST /onboard/select-route with:
   {
     "flowId": "${quote.id}",
     "routeId": "${quote.recommended.routeId}"
   }
4. User signs transaction in wallet
5. Frontend calls POST /onboard/track with tx hash
6. Bridge completes, frontend calls POST /onboard/deposit

The selected route will be executed with the exact parameters shown.
No more failed transactions from simulated routes!
`);

  // Demo different preferences
  if (PREFERENCE === 'recommended') {
    console.log('='.repeat(70));
    console.log('TRY OTHER PREFERENCES');
    console.log('='.repeat(70));
    console.log(`
Run with different preferences to see how routes are sorted:

  npx tsx test-setup/run-demo.ts --preference=cheapest   # Lowest fees first
  npx tsx test-setup/run-demo.ts --preference=fastest    # Quickest routes first
  npx tsx test-setup/run-demo.ts --preference=safest     # Simplest routes first
`);
  }
}

demo().catch((err) => {
  console.error('\nDemo failed:', err.message);
  console.log('\nIf you see "No routes found", the route may not be supported by LI.FI.');
  console.log('Try a different source/destination chain combination.');
  process.exit(1);
});
