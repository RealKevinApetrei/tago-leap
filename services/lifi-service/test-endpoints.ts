/**
 * LIFI Service Endpoint Test Script
 *
 * Tests all endpoints required by the LIFI bounty acceptance checklist:
 * - GET /onboard/options
 * - POST /onboard/quote
 * - POST /onboard/track
 * - POST /onboard/deposit
 * - GET /onboard/flow/:id
 * - GET /onboard/salt-wallet/:address (salt integration)
 *
 * Usage:
 *   1. Start the lifi-service: pnpm dev:lifi
 *   2. (Optional) Start salt-service for salt wallet tests: pnpm dev:salt
 *   3. Run this script: npx tsx services/lifi-service/test-endpoints.ts
 *
 * Environment variables:
 *   LIFI_SERVICE_URL - Base URL for lifi-service (default: http://localhost:3002)
 *   SALT_SERVICE_URL - Base URL for salt-service (default: http://localhost:3003)
 *   SKIP_SALT_TESTS  - Set to 'true' to skip salt wallet tests
 */

const BASE_URL = process.env.LIFI_SERVICE_URL || 'http://localhost:3002';
const SALT_SERVICE_URL = process.env.SALT_SERVICE_URL || 'http://localhost:3003';
const SKIP_SALT_TESTS = process.env.SKIP_SALT_TESTS === 'true';

interface TestResult {
  name: string;
  passed: boolean;
  response?: unknown;
  error?: string;
}

const results: TestResult[] = [];

