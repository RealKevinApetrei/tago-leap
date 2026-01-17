import { lifiConfig } from '../config/lifiConfig.js';
import type {
  SupportedOption,
  LifiRoute,
  ChainInfo,
  TokenInfo,
  LifiRouteStep,
  RoutePreference,
  RouteAlternatives,
} from '@tago-leap/shared/types';

const LIFI_API = lifiConfig.apiBaseUrl;
const INTEGRATOR = lifiConfig.integrator;

// Cache for chains and tokens (refresh every 5 minutes)
let chainsCache: LifiChain[] | null = null;
let chainsCacheTime = 0;
let tokensCache: Map<number, LifiToken[]> = new Map();
let tokensCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ----- LI.FI API Response Types -----

interface LifiChain {
  id: number;
  name: string;
  logoURI?: string;
  nativeToken: {
    address: string;
    symbol: string;
    decimals: number;
    name: string;
    logoURI?: string;
    priceUSD?: string;
  };
  metamask?: {
    blockExplorerUrls?: string[];
  };
}

interface LifiToken {
  address: string;
  symbol: string;
  decimals: number;
  name: string;
  logoURI?: string;
  priceUSD?: string;
  chainId: number;
}

interface LifiRoutesResponse {
  routes: LifiRouteRaw[];
}

interface LifiRouteRaw {
  id: string;
  fromChainId: number;
  toChainId: number;
  fromToken: LifiToken;
  toToken: LifiToken;
  fromAmount: string;
  toAmount: string;
  toAmountMin: string;
  gasCostUSD?: string;
  steps: LifiStepRaw[];
  tags?: string[];
  insurance?: {
    state: string;
    feeAmountUsd: string;
  };
}

interface LifiStepRaw {
  id: string;
  type: 'swap' | 'cross' | 'lifi' | 'protocol';
  tool: string;
  toolDetails: {
    key: string;
    name: string;
    logoURI?: string;
  };
  action: {
    fromChainId: number;
    toChainId: number;
    fromToken: LifiToken;
    toToken: LifiToken;
    fromAmount: string;
    toAmount?: string;
    slippage?: number;
  };
  estimate: {
    fromAmount: string;
    toAmount: string;
    toAmountMin: string;
    executionDuration: number;
    approvalAddress?: string;
    gasCosts?: Array<{
      type: string;
      amount: string;
      amountUSD: string;
      token: LifiToken;
    }>;
    feeCosts?: Array<{
      name: string;
      amount: string;
      amountUSD: string;
      token: LifiToken;
    }>;
  };
}

// ----- Helper Functions -----

function formatAmount(amount: string, decimals: number): string {
  try {
    const value = BigInt(amount);
    const divisor = BigInt(10 ** decimals);
    const integerPart = value / divisor;
    const fractionalPart = value % divisor;
    const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
    const trimmed = fractionalStr.replace(/0+$/, '').padEnd(2, '0').slice(0, 6);
    return `${integerPart}.${trimmed}`;
  } catch {
    return '0.00';
  }
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `~${seconds} seconds`;
  } else if (seconds < 3600) {
    const minutes = Math.ceil(seconds / 60);
    return `~${minutes} minute${minutes > 1 ? 's' : ''}`;
  } else {
    const hours = Math.ceil(seconds / 3600);
    return `~${hours} hour${hours > 1 ? 's' : ''}`;
  }
}

function mapTokenToTokenInfo(token: LifiToken): TokenInfo {
  return {
    address: token.address,
    symbol: token.symbol,
    decimals: token.decimals,
    name: token.name,
    logoUri: token.logoURI,
    priceUsd: token.priceUSD,
  };
}

/**
 * Get chain name from cache or return default
 */
function getChainName(chainId: number): string {
  const chain = chainsCache?.find((c) => c.id === chainId);
  if (chain) return chain.name;

  // Fallback names
  const names: Record<number, string> = {
    1: 'Ethereum',
    42161: 'Arbitrum',
    10: 'Optimism',
    137: 'Polygon',
    56: 'BNB Chain',
    43114: 'Avalanche',
    8453: 'Base',
    324: 'zkSync Era',
    59144: 'Linea',
    534352: 'Scroll',
    250: 'Fantom',
    100: 'Gnosis',
    999: 'HyperEVM',
    1337: 'Hyperliquid',
  };
  return names[chainId] || `Chain ${chainId}`;
}

