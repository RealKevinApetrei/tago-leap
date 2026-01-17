import { serverEnv } from '../env';
import type { SupportedOption, LifiRoute, RoutePreference, RouteAlternatives } from '@tago-leap/shared/types';

const LIFI_API = serverEnv.LIFI_API_BASE_URL;
const INTEGRATOR = serverEnv.LIFI_INTEGRATOR;

// Helper functions
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

function getChainName(chainId: number): string {
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
  };
  return names[chainId] || `Chain ${chainId}`;
}

interface LifiChain {
  id: number;
  name: string;
  logoURI?: string;
  nativeToken: {
    address: string;
    symbol: string;
    decimals: number;
    logoURI?: string;
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
        chainLogoUri: chain.logoURI,
        tokens: popularTokens.map(t => ({
          address: t.address,
          symbol: t.symbol,
          decimals: t.decimals,
          logoUri: t.logoURI,
          priceUsd: t.priceUSD,
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
      chainLogoUri: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/ethereum.svg',
      tokens: [
        { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH', decimals: 18, logoUri: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png' },
        { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', decimals: 6, logoUri: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png' },
      ],
    },
    {
      chainId: 42161,
      chainName: 'Arbitrum',
      chainLogoUri: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/arbitrum.svg',
      tokens: [
        { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH', decimals: 18, logoUri: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png' },
        { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', symbol: 'USDC', decimals: 6, logoUri: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png' },
      ],
    },
    {
      chainId: 999,
      chainName: 'HyperEVM',
      chainLogoUri: 'https://app.hyperliquid.xyz/icons/hyperliquid.svg',
      tokens: [
        { address: '0x0000000000000000000000000000000000000000', symbol: 'HYPE', decimals: 18, logoUri: 'https://app.hyperliquid.xyz/icons/hyperliquid.svg' },
        { address: '0xb88339CB7199b77E23DB6E890353E22632Ba630f', symbol: 'USDC', decimals: 6, logoUri: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png' },
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

  // Map routes with fee information for frontend display
  const routes = data.routes.map((route: any) => {
    // Calculate fees from steps
    let totalGasCostUsd = 0;
    let totalProtocolFeeUsd = 0;
    let totalDurationSeconds = 0;

    const mappedSteps = (route.steps || []).map((step: any, stepIndex: number) => {
      const stepGasCost = step.estimate?.gasCosts?.reduce(
        (sum: number, gc: any) => sum + Number(gc.amountUSD || 0), 0
      ) || 0;
      const stepProtocolFee = step.estimate?.feeCosts?.reduce(
        (sum: number, fc: any) => sum + Number(fc.amountUSD || 0), 0
      ) || 0;

      totalGasCostUsd += stepGasCost;
      totalProtocolFeeUsd += stepProtocolFee;
      totalDurationSeconds += step.estimate?.executionDuration || 0;

      return {
        stepIndex: stepIndex + 1,
        type: step.type === 'cross' || step.type === 'lifi' ? 'bridge' : step.type,
        action: `${step.type === 'cross' ? 'Bridge' : 'Swap'} ${step.action?.fromToken?.symbol} to ${step.action?.toToken?.symbol} via ${step.toolDetails?.name}`,
        tool: step.tool,
        toolName: step.toolDetails?.name || step.tool,
        fromChainName: getChainName(step.action?.fromChainId),
        toChainName: getChainName(step.action?.toChainId),
        fromTokenSymbol: step.action?.fromToken?.symbol,
        toTokenSymbol: step.action?.toToken?.symbol,
        estimatedDurationSeconds: step.estimate?.executionDuration || 0,
        fees: {
          gasCostUsd: stepGasCost.toFixed(2),
          protocolFeeUsd: stepProtocolFee.toFixed(2),
        },
      };
    });

    // Format amounts
    const fromDecimals = route.fromToken?.decimals || 18;
    const toDecimals = route.toToken?.decimals || 6;
    const fromAmountFormatted = formatAmount(route.fromAmount, fromDecimals);
    const toAmountFormatted = formatAmount(route.toAmount, toDecimals);

    // Calculate USD values
    const fromPriceUsd = parseFloat(route.fromToken?.priceUSD || '1');
    const toPriceUsd = parseFloat(route.toToken?.priceUSD || '1');
    const fromAmountUsd = (parseFloat(fromAmountFormatted) * fromPriceUsd).toFixed(2);
    const toAmountUsd = (parseFloat(toAmountFormatted) * toPriceUsd).toFixed(2);

    // Calculate exchange rate
    const fromAmountNum = parseFloat(fromAmountFormatted);
    const toAmountNum = parseFloat(toAmountFormatted);
    const exchangeRate = fromAmountNum > 0 ? (toAmountNum / fromAmountNum).toFixed(6) : '1.000000';

    return {
      routeId: route.id,
      fromChainId: route.fromChainId,
      toChainId: route.toChainId,
      fromToken: route.fromToken?.address,
      fromTokenInfo: route.fromToken,
      toToken: route.toToken?.address,
      toTokenInfo: route.toToken,
      fromAmount: route.fromAmount,
      fromAmountFormatted,
      fromAmountUsd,
      toAmount: route.toAmount,
      toAmountFormatted,
      toAmountUsd,
      toAmountMin: route.toAmountMin,
      exchangeRate,
      estimatedDurationSeconds: totalDurationSeconds,
      estimatedDurationFormatted: formatDuration(totalDurationSeconds),
      fees: {
        gasCostUsd: totalGasCostUsd.toFixed(2),
        protocolFeeUsd: totalProtocolFeeUsd.toFixed(2),
        totalFeeUsd: (totalGasCostUsd + totalProtocolFeeUsd).toFixed(2),
      },
      steps: mappedSteps,
      tags: route.tags || [],
      // Pass through raw data for frontend SDK execution
      raw: route,
    };
  });

  return {
    recommended: routes[0],
    alternatives: routes,
    preference,
    routeCount: routes.length,
  };
}
