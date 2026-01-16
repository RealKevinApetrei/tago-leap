import { lifiConfig } from '../config/lifiConfig.js';
import type { SupportedOption, LifiRoute, ChainInfo, TokenInfo, LifiRouteStep } from '@tago-leap/shared/types';

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

interface LifiQuoteResponse {
  id: string;
  type: string;
  tool: string;
  action: {
    fromChainId: number;
    toChainId: number;
    fromToken: LifiToken;
    toToken: LifiToken;
    fromAmount: string;
    toAmount: string;
    slippage: number;
  };
  estimate: {
    fromAmount: string;
    toAmount: string;
    toAmountMin: string;
    approvalAddress: string;
    executionDuration: number;
    feeCosts?: Array<{
      name: string;
      amount: string;
      amountUSD: string;
      token: LifiToken;
    }>;
    gasCosts?: Array<{
      type: string;
      amount: string;
      amountUSD: string;
      token: LifiToken;
    }>;
  };
  includedSteps?: LifiStepDetail[];
  transactionRequest?: {
    to: string;
    data: string;
    value: string;
    gasLimit: string;
    gasPrice: string;
  };
}

interface LifiStepDetail {
  id: string;
  type: 'swap' | 'cross' | 'lifi';
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
    toAmount: string;
  };
  estimate: {
    fromAmount: string;
    toAmount: string;
    toAmountMin: string;
    executionDuration: number;
    gasCosts?: Array<{
      amount: string;
      amountUSD: string;
    }>;
    feeCosts?: Array<{
      amount: string;
      amountUSD: string;
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

function mapChainToChainInfo(chain: LifiChain): ChainInfo {
  return {
    chainId: chain.id,
    name: chain.name,
    logoUri: chain.logoURI,
    explorerUrl: chain.metamask?.blockExplorerUrls?.[0],
  };
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

  const data = await response.json() as { chains: LifiChain[] };
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

  const data = await response.json() as { tokens: Record<string, LifiToken[]> };

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
      1,      // Ethereum
      42161,  // Arbitrum
      10,     // Optimism
      137,    // Polygon
      56,     // BSC
      43114,  // Avalanche
      8453,   // Base
      324,    // zkSync Era
      59144,  // Linea
      534352, // Scroll
      250,    // Fantom
      100,    // Gnosis
      999,    // HyperEVM (destination)
      1337,   // Hyperliquid
    ];

    const supportedChains = chains.filter(c => majorChainIds.includes(c.id));

    // Fetch tokens for these chains
    const tokensByChain = await fetchTokens(supportedChains.map(c => c.id));

    // Build response
    const options: SupportedOption[] = supportedChains.map(chain => {
      const chainTokens = tokensByChain.get(chain.id) || [];

      // Filter to popular tokens (by having a price or being well-known)
      const popularTokens = chainTokens
        .filter(t =>
          t.priceUSD ||
          ['ETH', 'WETH', 'USDC', 'USDT', 'DAI', 'WBTC', 'LINK', 'UNI', 'AAVE'].includes(t.symbol)
        )
        .slice(0, 20); // Limit to 20 tokens per chain

      return {
        chainId: chain.id,
        chainName: chain.name,
        tokens: popularTokens.map(t => ({
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

interface GetRoutesParams {
  fromChainId: number;
  toChainId: number;
  fromTokenAddress: string;
  toTokenAddress: string;
  fromAmount: string;
  fromAddress?: string;
  toAddress?: string;
}

/**
 * Get a quote/route from LI.FI API with full transparency
 */
export async function getRoutes(params: GetRoutesParams): Promise<LifiRoute> {
  console.log(`[LifiClient] Getting quote from ${LIFI_API}/quote`);

  try {
    // Build query parameters for LI.FI quote API
    const queryParams = new URLSearchParams({
      fromChain: params.fromChainId.toString(),
      toChain: params.toChainId.toString(),
      fromToken: params.fromTokenAddress,
      toToken: params.toTokenAddress,
      fromAmount: params.fromAmount,
      fromAddress: params.fromAddress || '0x0000000000000000000000000000000000000000',
      toAddress: params.toAddress || params.fromAddress || '0x0000000000000000000000000000000000000000',
      integrator: INTEGRATOR,
      slippage: '0.005', // 0.5%
    });

    const response = await fetch(`${LIFI_API}/quote?${queryParams}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[LifiClient] Quote API error: ${response.status}`, errorText);
      // Fall back to simulated route
      return getSimulatedRoute(params);
    }

    const quote = await response.json() as LifiQuoteResponse;
    return mapQuoteToRoute(quote, params);
  } catch (error) {
    console.error('[LifiClient] Error fetching quote:', error);
    // Fall back to simulated route
    return getSimulatedRoute(params);
  }
}

/**
 * Map LI.FI quote response to our LifiRoute format
 */
function mapQuoteToRoute(quote: LifiQuoteResponse, params: GetRoutesParams): LifiRoute {
  const fromToken = quote.action.fromToken;
  const toToken = quote.action.toToken;

  // Calculate fees
  const gasCostUsd = quote.estimate.gasCosts?.reduce(
    (sum, gc) => sum + Number(gc.amountUSD || 0), 0
  ) || 0;
  const protocolFeeUsd = quote.estimate.feeCosts?.reduce(
    (sum, fc) => sum + Number(fc.amountUSD || 0), 0
  ) || 0;

  // Map steps
  const steps: LifiRouteStep[] = (quote.includedSteps || []).map((step, index) => {
    const stepGasCost = step.estimate.gasCosts?.reduce(
      (sum, gc) => sum + Number(gc.amountUSD || 0), 0
    ) || 0;
    const stepProtocolFee = step.estimate.feeCosts?.reduce(
      (sum, fc) => sum + Number(fc.amountUSD || 0), 0
    ) || 0;

    return {
      stepIndex: index + 1,
      type: step.type === 'cross' ? 'bridge' as const : step.type as 'swap' | 'bridge',
      action: `${step.type === 'cross' ? 'Bridge' : 'Swap'} ${step.action.fromToken.symbol} to ${step.action.toToken.symbol} via ${step.toolDetails.name}`,
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
      estimatedDurationSeconds: step.estimate.executionDuration,
      fees: {
        gasCostUsd: stepGasCost.toFixed(2),
        protocolFeeUsd: stepProtocolFee.toFixed(2),
      },
      status: 'pending' as const,
    };
  });

  // If no steps returned, create a single step from the main quote
  if (steps.length === 0) {
    steps.push({
      stepIndex: 1,
      type: quote.type === 'cross' ? 'bridge' as const : 'swap' as const,
      action: `${quote.type === 'cross' ? 'Bridge' : 'Swap'} ${fromToken.symbol} to ${toToken.symbol} via ${quote.tool}`,
      tool: quote.tool,
      toolName: quote.tool,
      toolLogoUri: undefined,
      fromChainId: params.fromChainId,
      fromChainName: getChainName(params.fromChainId),
      toChainId: params.toChainId,
      toChainName: getChainName(params.toChainId),
      fromToken: fromToken.address,
      fromTokenSymbol: fromToken.symbol,
      toToken: toToken.address,
      toTokenSymbol: toToken.symbol,
      fromAmount: quote.estimate.fromAmount,
      fromAmountFormatted: formatAmount(quote.estimate.fromAmount, fromToken.decimals),
      toAmount: quote.estimate.toAmount,
      toAmountFormatted: formatAmount(quote.estimate.toAmount, toToken.decimals),
      estimatedDurationSeconds: quote.estimate.executionDuration,
      fees: {
        gasCostUsd: gasCostUsd.toFixed(2),
        protocolFeeUsd: protocolFeeUsd.toFixed(2),
      },
      status: 'pending' as const,
    });
  }

  const fromAmountFormatted = formatAmount(quote.estimate.fromAmount, fromToken.decimals);
  const toAmountFormatted = formatAmount(quote.estimate.toAmount, toToken.decimals);

  return {
    routeId: quote.id || `route_${Date.now()}`,
    fromChainId: params.fromChainId,
    fromChain: {
      chainId: params.fromChainId,
      name: getChainName(params.fromChainId),
    },
    toChainId: params.toChainId,
    toChain: {
      chainId: params.toChainId,
      name: getChainName(params.toChainId),
    },
    fromToken: fromToken.address,
    fromTokenInfo: mapTokenToTokenInfo(fromToken),
    toToken: toToken.address,
    toTokenInfo: mapTokenToTokenInfo(toToken),
    fromAmount: quote.estimate.fromAmount,
    fromAmountFormatted,
    fromAmountUsd: (Number(fromAmountFormatted) * Number(fromToken.priceUSD || 1)).toFixed(2),
    toAmount: quote.estimate.toAmount,
    toAmountFormatted,
    toAmountUsd: (Number(toAmountFormatted) * Number(toToken.priceUSD || 1)).toFixed(2),
    toAmountMin: quote.estimate.toAmountMin,
    exchangeRate: (Number(quote.estimate.toAmount) / Number(quote.estimate.fromAmount)).toFixed(6),
    slippage: (quote.action.slippage * 100).toString(),
    estimatedDurationSeconds: quote.estimate.executionDuration,
    estimatedDurationFormatted: formatDuration(quote.estimate.executionDuration),
    fees: {
      gasCostNative: '0',
      gasCostUsd: gasCostUsd.toFixed(2),
      protocolFeeUsd: protocolFeeUsd.toFixed(2),
      totalFeeUsd: (gasCostUsd + protocolFeeUsd).toFixed(2),
    },
    estimatedGas: gasCostUsd.toFixed(4),
    steps,
    tags: [],
  };
}

/**
 * Get chain name from cache or return default
 */
function getChainName(chainId: number): string {
  const chain = chainsCache?.find(c => c.id === chainId);
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

/**
 * Simulated route when API is unavailable (fallback)
 */
function getSimulatedRoute(params: GetRoutesParams): LifiRoute {
  console.log('[LifiClient] Using simulated route (API unavailable)');

  const fromChainName = getChainName(params.fromChainId);
  const toChainName = getChainName(params.toChainId);

  // Simulate a bridge route
  const feeMultiplier = 0.997;
  const toAmountRaw = Math.floor(Number(params.fromAmount) * feeMultiplier).toString();
  const toAmountMin = Math.floor(Number(toAmountRaw) * 0.995).toString();

  // Estimate duration based on source chain
  const duration = params.fromChainId === 42161 ? 120 :
    params.fromChainId === 10 ? 180 :
    params.fromChainId === 137 ? 300 :
    300;

  const steps: LifiRouteStep[] = [{
    stepIndex: 1,
    type: 'bridge',
    action: `Bridge to ${toChainName}`,
    tool: 'lifi-bridge',
    toolName: 'LI.FI Bridge',
    fromChainId: params.fromChainId,
    fromChainName,
    toChainId: params.toChainId,
    toChainName,
    fromToken: params.fromTokenAddress,
    fromTokenSymbol: 'TOKEN',
    toToken: params.toTokenAddress,
    toTokenSymbol: 'TOKEN',
    fromAmount: params.fromAmount,
    fromAmountFormatted: formatAmount(params.fromAmount, 6),
    toAmount: toAmountRaw,
    toAmountFormatted: formatAmount(toAmountRaw, 6),
    estimatedDurationSeconds: duration,
    fees: {
      gasCostUsd: '3.00',
      protocolFeeUsd: '1.50',
    },
    status: 'pending',
  }];

  return {
    routeId: `simulated_${Date.now()}`,
    fromChainId: params.fromChainId,
    fromChain: { chainId: params.fromChainId, name: fromChainName },
    toChainId: params.toChainId,
    toChain: { chainId: params.toChainId, name: toChainName },
    fromToken: params.fromTokenAddress,
    fromTokenInfo: {
      address: params.fromTokenAddress,
      symbol: 'TOKEN',
      decimals: 6,
    },
    toToken: params.toTokenAddress,
    toTokenInfo: {
      address: params.toTokenAddress,
      symbol: 'TOKEN',
      decimals: 6,
    },
    fromAmount: params.fromAmount,
    fromAmountFormatted: formatAmount(params.fromAmount, 6),
    fromAmountUsd: formatAmount(params.fromAmount, 6),
    toAmount: toAmountRaw,
    toAmountFormatted: formatAmount(toAmountRaw, 6),
    toAmountUsd: formatAmount(toAmountRaw, 6),
    toAmountMin,
    exchangeRate: '1.00',
    slippage: '0.5',
    estimatedDurationSeconds: duration,
    estimatedDurationFormatted: formatDuration(duration),
    fees: {
      gasCostNative: '0.002',
      gasCostUsd: '3.00',
      protocolFeeUsd: '1.50',
      totalFeeUsd: '4.50',
    },
    estimatedGas: '0.002',
    steps,
    tags: ['SIMULATED'],
  };
}