// ----- API Functions -----

/**
 * Fetch supported chains from LI.FI API
 */
async function fetchChains(): Promise<LifiChain[]> {
  // Return cached if fresh
  if (chainsCache && Date.now() - chainsCacheTime < CACHE_TTL) {
    return chainsCache;
  }

  console.log(`[LifiClient] Fetching chains from ${LIFI_API}/chains`);

  const response = await fetch(`${LIFI_API}/chains`);

  if (!response.ok) {
    throw new Error(`Failed to fetch chains: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { chains: LifiChain[] };
  chainsCache = data.chains;
  chainsCacheTime = Date.now();

  console.log(`[LifiClient] Fetched ${chainsCache.length} chains`);
  return chainsCache;
}

/**
 * Fetch tokens for specific chains from LI.FI API
 */
async function fetchTokens(chainIds: number[]): Promise<Map<number, LifiToken[]>> {
  // Return cached if fresh
  if (tokensCache.size > 0 && Date.now() - tokensCacheTime < CACHE_TTL) {
    return tokensCache;
  }

  const chainsParam = chainIds.join(',');
  console.log(`[LifiClient] Fetching tokens from ${LIFI_API}/tokens?chains=${chainsParam}`);

  const response = await fetch(`${LIFI_API}/tokens?chains=${chainsParam}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch tokens: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { tokens: Record<string, LifiToken[]> };

  tokensCache = new Map();
  for (const [chainId, tokens] of Object.entries(data.tokens)) {
    tokensCache.set(Number(chainId), tokens);
  }
  tokensCacheTime = Date.now();

  console.log(`[LifiClient] Fetched tokens for ${tokensCache.size} chains`);
  return tokensCache;
}

/**
 * Get supported chains and tokens from LI.FI API
 */
export async function getSupportedOptions(): Promise<SupportedOption[]> {
  console.log(`[LifiClient] Getting supported options from ${LIFI_API}`);

  try {
    // Fetch chains
    const chains = await fetchChains();

    // Filter to major EVM chains + HyperEVM/Hyperliquid (exclude testnets)
    const majorChainIds = [
      1, // Ethereum
      42161, // Arbitrum
      10, // Optimism
      137, // Polygon
      56, // BSC
      43114, // Avalanche
      8453, // Base
      324, // zkSync Era
      59144, // Linea
      534352, // Scroll
      250, // Fantom
      100, // Gnosis
      999, // HyperEVM (destination)
      1337, // Hyperliquid
    ];

    const supportedChains = chains.filter((c) => majorChainIds.includes(c.id));

    // Fetch tokens for these chains
    const tokensByChain = await fetchTokens(supportedChains.map((c) => c.id));

    // Build response
    const options: SupportedOption[] = supportedChains.map((chain) => {
      const chainTokens = tokensByChain.get(chain.id) || [];

      // Filter to popular tokens (by having a price or being well-known)
      const popularTokens = chainTokens
        .filter(
          (t) =>
            t.priceUSD ||
            ['ETH', 'WETH', 'USDC', 'USDT', 'DAI', 'WBTC', 'LINK', 'UNI', 'AAVE'].includes(t.symbol)
        )
        .slice(0, 20); // Limit to 20 tokens per chain

      return {
        chainId: chain.id,
        chainName: chain.name,
        tokens: popularTokens.map((t) => ({
          address: t.address,
          symbol: t.symbol,
          decimals: t.decimals,
        })),
      };
    });

    return options;
  } catch (error) {
    console.error('[LifiClient] Error fetching supported options:', error);
    // Fallback to minimal options on error
    return getFallbackOptions();
  }
}

/**
 * Fallback options when API is unavailable
 */
function getFallbackOptions(): SupportedOption[] {
  return [
    {
      chainId: 1,
      chainName: 'Ethereum',
      tokens: [
        { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH', decimals: 18 },
        { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', decimals: 6 },
        { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', decimals: 6 },
      ],
    },
    {
      chainId: 42161,
      chainName: 'Arbitrum',
      tokens: [
        { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH', decimals: 18 },
        { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', symbol: 'USDC', decimals: 6 },
      ],
    },
    {
      chainId: 10,
      chainName: 'Optimism',
      tokens: [
        { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH', decimals: 18 },
        { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', symbol: 'USDC', decimals: 6 },
      ],
    },
    {
      chainId: 137,
      chainName: 'Polygon',
      tokens: [
        { address: '0x0000000000000000000000000000000000000000', symbol: 'MATIC', decimals: 18 },
        { address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', symbol: 'USDC', decimals: 6 },
      ],
    },
    {
      chainId: 8453,
      chainName: 'Base',
      tokens: [
        { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH', decimals: 18 },
        { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol: 'USDC', decimals: 6 },
      ],
    },
    {
      chainId: 999,
      chainName: 'HyperEVM',
      tokens: [
        { address: '0x0000000000000000000000000000000000000000', symbol: 'HYPE', decimals: 18 },
        { address: '0xb88339CB7199b77E23DB6E890353E22632Ba630f', symbol: 'USDC', decimals: 6 },
        { address: '0x1fbcCdc677c10671eE50b46C61F0f7d135112450', symbol: 'ETH', decimals: 18 },
      ],
    },
  ];
}

// ----- Route Fetching with Optimization -----

interface GetRoutesParams {
  fromChainId: number;
  toChainId: number;
  fromTokenAddress: string;
  toTokenAddress: string;
  fromAmount: string;
  fromAddress?: string;
  toAddress?: string;
  preference?: RoutePreference;
}

/**
 * Get multiple route alternatives from LI.FI API with optimization
 *
 * Uses the /advanced/routes endpoint to fetch multiple options, then sorts
 * them based on the user's preference (fastest, cheapest, etc.)
 */
export async function getRoutes(params: GetRoutesParams): Promise<RouteAlternatives> {
  const preference = params.preference || 'recommended';
  console.log(
    `[LifiClient] Getting routes from ${LIFI_API}/advanced/routes (preference: ${preference})`
  );

  // Build request body for LI.FI /advanced/routes endpoint
  // See: https://docs.li.fi/api-reference/get-a-set-of-routes-for-a-request
  // IMPORTANT: LI.FI requires lowercase addresses for EVM chains
  const fromAddress = (params.fromAddress || '0x0000000000000000000000000000000000000000').toLowerCase();
  const toAddress = (params.toAddress || params.fromAddress || '0x0000000000000000000000000000000000000000').toLowerCase();

  const requestBody = {
    fromChainId: params.fromChainId,
    toChainId: params.toChainId,
    fromTokenAddress: params.fromTokenAddress.toLowerCase(),
    toTokenAddress: params.toTokenAddress.toLowerCase(),
    fromAmount: params.fromAmount,
    fromAddress,
    toAddress,
    options: {
      integrator: INTEGRATOR,
      slippage: 0.005, // 0.5%
      order: mapPreferenceToOrder(preference),
      allowSwitchChain: true,
    },
  };

  console.log(`[LifiClient] Request body:`, JSON.stringify(requestBody, null, 2));

  const response = await fetch(`${LIFI_API}/advanced/routes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[LifiClient] Routes API error: ${response.status}`, errorText);
    throw new Error(
      `No routes available for this swap. LI.FI API returned: ${response.status} - ${errorText}`
    );
  }

  const data = (await response.json()) as LifiRoutesResponse;

  if (!data.routes || data.routes.length === 0) {
    throw new Error(
      `No routes found for bridging from chain ${params.fromChainId} to chain ${params.toChainId}. ` +
        `This route may not be supported yet.`
    );
  }

  console.log(`[LifiClient] Found ${data.routes.length} routes`);

  // Map and sort routes based on preference
  const mappedRoutes = data.routes.map((route, index) =>
    mapRawRouteToLifiRoute(route, preference, index)
  );

  // Sort routes based on preference
  const sortedRoutes = sortRoutesByPreference(mappedRoutes, preference);

  // Tag routes
  tagRoutes(sortedRoutes);

  return {
    recommended: sortedRoutes[0],
    alternatives: sortedRoutes,
    preference,
    routeCount: sortedRoutes.length,
  };
}

/**
 * Get a single route (for backwards compatibility)
 */
export async function getRoute(params: GetRoutesParams): Promise<LifiRoute> {
  const alternatives = await getRoutes(params);
  return alternatives.recommended;
}

/**
 * Map preference to LI.FI order parameter
 */
function mapPreferenceToOrder(preference: RoutePreference): string {
  switch (preference) {
    case 'fastest':
      return 'FASTEST';
    case 'cheapest':
      return 'CHEAPEST';
    case 'safest':
      return 'SAFEST';
    case 'recommended':
    default:
      return 'RECOMMENDED';
  }
}

/**
 * Sort routes based on user preference
 */
function sortRoutesByPreference(routes: LifiRoute[], preference: RoutePreference): LifiRoute[] {
  return [...routes].sort((a, b) => {
    switch (preference) {
      case 'fastest':
        return a.estimatedDurationSeconds - b.estimatedDurationSeconds;
      case 'cheapest':
        return parseFloat(a.fees.totalFeeUsd) - parseFloat(b.fees.totalFeeUsd);
      case 'safest':
        // Prefer routes with fewer steps (simpler = safer)
        return a.steps.length - b.steps.length;
      case 'recommended':
      default:
        // Balance between output amount and fees
        const aScore = parseFloat(a.toAmountUsd) - parseFloat(a.fees.totalFeeUsd);
        const bScore = parseFloat(b.toAmountUsd) - parseFloat(b.fees.totalFeeUsd);
        return bScore - aScore; // Higher score = better
    }
  });
}

/**
 * Tag routes with FASTEST, CHEAPEST, etc.
 */
function tagRoutes(routes: LifiRoute[]): void {
  if (routes.length === 0) return;

  // Find fastest
  const fastest = routes.reduce((min, r) =>
    r.estimatedDurationSeconds < min.estimatedDurationSeconds ? r : min
  );
  fastest.tags = fastest.tags || [];
  if (!fastest.tags.includes('FASTEST')) {
    fastest.tags.push('FASTEST');
  }

  // Find cheapest (lowest total fee)
  const cheapest = routes.reduce((min, r) =>
    parseFloat(r.fees.totalFeeUsd) < parseFloat(min.fees.totalFeeUsd) ? r : min
  );
  cheapest.tags = cheapest.tags || [];
  if (!cheapest.tags.includes('CHEAPEST')) {
    cheapest.tags.push('CHEAPEST');
  }

  // Find best output
  const bestOutput = routes.reduce((max, r) =>
    parseFloat(r.toAmountUsd) > parseFloat(max.toAmountUsd) ? r : max
  );
  bestOutput.tags = bestOutput.tags || [];
  if (!bestOutput.tags.includes('BEST_RETURN')) {
    bestOutput.tags.push('BEST_RETURN');
  }

  // Mark first as recommended
  routes[0].tags = routes[0].tags || [];
  if (!routes[0].tags.includes('RECOMMENDED')) {
    routes[0].tags.push('RECOMMENDED');
  }
}

/**
 * Map LI.FI raw route to our LifiRoute format
 */
function mapRawRouteToLifiRoute(
  route: LifiRouteRaw,
  preference: RoutePreference,
  index: number
): LifiRoute {
  const fromToken = route.fromToken;
  const toToken = route.toToken;

  // Calculate total fees from all steps
  let totalGasCostUsd = 0;
  let totalProtocolFeeUsd = 0;
  let totalDurationSeconds = 0;

  const steps: LifiRouteStep[] = route.steps.map((step, stepIndex) => {
    const stepGasCost =
      step.estimate.gasCosts?.reduce((sum, gc) => sum + Number(gc.amountUSD || 0), 0) || 0;
    const stepProtocolFee =
      step.estimate.feeCosts?.reduce((sum, fc) => sum + Number(fc.amountUSD || 0), 0) || 0;

    totalGasCostUsd += stepGasCost;
    totalProtocolFeeUsd += stepProtocolFee;
    totalDurationSeconds += step.estimate.executionDuration || 0;

    const stepType: 'swap' | 'bridge' | 'cross' =
      step.type === 'cross' || step.type === 'lifi' ? 'bridge' : (step.type as 'swap' | 'bridge');

    return {
      stepIndex: stepIndex + 1,
      type: stepType,
      action: `${stepType === 'bridge' ? 'Bridge' : 'Swap'} ${step.action.fromToken.symbol} to ${step.action.toToken.symbol} via ${step.toolDetails.name}`,
      tool: step.tool,
      toolName: step.toolDetails.name,
      toolLogoUri: step.toolDetails.logoURI,
      fromChainId: step.action.fromChainId,
      fromChainName: getChainName(step.action.fromChainId),
      toChainId: step.action.toChainId,
      toChainName: getChainName(step.action.toChainId),
      fromToken: step.action.fromToken.address,
      fromTokenSymbol: step.action.fromToken.symbol,
      toToken: step.action.toToken.address,
      toTokenSymbol: step.action.toToken.symbol,
      fromAmount: step.estimate.fromAmount,
      fromAmountFormatted: formatAmount(step.estimate.fromAmount, step.action.fromToken.decimals),
      toAmount: step.estimate.toAmount,
      toAmountFormatted: formatAmount(step.estimate.toAmount, step.action.toToken.decimals),
      estimatedDurationSeconds: step.estimate.executionDuration || 0,
      fees: {
        gasCostUsd: stepGasCost.toFixed(2),
        protocolFeeUsd: stepProtocolFee.toFixed(2),
      },
      status: 'pending' as const,
    };
  });

  const fromAmountFormatted = formatAmount(route.fromAmount, fromToken.decimals);
  const toAmountFormatted = formatAmount(route.toAmount, toToken.decimals);

  // Get prices
  const fromPriceUsd = parseFloat(fromToken.priceUSD || '1');
  const toPriceUsd = parseFloat(toToken.priceUSD || '1');

  const fromAmountUsd = (parseFloat(fromAmountFormatted) * fromPriceUsd).toFixed(2);
  const toAmountUsd = (parseFloat(toAmountFormatted) * toPriceUsd).toFixed(2);

  // Include insurance fee if present
  if (route.insurance?.feeAmountUsd) {
    totalProtocolFeeUsd += parseFloat(route.insurance.feeAmountUsd);
  }

  // Calculate exchange rate
  const fromAmountNum = parseFloat(fromAmountFormatted);
  const toAmountNum = parseFloat(toAmountFormatted);
  const exchangeRate = fromAmountNum > 0 ? (toAmountNum / fromAmountNum).toFixed(6) : '1.000000';

  return {
    routeId: route.id,
    fromChainId: route.fromChainId,
    fromChain: {
      chainId: route.fromChainId,
      name: getChainName(route.fromChainId),
    },
    toChainId: route.toChainId,
    toChain: {
      chainId: route.toChainId,
      name: getChainName(route.toChainId),
    },
    fromToken: fromToken.address,
    fromTokenInfo: mapTokenToTokenInfo(fromToken),
    toToken: toToken.address,
    toTokenInfo: mapTokenToTokenInfo(toToken),
    fromAmount: route.fromAmount,
    fromAmountFormatted,
    fromAmountUsd,
    toAmount: route.toAmount,
    toAmountFormatted,
    toAmountUsd,
    toAmountMin: route.toAmountMin,
    exchangeRate,
    slippage: '0.5',
    estimatedDurationSeconds: totalDurationSeconds,
    estimatedDurationFormatted: formatDuration(totalDurationSeconds),
    fees: {
      gasCostNative: '0',
      gasCostUsd: totalGasCostUsd.toFixed(2),
      protocolFeeUsd: totalProtocolFeeUsd.toFixed(2),
      totalFeeUsd: (totalGasCostUsd + totalProtocolFeeUsd).toFixed(2),
    },
    estimatedGas: totalGasCostUsd.toFixed(4),
    steps,
    tags: route.tags || [],
  };
}
