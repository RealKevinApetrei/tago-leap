import { serverEnv } from '../env';
import type { SupportedOption, LifiRoute, RoutePreference, RouteAlternatives } from '@tago-leap/shared/types';

const LIFI_API = serverEnv.LIFI_API_BASE_URL;
const INTEGRATOR = serverEnv.LIFI_INTEGRATOR;

interface LifiChain {
  id: number;
  name: string;
  nativeToken: {
    address: string;
    symbol: string;
    decimals: number;
  };
}

interface LifiToken {
  address: string;
  symbol: string;
  decimals: number;
  name: string;
  priceUSD?: string;
  chainId: number;
}

export async function getSupportedOptions(): Promise<SupportedOption[]> {
  console.log(`[LifiClient] Getting supported options from ${LIFI_API}`);

  try {
    const chainsResponse = await fetch(`${LIFI_API}/chains`);
    if (!chainsResponse.ok) {
      throw new Error(`Failed to fetch chains: ${chainsResponse.status}`);
    }
    const chainsData = await chainsResponse.json() as { chains: LifiChain[] };

    const majorChainIds = [1, 42161, 10, 137, 56, 43114, 8453, 324, 999];
    const supportedChains = chainsData.chains.filter(c => majorChainIds.includes(c.id));

    const tokensResponse = await fetch(`${LIFI_API}/tokens?chains=${supportedChains.map(c => c.id).join(',')}`);
    if (!tokensResponse.ok) {
      throw new Error(`Failed to fetch tokens: ${tokensResponse.status}`);
    }
    const tokensData = await tokensResponse.json() as { tokens: Record<string, LifiToken[]> };

    const options: SupportedOption[] = supportedChains.map(chain => {
      const chainTokens = tokensData.tokens[chain.id.toString()] || [];
      const popularTokens = chainTokens
        .filter(t => t.priceUSD || ['ETH', 'WETH', 'USDC', 'USDT', 'DAI'].includes(t.symbol))
        .slice(0, 20);

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
    return getFallbackOptions();
  }
}

function getFallbackOptions(): SupportedOption[] {
  return [
    {
      chainId: 1,
      chainName: 'Ethereum',
      tokens: [
        { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH', decimals: 18 },
        { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', decimals: 6 },
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
      chainId: 999,
      chainName: 'HyperEVM',
      tokens: [
        { address: '0x0000000000000000000000000000000000000000', symbol: 'HYPE', decimals: 18 },
        { address: '0xb88339CB7199b77E23DB6E890353E22632Ba630f', symbol: 'USDC', decimals: 6 },
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
  preference?: RoutePreference;
}

export async function getRoutes(params: GetRoutesParams): Promise<RouteAlternatives> {
  const preference = params.preference || 'recommended';
  console.log(`[LifiClient] Getting routes (preference: ${preference})`);

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
      slippage: 0.005,
      order: preference === 'fastest' ? 'FASTEST' : preference === 'cheapest' ? 'CHEAPEST' : 'RECOMMENDED',
      allowSwitchChain: true,
    },
  };

  const response = await fetch(`${LIFI_API}/advanced/routes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`No routes available: ${response.status} - ${errorText}`);
  }

  const data = await response.json() as { routes: any[] };

  if (!data.routes || data.routes.length === 0) {
    throw new Error('No routes found for this swap');
  }

  // Simplified route mapping - pass through the raw route data
  const routes = data.routes.map((route: any, index: number) => ({
    routeId: route.id,
    fromChainId: route.fromChainId,
    toChainId: route.toChainId,
    fromToken: route.fromToken.address,
    toToken: route.toToken.address,
    fromAmount: route.fromAmount,
    toAmount: route.toAmount,
    toAmountMin: route.toAmountMin,
    steps: route.steps,
    tags: route.tags || [],
    // Pass through raw data for frontend to use
    raw: route,
  }));

  return {
    recommended: routes[0],
    alternatives: routes,
    preference,
    routeCount: routes.length,
  };
}