async function runTest(
  name: string,
  testFn: () => Promise<{ passed: boolean; response?: unknown; error?: string }>
) {
  console.log(`\n🧪 Testing: ${name}`);
  console.log('─'.repeat(50));

  try {
    const result = await testFn();
    results.push({ name, ...result });

    if (result.passed) {
      console.log(`✅ PASSED`);
      if (result.response) {
        console.log('Response:', JSON.stringify(result.response, null, 2).slice(0, 500));
      }
    } else {
      console.log(`❌ FAILED: ${result.error}`);
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    results.push({ name, passed: false, error });
    console.log(`❌ FAILED: ${error}`);
  }
}

// Test 1: GET /onboard/options
async function testGetOptions() {
  const response = await fetch(`${BASE_URL}/onboard/options`);
  const data = await response.json();

  if (!response.ok) {
    return { passed: false, error: `HTTP ${response.status}`, response: data };
  }

  if (!data.success || !Array.isArray(data.data)) {
    return { passed: false, error: 'Invalid response structure', response: data };
  }

  // Validate structure of options
  const hasValidOptions = data.data.every(
    (opt: { chainId?: number; chainName?: string; tokens?: unknown[] }) =>
      typeof opt.chainId === 'number' &&
      typeof opt.chainName === 'string' &&
      Array.isArray(opt.tokens)
  );

  if (!hasValidOptions) {
    return { passed: false, error: 'Invalid option structure', response: data };
  }

  return { passed: true, response: data };
}

// Test 2: POST /onboard/quote
async function testPostQuote() {
  const payload = {
    userWalletAddress: '0x1234567890123456789012345678901234567890',
    fromChainId: 1,
    fromTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC on Ethereum
    amount: '1000000', // 1 USDC (6 decimals)
    toTokenAddress: '0xb88339CB7199b77E23DB6E890353E22632Ba630f', // USDC on HyperEVM
  };

  const response = await fetch(`${BASE_URL}/onboard/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();

  if (!response.ok) {
    return { passed: false, error: `HTTP ${response.status}`, response: data };
  }

  if (!data.success || !data.data) {
    return { passed: false, error: 'Invalid response structure', response: data };
  }

  const flow = data.data;
  if (!flow.id || !flow.status || !flow.lifi_route) {
    return { passed: false, error: 'Missing required flow fields', response: data };
  }

  return { passed: true, response: data };
}

// Test 3: POST /onboard/track (requires a valid flowId)
async function testPostTrack(flowId: string) {
  const payload = {
    flowId,
    txHashes: ['0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'],
  };

  const response = await fetch(`${BASE_URL}/onboard/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();

  if (!response.ok) {
    return { passed: false, error: `HTTP ${response.status}`, response: data };
  }

  if (!data.success || !data.data) {
    return { passed: false, error: 'Invalid response structure', response: data };
  }

  if (data.data.status !== 'bridging') {
    return { passed: false, error: `Expected status 'bridging', got '${data.data.status}'`, response: data };
  }

  return { passed: true, response: data };
}

// Test 4: POST /onboard/deposit (requires a valid flowId)
async function testPostDeposit(flowId: string) {
  const payload = { flowId };

  const response = await fetch(`${BASE_URL}/onboard/deposit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();

  if (!response.ok) {
    return { passed: false, error: `HTTP ${response.status}`, response: data };
  }

  if (!data.success || !data.data) {
    return { passed: false, error: 'Invalid response structure', response: data };
  }

  if (data.data.status !== 'completed') {
    return { passed: false, error: `Expected status 'completed', got '${data.data.status}'`, response: data };
  }

  return { passed: true, response: data };
}

// Test 5: GET /onboard/flow/:id
async function testGetFlow(flowId: string) {
  const response = await fetch(`${BASE_URL}/onboard/flow/${flowId}`);
  const data = await response.json();

  if (!response.ok) {
    return { passed: false, error: `HTTP ${response.status}`, response: data };
  }

  if (!data.success || !data.data) {
    return { passed: false, error: 'Invalid response structure', response: data };
  }

  if (data.data.id !== flowId) {
    return { passed: false, error: 'Flow ID mismatch', response: data };
  }

  return { passed: true, response: data };
}

// Test validation errors
async function testQuoteValidation() {
  const payload = {
    userWalletAddress: '0x1234567890123456789012345678901234567890',
    // Missing required fields
  };

  const response = await fetch(`${BASE_URL}/onboard/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (response.status === 400) {
    return { passed: true, response: await response.json() };
  }

  return { passed: false, error: `Expected 400, got ${response.status}` };
}

async function testTrackValidation() {
  const payload = {
    // Missing flowId
    txHashes: ['0xabc'],
  };

  const response = await fetch(`${BASE_URL}/onboard/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (response.status === 400) {
    return { passed: true, response: await response.json() };
  }

  return { passed: false, error: `Expected 400, got ${response.status}` };
}

async function testDepositValidation() {
  const payload = {
    // Missing flowId
  };

  const response = await fetch(`${BASE_URL}/onboard/deposit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (response.status === 400) {
    return { passed: true, response: await response.json() };
  }

  return { passed: false, error: `Expected 400, got ${response.status}` };
}

async function testFlowNotFound() {
  const response = await fetch(`${BASE_URL}/onboard/flow/non-existent-id`);

  if (response.status === 404) {
    return { passed: true, response: await response.json() };
  }

  return { passed: false, error: `Expected 404, got ${response.status}` };
}

// Salt wallet integration tests
async function checkSaltServiceAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${SALT_SERVICE_URL}/health`, {
      signal: AbortSignal.timeout(2000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Test: GET /onboard/salt-wallet/:address
async function testGetSaltWallet() {
  const testAddress = '0x1234567890123456789012345678901234567890';
  const response = await fetch(`${BASE_URL}/onboard/salt-wallet/${testAddress}`);
  const data = await response.json();

  if (!response.ok) {
    return { passed: false, error: `HTTP ${response.status}`, response: data };
  }

  if (!data.success || !data.data) {
    return { passed: false, error: 'Invalid response structure', response: data };
  }

  const { userWalletAddress, saltWalletAddress, exists } = data.data;

  if (userWalletAddress !== testAddress) {
    return { passed: false, error: 'User wallet address mismatch', response: data };
  }

  if (!saltWalletAddress || typeof saltWalletAddress !== 'string') {
    return { passed: false, error: 'Missing or invalid salt wallet address', response: data };
  }

  if (typeof exists !== 'boolean') {
    return { passed: false, error: 'Missing exists flag', response: data };
  }

  return { passed: true, response: data };
}

// Test: POST /onboard/quote with depositToSaltWallet
async function testQuoteWithSaltWallet() {
  const payload = {
    userWalletAddress: '0x1234567890123456789012345678901234567890',
    fromChainId: 1,
    fromTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    amount: '1000000',
    toTokenAddress: '0xb88339CB7199b77E23DB6E890353E22632Ba630f', // USDC on HyperEVM
    depositToSaltWallet: true,
  };

  const response = await fetch(`${BASE_URL}/onboard/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();

  if (!response.ok) {
    return { passed: false, error: `HTTP ${response.status}`, response: data };
  }

  if (!data.success || !data.data) {
    return { passed: false, error: 'Invalid response structure', response: data };
  }

  const flow = data.data;
  if (!flow.id || !flow.status || !flow.lifi_route) {
    return { passed: false, error: 'Missing required flow fields', response: data };
  }

  // When depositToSaltWallet is true, response should include saltWalletAddress
  if (!flow.saltWalletAddress) {
    return { passed: false, error: 'Missing saltWalletAddress in response', response: data };
  }

  return { passed: true, response: data };
}

// Main test runner
async function main() {
  console.log('═'.repeat(60));
  console.log('🚀 LIFI SERVICE ENDPOINT TESTS');
  console.log('═'.repeat(60));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Time: ${new Date().toISOString()}`);

  // Check if service is running
  try {
    await fetch(`${BASE_URL}/health`);
  } catch {
    console.error('\n❌ ERROR: Cannot connect to lifi-service');
    console.error(`   Make sure the service is running at ${BASE_URL}`);
    console.error('   Run: pnpm dev:lifi');
    process.exit(1);
  }

  // Run tests
  await runTest('GET /onboard/options - Returns supported chains/tokens', testGetOptions);
  await runTest('POST /onboard/quote - Validation error on missing fields', testQuoteValidation);

  // Create a flow for subsequent tests
  let flowId: string | null = null;

  await runTest('POST /onboard/quote - Creates onboarding flow', async () => {
    const result = await testPostQuote();
    if (result.passed && result.response) {
      flowId = (result.response as { data?: { id?: string } }).data?.id ?? null;
    }
    return result;
  });

  if (flowId) {
    await runTest('GET /onboard/flow/:id - Retrieves flow by ID', () => testGetFlow(flowId!));
    await runTest('POST /onboard/track - Tracks transaction hashes', () => testPostTrack(flowId!));
    await runTest('POST /onboard/deposit - Initiates deposit', () => testPostDeposit(flowId!));
    await runTest('GET /onboard/flow/:id - Verifies final state', () => testGetFlow(flowId!));
  } else {
    console.log('\n⚠️  Skipping flow-dependent tests (no flowId available)');
  }

  await runTest('POST /onboard/track - Validation error', testTrackValidation);
  await runTest('POST /onboard/deposit - Validation error', testDepositValidation);
  await runTest('GET /onboard/flow/:id - Returns 404 for non-existent', testFlowNotFound);

  // Salt wallet integration tests (requires salt-service)
  console.log('\n' + '═'.repeat(60));
  console.log('🧂 SALT WALLET INTEGRATION TESTS');
  console.log('═'.repeat(60));

  if (SKIP_SALT_TESTS) {
    console.log('⏭️  Skipping salt wallet tests (SKIP_SALT_TESTS=true)');
  } else {
    const saltServiceAvailable = await checkSaltServiceAvailable();

    if (saltServiceAvailable) {
      console.log(`Salt service available at ${SALT_SERVICE_URL}`);

      await runTest(
        'GET /onboard/salt-wallet/:address - Returns salt wallet info',
        testGetSaltWallet
      );

      await runTest(
        'POST /onboard/quote (depositToSaltWallet) - Creates flow with salt wallet',
        testQuoteWithSaltWallet
      );
    } else {
      console.log('⚠️  Salt service not available - skipping salt wallet tests');
      console.log(`   Start salt-service: pnpm dev:salt`);
      console.log(`   Or set SKIP_SALT_TESTS=true to skip these tests`);
    }
  }

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(60));

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  results.forEach((r) => {
    console.log(`${r.passed ? '✅' : '❌'} ${r.name}`);
  });

  console.log('\n' + '─'.repeat(60));
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    console.log('\n❌ Some tests failed!');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
  }
}

main().catch(console.error);
