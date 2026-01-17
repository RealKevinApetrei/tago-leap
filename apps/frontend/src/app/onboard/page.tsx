'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAccount, useWalletClient, useSwitchChain, usePublicClient } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { formatUnits, parseUnits, encodeFunctionData } from 'viem';
import { SwapPanel, SwapField, SwapDivider } from '@/components/ui/SwapPanel';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { lifiApi, ApiError } from '@/lib/api';
import { TradeErrorDisplay, parseApiErrorToTradeError } from '@/components/TradeErrorDisplay';
import type { TradeError } from '@tago-leap/shared/types';
import type { RouteExtended } from '@lifi/sdk';
import type { WalletClient } from 'viem';

// LI.FI SDK module reference
let lifiSdk: typeof import('@lifi/sdk') | null = null;

async function getLifiSdk() {
  if (!lifiSdk) {
    lifiSdk = await import('@lifi/sdk');
  }
  return lifiSdk;
}

// Configure LI.FI SDK with wallet provider
async function configureLifiWithWallet(
  switchChain: (chainId: number) => Promise<void>
) {
  const sdk = await getLifiSdk();
  const { createWalletClient, custom } = await import('viem');

  // Helper to get fresh wallet client from window.ethereum
  const getWalletClientForChain = async (chainId?: number) => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) throw new Error('No wallet provider found');

    const accounts = await ethereum.request({ method: 'eth_accounts' });
    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts connected');
    }

    // Get current chain if not specified
    const currentChainHex = await ethereum.request({ method: 'eth_chainId' });
    const currentChainId = chainId || parseInt(currentChainHex, 16);

    return createWalletClient({
      account: accounts[0] as `0x${string}`,
      chain: { id: currentChainId } as any,
      transport: custom(ethereum),
    });
  };

  sdk.createConfig({
    integrator: 'tago-leap',
    apiKey: process.env.NEXT_PUBLIC_LIFI_API_KEY,
    providers: [
      sdk.EVM({
        getWalletClient: async () => getWalletClientForChain(),
        switchChain: async (chainId) => {
          await switchChain(chainId);
          // Wait a moment for the chain switch to complete
          await new Promise(resolve => setTimeout(resolve, 500));
          // Return fresh wallet client for the new chain
          return getWalletClientForChain(chainId);
        },
      }),
    ],
  });
}

interface ChainOption {
  chainId: number;
  chainName: string;
  tokens: {
    address: string;
    symbol: string;
    decimals: number;
  }[];
}

interface RouteStep {
  stepIndex: number;
  type: string;
  action: string;
  tool: string;
  toolName: string;
  fromChainName: string;
  toChainName: string;
  fromTokenSymbol: string;
  toTokenSymbol: string;
  estimatedDurationSeconds: number;
  fees: {
    gasCostUsd: string;
    protocolFeeUsd: string;
  };
  status?: 'pending' | 'in_progress' | 'completed' | 'failed';
}

interface QuoteResponse {
  id: string;
  status: string | null;
  recommended: {
    routeId: string;
    fromAmountFormatted: string;
    fromAmountUsd: string;
    toAmountFormatted: string;
    toAmountUsd: string;
    estimatedDurationSeconds: number;
    estimatedDurationFormatted: string;
    exchangeRate: string;
    fees: {
      gasCostUsd: string;
      protocolFeeUsd: string;
      totalFeeUsd: string;
    };
    steps: RouteStep[];
    tags?: string[];
  };
  alternatives: any[];
  routeCount: number;
  saltWalletAddress?: string;
}

type FlowStatus = 'idle' | 'quoting' | 'approving' | 'swapping' | 'bridging' | 'depositing' | 'completed' | 'failed';

// Arbitrum chain ID and contract addresses
const ARBITRUM_CHAIN_ID = 42161;
const ARBITRUM_USDC = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

// Hyperliquid Bridge2 contract on Arbitrum - deposits directly to Perp
const HYPERLIQUID_BRIDGE = '0x2Df1c51E09aECF9cacB7bc98cB1742757f163dF7';

// ERC20 ABI with permit support
const ERC20_PERMIT_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'nonces',
    type: 'function',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'name',
    type: 'function',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'approve',
    type: 'function',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
] as const;

// Hyperliquid Bridge2 ABI
const BRIDGE2_ABI = [
  {
    name: 'batchedDepositWithPermit',
    type: 'function',
    inputs: [
      {
        name: 'deposits',
        type: 'tuple[]',
        components: [
          { name: 'user', type: 'address' },
          { name: 'usd', type: 'uint64' },
          { name: 'deadline', type: 'uint64' },
          { name: 'signature', type: 'tuple', components: [
            { name: 'r', type: 'bytes32' },
            { name: 's', type: 'bytes32' },
            { name: 'v', type: 'uint8' },
          ]},
        ],
      },
    ],
    outputs: [],
  },
] as const;


export default function OnboardPage() {
  const searchParams = useSearchParams();
  const { address, isConnected, chainId: currentChainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { switchChainAsync } = useSwitchChain();

  const [options, setOptions] = useState<ChainOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [error, setError] = useState<Partial<TradeError> & { message: string } | null>(null);
  const [success, setSuccess] = useState(false);

  // Test mode - skips LI.FI execution and simulates the flow
  const [testMode, setTestMode] = useState(false);

  // Form state
  const [fromChain, setFromChain] = useState('');
  const [fromToken, setFromToken] = useState('');
  const [amount, setAmount] = useState('');

  // Salt wallet state
  const [saltWallet, setSaltWallet] = useState<{ saltWalletAddress: string; exists: boolean } | null>(null);
  const [saltLoading, setSaltLoading] = useState(false);

  // Flow status and progress
  const [flowStatus, setFlowStatus] = useState<FlowStatus>('idle');
  const [stepStatuses, setStepStatuses] = useState<Record<number, 'pending' | 'in_progress' | 'completed' | 'failed'>>({});
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [lifiRoute, setLifiRoute] = useState<RouteExtended | null>(null);

  // Token balances state
  const [tokenBalances, setTokenBalances] = useState<Record<string, string>>({});
  const [balancesLoading, setBalancesLoading] = useState(false);

  // Advanced mode with transaction log
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [txLog, setTxLog] = useState<{ time: string; message: string; type: 'info' | 'success' | 'error' | 'warn' }[]>([]);

  // Helper to add log entry
  const addLog = useCallback((message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') => {
    const time = new Date().toLocaleTimeString();
    setTxLog(prev => [...prev, { time, message, type }]);
    console.log(`[${type.toUpperCase()}] ${message}`);
  }, []);

  // Use connected wallet address
  const walletAddress = address || '';

  // Load options on mount
  useEffect(() => {
    async function loadOptions() {
      setLoading(true);
      console.log('[INIT] Loading chain options...');
      try {
        const data = await lifiApi.getOptions();
        console.log('[INIT] Loaded', data.length, 'chains');
        setOptions(data);
        if (data.length > 0) {
          // Default to Arbitrum if available
          const arbitrum = data.find(o => o.chainId === 42161);
          const defaultChain = arbitrum || data[0];
          setFromChain(String(defaultChain.chainId));
          if (defaultChain.tokens.length > 0) {
            // Default to USDC if available
            const usdc = defaultChain.tokens.find((t: { symbol: string }) => t.symbol === 'USDC');
            setFromToken(usdc?.address || defaultChain.tokens[0].address);
          }
        }
      } catch (err: any) {
        console.error('[INIT] Failed to load options:', err);
        // Add to transaction log so user can see what happened
        const errorMsg = err.message || 'Failed to load chain options';
        setTxLog(prev => [...prev, {
          time: new Date().toLocaleTimeString(),
          message: `[INIT ERROR] ${errorMsg}`,
          type: 'error'
        }]);
        if (err instanceof ApiError && err.tradeError) {
          setError(err.tradeError);
        } else {
          setError(parseApiErrorToTradeError(err));
        }
      } finally {
        setLoading(false);
      }
    }
    loadOptions();
  }, []);

  // Check salt wallet when address changes (debounced)
  const checkSaltWallet = useCallback(async (addr: string) => {
    if (!addr || addr.length < 42) {
      setSaltWallet(null);
      return;
    }

    setSaltLoading(true);
    try {
      const data = await lifiApi.getSaltWallet(addr);
      setSaltWallet(data);
    } catch (err) {
      console.error('Failed to check salt wallet:', err);
      setSaltWallet(null);
    } finally {
      setSaltLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      checkSaltWallet(walletAddress);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [walletAddress, checkSaltWallet]);

  // Fetch token balances directly from chain using viem
  const fetchTokenBalances = useCallback(async () => {
    console.log(`[Balances] fetchTokenBalances called. walletAddress: ${walletAddress}, fromChain: ${fromChain}, options.length: ${options.length}`);
    if (!walletAddress || !fromChain || options.length === 0) {
      console.log('[Balances] Early return - missing data');
      setTokenBalances({});
      return;
    }

    const chainId = parseInt(fromChain);
    const chain = options.find(o => o.chainId === chainId);
    if (!chain || chain.tokens.length === 0) {
      console.log('[Balances] No chain found or no tokens for chain', chainId);
      setTokenBalances({});
      return;
    }

    setBalancesLoading(true);
    console.log(`[Balances] ========================================`);
    console.log(`[Balances] Fetching balances for connected wallet: ${walletAddress}`);
    console.log(`[Balances] Chain: ${chain.chainName} (${chainId}), Tokens: ${chain.tokens.length}`);
    console.log(`[Balances] Token list:`, chain.tokens.map(t => `${t.symbol}: ${t.address}`));

    try {
      // Use direct RPC calls via viem to fetch balances from user's wallet
      const { createPublicClient, http } = await import('viem');
      const { mainnet, arbitrum, optimism, polygon, base, bsc, avalanche } = await import('viem/chains');

      // Map chain IDs to viem chains
      const chainMap: Record<number, any> = {
        1: mainnet,
        42161: arbitrum,
        10: optimism,
        137: polygon,
        8453: base,
        56: bsc,
        43114: avalanche,
      };

      const viemChain = chainMap[chainId];
      if (!viemChain) {
        console.log('[Balances] Chain not supported for direct balance fetch, trying LI.FI SDK');
        // Fallback to LI.FI SDK for unsupported chains
        const sdk = await getLifiSdk();
        const tokens = chain.tokens.map(t => ({
          address: t.address as `0x${string}`,
          chainId,
          symbol: t.symbol,
          decimals: t.decimals,
          name: t.symbol,
          priceUSD: '0',
        }));
        const balances = await sdk.getTokenBalances(walletAddress as `0x${string}`, tokens);
        const balanceMap: Record<string, string> = {};
        balances.forEach(token => {
          const addressKey = token.address.toLowerCase();
          if (token.amount && BigInt(token.amount) > 0n) {
            const formatted = formatUnits(BigInt(token.amount), token.decimals);
            const num = parseFloat(formatted);
            balanceMap[addressKey] = num < 0.01 ? num.toFixed(6) : num.toFixed(4);
          } else {
            balanceMap[addressKey] = '0';
          }
        });
        setTokenBalances(balanceMap);
        return;
      }

      const publicClient = createPublicClient({
        chain: viemChain,
        transport: http(),
      });

      const balanceMap: Record<string, string> = {};
      const NATIVE_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000';

      // Fetch balances for each token
      for (const token of chain.tokens) {
        try {
          const addressKey = token.address.toLowerCase();

          if (token.address === NATIVE_TOKEN_ADDRESS || token.address.toLowerCase() === NATIVE_TOKEN_ADDRESS) {
            // Native token (ETH, MATIC, etc.) - use getBalance
            const balance = await publicClient.getBalance({ address: walletAddress as `0x${string}` });
            if (balance > 0n) {
              const formatted = formatUnits(balance, token.decimals);
              const num = parseFloat(formatted);
              balanceMap[addressKey] = num < 0.01 ? num.toFixed(6) : num.toFixed(4);
              console.log(`[Balances] ✓ ${token.symbol} (native): ${balanceMap[addressKey]}`);
            } else {
              balanceMap[addressKey] = '0';
            }
          } else {
            // ERC20 token - use balanceOf
            const balance = await publicClient.readContract({
              address: token.address as `0x${string}`,
              abi: ERC20_PERMIT_ABI,
              functionName: 'balanceOf',
              args: [walletAddress as `0x${string}`],
            }) as bigint;

            if (balance > 0n) {
              const formatted = formatUnits(balance, token.decimals);
              const num = parseFloat(formatted);
              balanceMap[addressKey] = num < 0.01 ? num.toFixed(6) : num.toFixed(4);
              console.log(`[Balances] ✓ ${token.symbol} (${addressKey}): ${balanceMap[addressKey]}`);
            } else {
              balanceMap[addressKey] = '0';
            }
          }
        } catch (tokenErr) {
          console.error(`[Balances] Failed to fetch ${token.symbol}:`, tokenErr);
          balanceMap[token.address.toLowerCase()] = '0';
        }
      }

      console.log('[Balances] Final balance map:', balanceMap);
      setTokenBalances(balanceMap);
    } catch (err) {
      console.error('[Balances] Failed to fetch token balances:', err);
      setTokenBalances({});
    } finally {
      setBalancesLoading(false);
    }
  }, [walletAddress, fromChain, options]);

  useEffect(() => {
    fetchTokenBalances();
  }, [fetchTokenBalances]);

  const selectedChain = options.find((o) => String(o.chainId) === fromChain);
  const selectedToken = selectedChain?.tokens.find((t) => t.address === fromToken);

  // Get balance for selected token
  const selectedTokenBalance = selectedToken
    ? tokenBalances[selectedToken.address.toLowerCase()] || '0'
    : '0';

  // Debug logging for balance lookup
  useEffect(() => {
    if (selectedToken) {
      console.log(`[Balance Debug] Selected token: ${selectedToken.symbol} (${selectedToken.address})`);
      console.log(`[Balance Debug] Lookup key: ${selectedToken.address.toLowerCase()}`);
      console.log(`[Balance Debug] Token balances keys:`, Object.keys(tokenBalances));
      console.log(`[Balance Debug] Found balance: ${tokenBalances[selectedToken.address.toLowerCase()]}`);
      console.log(`[Balance Debug] Displayed balance: ${selectedTokenBalance}`);
    }
  }, [selectedToken, tokenBalances, selectedTokenBalance]);

  // Parse amount to smallest unit
  const parseAmount = (value: string, decimals: number): string => {
    if (!value) return '0';
    const parts = value.split('.');
    const wholePart = parts[0] || '0';
    const decPart = (parts[1] || '').padEnd(decimals, '0').slice(0, decimals);
    return BigInt(wholePart + decPart).toString();
  };

  // Helper to retry with backoff for rate limits
  const retryWithBackoff = async <T,>(
    fn: () => Promise<T>,
    maxRetries = 3,
    initialDelay = 5000
  ): Promise<T> => {
    let lastError: Error | null = null;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (err: any) {
        lastError = err;
        const isRateLimit = err?.message?.includes('429') || err?.message?.includes('rate limit');
        if (isRateLimit && i < maxRetries - 1) {
          const delay = initialDelay * Math.pow(2, i);
          console.log(`Rate limited, retrying in ${delay / 1000}s...`);
          setError({ message: `Rate limited. Retrying in ${Math.ceil(delay / 1000)} seconds...` });
          await new Promise(resolve => setTimeout(resolve, delay));
          setError(null);
        } else {
          throw err;
        }
      }
    }
    throw lastError;
  };

  // ERC20 transfer ABI
  const ERC20_TRANSFER_ABI = [
    {
      name: 'transfer',
      type: 'function',
      inputs: [
        { name: 'to', type: 'address' },
        { name: 'amount', type: 'uint256' },
      ],
      outputs: [{ type: 'bool' }],
    },
  ] as const;

  // Deposit USDC to Hyperliquid L1 via simple transfer to Bridge2
  // Per Hyperliquid docs: "The user sends native USDC to the bridge,
  // and it is credited to the account that sent it in less than 1 minute"
  const depositToHyperliquidL1 = async (log: (msg: string, type: 'info' | 'success' | 'error' | 'warn') => void) => {
    if (!walletClient || !address) {
      throw new Error('Wallet not connected');
    }

    // Ensure we're on Arbitrum
    const ethereum = (window as any).ethereum;
    if (ethereum) {
      const currentChainHex = await ethereum.request({ method: 'eth_chainId' });
      const currentChainId = parseInt(currentChainHex, 16);
      if (currentChainId !== ARBITRUM_CHAIN_ID) {
        log('Switching to Arbitrum...', 'info');
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${ARBITRUM_CHAIN_ID.toString(16)}` }],
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Get the deposit amount from the quote
    const depositAmountFormatted = quote?.recommended?.toAmountFormatted || amount || '0';
    const depositAmount = parseUnits(depositAmountFormatted, 6); // USDC has 6 decimals

    if (depositAmount <= 0n) {
      throw new Error('Invalid deposit amount');
    }

    // Hyperliquid minimum deposit is 5 USDC - amounts below this are LOST FOREVER
    const MIN_DEPOSIT = 5000000n; // 5 USDC in 6 decimals
    if (depositAmount < MIN_DEPOSIT) {
      throw new Error(`Hyperliquid requires minimum 5 USDC deposit. You're trying to deposit ${depositAmountFormatted} USDC. Amounts below 5 USDC are lost forever!`);
    }

    log(`Deposit amount: ${depositAmountFormatted} USDC`, 'info');

    // Create public client for reading contract state
    const { createPublicClient, http } = await import('viem');
    const { arbitrum } = await import('viem/chains');
    const publicClient = createPublicClient({
      chain: arbitrum,
      transport: http(),
    });

    // Check USDC balance
    const balance = await publicClient.readContract({
      address: ARBITRUM_USDC as `0x${string}`,
      abi: ERC20_PERMIT_ABI,
      functionName: 'balanceOf',
      args: [address],
    }) as bigint;

    log(`USDC balance: ${formatUnits(balance, 6)}`, 'info');

    if (balance < depositAmount) {
      throw new Error(`Insufficient USDC balance. Have: ${formatUnits(balance, 6)}, Need: ${depositAmountFormatted}`);
    }

    // Simple approach: Transfer USDC directly to the Hyperliquid Bridge
    // The bridge automatically credits your Hyperliquid account
    log('Transferring USDC to Hyperliquid Bridge...', 'info');

    const transferData = encodeFunctionData({
      abi: ERC20_TRANSFER_ABI,
      functionName: 'transfer',
      args: [HYPERLIQUID_BRIDGE as `0x${string}`, depositAmount],
    });

    const depositTxHash = await walletClient.sendTransaction({
      to: ARBITRUM_USDC as `0x${string}`,
      data: transferData,
      chain: { id: ARBITRUM_CHAIN_ID } as any,
    });

    log(`Deposit tx: ${depositTxHash}`, 'info');
    setTxHash(depositTxHash);

    // Wait for deposit to confirm
    await publicClient.waitForTransactionReceipt({ hash: depositTxHash });
    log('USDC transfer to Hyperliquid Bridge confirmed!', 'success');
    log('Note: Funds will appear in your Perp account within ~1 minute', 'info');
  };

  const handleGetQuote = async () => {
    if (!walletAddress || !fromChain || !fromToken || !amount || !selectedToken) {
      return;
    }

    // Validate amount is a positive number
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError({ message: 'Please enter a valid positive amount' });
      return;
    }

    // Clear log and add quote fetching logs
    setTxLog([]);
    addLog('=== Fetching Quote ===', 'info');
    addLog(`Chain: ${selectedChain?.chainName || fromChain}`, 'info');
    addLog(`Token: ${selectedToken.symbol}`, 'info');
    addLog(`Amount: ${amount}`, 'info');

    setQuoting(true);
    setError(null);
    setQuote(null);
    setLifiRoute(null);
    setFlowStatus('quoting');

    try {
      const parsedAmount = parseAmount(amount, selectedToken.decimals);
      addLog(`Parsed amount: ${parsedAmount}`, 'info');

      addLog('Calling LI.FI API for quote...', 'info');

      // If already on Arbitrum with USDC, skip LI.FI quote
      const sourceChainId = parseInt(fromChain);
      const isArbitrumUsdc = sourceChainId === ARBITRUM_CHAIN_ID &&
        fromToken.toLowerCase() === ARBITRUM_USDC.toLowerCase();

      let result;
      if (isArbitrumUsdc) {
        // No bridge needed - deposit directly to Hyperliquid
        addLog('Already on Arbitrum with USDC - direct deposit available', 'success');
        result = {
          id: `direct-${Date.now()}`,
          recommended: {
            routeId: 'direct',
            fromAmountFormatted: amount,
            toAmountFormatted: amount,
            toAmountUsd: amount,
            estimatedDurationSeconds: 60,
            estimatedDurationFormatted: '~1 minute',
            exchangeRate: '1.0',
            fees: { gasCostUsd: '0', protocolFeeUsd: '0', totalFeeUsd: '0' },
            steps: [],
            tags: ['DIRECT'],
          },
          alternatives: [],
          routeCount: 1,
          rawRoute: null, // No LI.FI route needed
        };
      } else {
        // Bridge to Arbitrum USDC via LI.FI
        result = await retryWithBackoff(() =>
          lifiApi.getQuote({
            userWalletAddress: walletAddress,
            fromChainId: sourceChainId,
            fromTokenAddress: fromToken,
            amount: parsedAmount,
            toTokenAddress: ARBITRUM_USDC,
            toChainId: ARBITRUM_CHAIN_ID,
          })
        );
      }

      addLog('Quote received!', 'success');
      addLog(`Route ID: ${result.recommended?.routeId || 'N/A'}`, 'info');
      addLog(`Direct deposit: ${isArbitrumUsdc ? 'Yes' : 'No'}`, 'info');

      if (!isArbitrumUsdc && !result.rawRoute) {
        addLog('ERROR: No raw route in response', 'error');
        throw new Error('No routes available for this swap');
      }

      // Use the raw route from backend for SDK execution (null for direct deposits)
      setLifiRoute(result.rawRoute || null);
      setQuote(result);
      setFlowStatus('idle');
      addLog('Quote ready! Click Bridge to continue.', 'success');

      // Initialize step statuses
      if (result.recommended?.steps) {
        const initialStatuses: Record<number, 'pending'> = {};
        result.recommended.steps.forEach((_: unknown, i: number) => {
          initialStatuses[i] = 'pending';
        });
        setStepStatuses(initialStatuses);
      }
    } catch (err: any) {
      console.error('Failed to get quote:', err);
      addLog(`ERROR: ${err.message || 'Failed to get quote'}`, 'error');
      if (err instanceof ApiError && err.tradeError) {
        setError(err.tradeError);
      } else {
        setError(parseApiErrorToTradeError(err));
      }
      setFlowStatus('failed');
    } finally {
      setQuoting(false);
    }
  };

  const handleExecuteSwap = async () => {
    // Clear previous log and start fresh
    setTxLog([]);

    addLog('=== Starting Execution ===', 'info');
    addLog(`Mode: ${testMode ? 'TEST' : 'LIVE'}`, 'info');
    addLog(`Wallet connected: ${walletClient ? 'Yes' : 'No'}`, 'info');
    addLog(`Quote exists: ${quote ? 'Yes' : 'No'}`, 'info');
    addLog(`LI.FI route exists: ${lifiRoute ? 'Yes' : 'No'}`, 'info');

    if (!quote || !walletClient) {
      addLog('ERROR: Missing quote or wallet connection', 'error');
      setError({ message: 'Missing quote or wallet connection' });
      return;
    }

    // Check if this is a direct deposit (already on Arbitrum with USDC)
    const isDirectDeposit = quote.recommended?.routeId === 'direct' ||
                            quote.recommended?.tags?.includes('DIRECT');

    // In live mode, we need the lifiRoute UNLESS it's a direct deposit
    if (!testMode && !lifiRoute && !isDirectDeposit) {
      addLog('ERROR: Missing route data for live swap', 'error');
      setError({ message: 'Missing route data for live swap' });
      return;
    }

    addLog(`Direct deposit mode: ${isDirectDeposit ? 'Yes' : 'No'}`, 'info');

    setLoading(true);
    setError(null);
    setFlowStatus('swapping');
    setCurrentStepIndex(0);

    addLog(`From: ${selectedChain?.chainName || fromChain} | Amount: ${amount} ${selectedToken?.symbol || ''}`, 'info');

    try {
      // Both TEST and LIVE mode execute the full flow
      // TEST mode just adds extra logging for debugging

      if (testMode) {
        addLog('[TEST MODE] Executing full flow with extra logging...', 'info');
      }

      addLog(`Quote ID: ${quote.id}`, 'info');
      addLog(`Has LI.FI route: ${lifiRoute ? 'Yes' : 'No'}`, 'info');

      // Step 1: Execute LI.FI bridge (if we have a route)
      if (lifiRoute) {
        addLog(`Route steps: ${lifiRoute.steps?.length || 0}`, 'info');
        addLog('Configuring LI.FI SDK...', 'info');
        // Configure LI.FI SDK with wallet provider - allow chain switching
        await configureLifiWithWallet(async (chainId) => {
          addLog(`Switching to chain ${chainId}...`, 'info');
          await switchChainAsync({ chainId: chainId as any });
        });

        // Execute the route using LI.FI SDK
        addLog('Executing LI.FI bridge route...', 'info');
        const sdk = await getLifiSdk();

        try {
          await sdk.executeRoute(lifiRoute!, {
            updateRouteHook: (updatedRoute) => {
              setLifiRoute(updatedRoute);

              // Update step statuses based on route execution
              const newStatuses = { ...stepStatuses };
              updatedRoute.steps.forEach((step, index) => {
                if (step.execution?.status === 'DONE') {
                  newStatuses[index] = 'completed';
                  addLog(`Step ${index + 1} completed: ${step.tool}`, 'success');
                } else if (step.execution?.status === 'PENDING') {
                  newStatuses[index] = 'in_progress';
                  setCurrentStepIndex(index);
                  addLog(`Step ${index + 1} in progress: ${step.tool}...`, 'info');
                } else if (step.execution?.status === 'FAILED') {
                  newStatuses[index] = 'failed';
                  addLog(`Step ${index + 1} failed: ${step.tool}`, 'error');
                }
              });
              setStepStatuses(newStatuses);

              // Update flow status
              const allCompleted = updatedRoute.steps.every(s => s.execution?.status === 'DONE');
              if (allCompleted) {
                addLog('LI.FI bridge completed!', 'success');
              }
            },
            acceptExchangeRateUpdateHook: async () => true,
          });
        } catch (lifiErr: any) {
          const lifiErrorMsg = lifiErr.message || 'LI.FI execution failed';
          addLog(`LI.FI Error: ${lifiErrorMsg}`, 'error');
          throw new Error(`Bridge failed: ${lifiErrorMsg}`);
        }

        // Track the transaction with our service (non-blocking)
        if (quote.id && txHash) {
          try {
            await lifiApi.trackOnboarding({
              flowId: quote.id,
              txHashes: [txHash],
            });
          } catch (trackErr) {
            addLog('Warning: Could not track transaction (non-critical)', 'warn');
          }
        }
      } else {
        // No LI.FI route - skip bridge step
        addLog('No bridge route - skipping to deposit step', 'info');
      }

      // Deposit to L1 (both test and live mode)
      setFlowStatus('depositing');
      addLog('Proceeding to deposit to Hyperliquid L1...', 'info');
      await new Promise(resolve => setTimeout(resolve, testMode ? 500 : 3000));
      await depositToHyperliquidL1(addLog);

      // Switch back to the selected source chain
      const selectedChainId = parseInt(fromChain);
      if (selectedChainId) {
        addLog(`Switching back to ${selectedChain?.chainName || 'selected chain'}...`, 'info');
        const ethereum = (window as any).ethereum;
        if (ethereum) {
          try {
            const currentHex = await ethereum.request({ method: 'eth_chainId' });
            const currentId = parseInt(currentHex, 16);
            if (currentId !== selectedChainId) {
              await ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: `0x${selectedChainId.toString(16)}` }],
              });
              addLog(`Switched back to ${selectedChain?.chainName || 'selected chain'}`, 'success');
            }
          } catch (err) {
            addLog('Could not switch back to selected chain', 'warn');
          }
        }
      }

      addLog('All operations completed successfully!', 'success');
      setSuccess(true);
      setFlowStatus('completed');

      // Mark all steps as completed
      const completedStatuses: Record<number, 'completed'> = {};
      Object.keys(stepStatuses).forEach(key => {
        completedStatuses[parseInt(key)] = 'completed';
      });
      setStepStatuses(completedStatuses);

    } catch (err: any) {
      const errorMsg = err.message || 'Operation failed';
      addLog(`Error: ${errorMsg}`, 'error');
      setError({ message: errorMsg });
      setFlowStatus('failed');

      // Mark current step as failed
      setStepStatuses(prev => ({
        ...prev,
        [currentStepIndex]: 'failed',
      }));
    } finally {
      setLoading(false);
    }
  };

  // Alias for handleExecuteSwap for clarity in UI context
  const handleDeposit = handleExecuteSwap;

  const handleRetry = () => {
    setError(null);
    setFlowStatus('idle');
    if (quote) {
      handleExecuteSwap();
    } else {
      handleGetQuote();
    }
  };

  const resetFlow = () => {
    setQuote(null);
    setLifiRoute(null);
    setError(null);
    setSuccess(false);
    setFlowStatus('idle');
    setStepStatuses({});
    setCurrentStepIndex(0);
    setTxHash(null);
  };

  // Get status icon for a step
  const getStepStatusIcon = (status: 'pending' | 'in_progress' | 'completed' | 'failed') => {
    switch (status) {
      case 'completed':
        return (
          <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
            <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'in_progress':
        return (
          <div className="w-6 h-6 rounded-full bg-tago-yellow-400/20 flex items-center justify-center animate-pulse">
            <div className="w-2 h-2 rounded-full bg-tago-yellow-400" />
          </div>
        );
      case 'failed':
        return (
          <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
            <span className="text-xs text-white/40">{}</span>
          </div>
        );
    }
  };

  // If not connected, show connect prompt
  if (!isConnected) {
    return (
      <div className="space-y-6">
        <SwapPanel title="Deposit to Hyperliquid" subtitle="Bridge assets from any chain">
          <div className="bg-white/[0.03] rounded-xl p-6 border border-white/[0.08] text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-tago-yellow-400/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-tago-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-medium mb-1">Connect Your Wallet</h3>
              <p className="text-sm text-white/50 font-light">
                Connect your wallet to bridge assets directly to your Hyperliquid perp account.
              </p>
            </div>
            <ConnectButton />
          </div>
        </SwapPanel>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connected wallet header */}
      <Card>
        <div className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-white/40 font-light">Connected Wallet</span>
            <p className="text-sm text-white font-mono">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</p>
          </div>
          <ConnectButton.Custom>
            {({ openAccountModal }) => (
              <button onClick={openAccountModal} className="text-xs text-white/40 hover:text-white">
                Change
              </button>
            )}
          </ConnectButton.Custom>
        </div>
      </Card>

      {/* Mode Toggle */}
      <Card>
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-white font-medium">Mode</span>
              <p className="text-xs text-white/40 mt-0.5">
                {testMode ? 'Test mode: full flow with extra logging' : 'Live mode: full bridge flow'}
              </p>
            </div>
            <button
              onClick={() => setTestMode(!testMode)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                testMode ? 'bg-tago-yellow-400' : 'bg-white/20'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  testMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={testMode ? 'yellow' : 'info'}>
              {testMode ? 'TEST' : 'LIVE'}
            </Badge>
            <span className="text-xs text-white/40">
              Bridge → Arbitrum → Hyperliquid Spot → Perp (automatic)
            </span>
          </div>
        </div>
      </Card>

      {/* Advanced Toggle with Transaction Log */}
      <Card>
        <div className="p-4">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between text-left"
          >
            <span className="text-sm text-white/60 font-medium">Advanced</span>
            <svg
              className={`w-4 h-4 text-white/40 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showAdvanced && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">Transaction Log</span>
                {txLog.length > 0 && (
                  <button
                    onClick={() => setTxLog([])}
                    className="text-xs text-white/30 hover:text-white/50"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="bg-black/30 rounded-lg p-3 max-h-48 overflow-y-auto font-mono text-xs space-y-1">
                {txLog.length === 0 ? (
                  <p className="text-white/30">No transactions yet. Execute a swap or deposit to see logs.</p>
                ) : (
                  txLog.map((entry, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-white/30 flex-shrink-0">[{entry.time}]</span>
                      <span className={
                        entry.type === 'success' ? 'text-green-400' :
                        entry.type === 'error' ? 'text-red-400' :
                        entry.type === 'warn' ? 'text-yellow-400' :
                        'text-white/60'
                      }>
                        {entry.message}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Salt wallet info */}
      {saltWallet && (
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-white/40 font-light">Salt Wallet (Hyperliquid)</span>
                <p className="text-sm text-tago-yellow-400 font-mono">{saltWallet.saltWalletAddress.slice(0, 10)}...{saltWallet.saltWalletAddress.slice(-8)}</p>
              </div>
              <Badge variant="success">Active</Badge>
            </div>
          </div>
        </Card>
      )}

      {/* Success message */}
      {success && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm text-green-400 font-medium">Deposit to Hyperliquid Perp completed!</p>
              <p className="text-xs text-green-400/60 mt-0.5">
                Your USDC is now in your Perp account. Ready to trade!
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href="https://app.hyperliquid.xyz/trade"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-tago-yellow-400 text-black text-xs font-medium rounded-lg hover:bg-tago-yellow-300 transition-colors"
            >
              Start Trading
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            <a
              href="https://app.hyperliquid.xyz/portfolio"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/10 text-white text-xs font-medium rounded-lg hover:bg-white/20 transition-colors"
            >
              View Portfolio
            </a>
            <Button variant="ghost" size="sm" onClick={resetFlow}>
              New Deposit
            </Button>
          </div>
        </div>
      )}

      <SwapPanel
        title="Deposit to Hyperliquid"
        subtitle="Bridge assets directly to your Hyperliquid perp account"
      >
        {/* Destination indicator */}
        <div className="bg-white/[0.02] rounded-lg p-3 border border-white/[0.05] flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-tago-yellow-400/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-tago-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white font-medium">Hyperliquid Perp Account</p>
            <p className="text-xs text-white/40 truncate">
              Funds will be available for perpetual trading at {walletAddress.slice(0, 10)}...
            </p>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <TradeErrorDisplay
            error={error}
            onRetry={handleRetry}
            onDismiss={() => setError(null)}
          />
        )}

        {/* From Chain */}
        <Select
          label="From Chain"
          value={fromChain}
          onChange={(e) => {
            setFromChain(e.target.value);
            const chain = options.find((o) => String(o.chainId) === e.target.value);
            if (chain?.tokens.length) {
              const usdc = chain.tokens.find(t => t.symbol === 'USDC');
              setFromToken(usdc?.address || chain.tokens[0].address);
            }
            resetFlow();
          }}
          options={options.map((o) => ({
            label: o.chainName,
            value: String(o.chainId),
          }))}
          placeholder={loading ? 'Loading chains...' : 'Select chain'}
          disabled={loading || flowStatus !== 'idle'}
        />

        {/* Supported Chains Info */}
        {options.length > 0 && (
          <div className="text-xs text-white/40 font-light">
            {options.length} chains supported via LI.FI
          </div>
        )}

        {/* From Token */}
        {selectedChain && (
          <Select
            label={balancesLoading ? "Token (loading balances...)" : "Token"}
            value={fromToken}
            onChange={(e) => {
              setFromToken(e.target.value);
              resetFlow();
            }}
            options={selectedChain.tokens.map((t) => {
              const balance = tokenBalances[t.address.toLowerCase()] || '0';
              const hasBalance = parseFloat(balance) > 0;
              return {
                label: hasBalance ? `${t.symbol} (${balance})` : t.symbol,
                value: t.address,
              };
            })}
            placeholder="Select token"
            disabled={flowStatus !== 'idle'}
          />
        )}

        {/* Selected token balance display - shows user's wallet balance */}
        {selectedToken && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/40">
              Your Balance: {balancesLoading ? 'Loading...' : `${selectedTokenBalance} ${selectedToken.symbol}`}
            </span>
            {parseFloat(selectedTokenBalance) > 0 && (
              <button
                type="button"
                onClick={() => setAmount(selectedTokenBalance)}
                className="text-tago-yellow-400 hover:text-tago-yellow-300 font-medium"
                disabled={flowStatus !== 'idle'}
              >
                Max
              </button>
            )}
          </div>
        )}

        {/* Amount */}
        <SwapField
          label="Amount"
          value={amount}
          onChange={(val) => {
            // Only allow positive numbers
            const cleaned = val.replace(/[^0-9.]/g, '');
            // Prevent multiple decimal points
            const parts = cleaned.split('.');
            const sanitized = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleaned;
            setAmount(sanitized);
            if (quote) resetFlow();
          }}
          token={selectedToken ? { symbol: selectedToken.symbol } : undefined}
          disabled={flowStatus !== 'idle'}
        />
        {/* Show USD value for non-stablecoin inputs */}
        {quote?.recommended?.fromAmountUsd && selectedToken?.symbol !== 'USDC' && selectedToken?.symbol !== 'USDT' && (
          <p className="text-xs text-white/40 -mt-2 ml-1">~${quote.recommended.fromAmountUsd} USD</p>
        )}

        <SwapDivider />

        {/* To (Hyperliquid Perp) */}
        <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.08]">
          <div className="flex justify-between items-center">
            <span className="text-sm text-white/40 font-light">Receive on Hyperliquid</span>
            <Badge variant="yellow">Perp Account</Badge>
          </div>
          <div className="mt-2 text-2xl font-light text-white">
            {quote?.recommended?.toAmountFormatted
              ? `${quote.recommended.toAmountFormatted} USDC`
              : quoting
                ? 'Getting quote...'
                : amount
                  ? 'Click Get Quote to see conversion'
                  : '0.0 USDC'
            }
          </div>
          {quote?.recommended?.toAmountUsd && (
            <p className="text-xs text-white/40 mt-1">~${quote.recommended.toAmountUsd}</p>
          )}
          {/* Warning for amounts below 5 USDC minimum */}
          {quote?.recommended?.toAmountFormatted && parseFloat(quote.recommended.toAmountFormatted) < 5 && (
            <p className="text-xs text-red-400 mt-2 font-medium">
              ⚠️ Hyperliquid requires minimum 5 USDC. Amounts below 5 USDC are lost forever!
            </p>
          )}
        </div>

        {/* Quote Details */}
        {quote?.recommended && (
          <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.08] space-y-3">
            {/* Route Info */}
            <div className="flex justify-between text-sm">
              <span className="text-white/40 font-light">Exchange Rate</span>
              <span className="text-white font-light">{quote.recommended.exchangeRate}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/40 font-light">Estimated Time</span>
              <span className="text-white font-light">{quote.recommended.estimatedDurationFormatted}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/40 font-light">Gas Cost</span>
              <span className="text-white font-light">${quote.recommended.fees.gasCostUsd}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/40 font-light">Protocol Fee</span>
              <span className="text-white font-light">${quote.recommended.fees.protocolFeeUsd}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-white/[0.08]">
              <span className="text-white/60 font-medium">Total Fees</span>
              <span className="text-tago-yellow-400 font-medium">${quote.recommended.fees.totalFeeUsd}</span>
            </div>

            {/* Route tags */}
            {quote.recommended.tags && quote.recommended.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-2">
                {quote.recommended.tags.map((tag) => (
                  <Badge key={tag} variant={tag === 'RECOMMENDED' ? 'yellow' : 'info'}>
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Route Progress Steps */}
        {quote?.recommended?.steps && quote.recommended.steps.length > 0 && (
          <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.08]">
            <h4 className="text-sm text-white/70 font-medium mb-3">Route Progress</h4>
            <div className="space-y-3">
              {quote.recommended.steps.map((step, i) => {
                const status = stepStatuses[i] || 'pending';
                return (
                  <div key={i} className="flex items-start gap-3">
                    {getStepStatusIcon(status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${
                          status === 'completed' ? 'text-green-400' :
                          status === 'in_progress' ? 'text-tago-yellow-400' :
                          status === 'failed' ? 'text-red-400' :
                          'text-white/60'
                        }`}>
                          Step {step.stepIndex}: {step.toolName}
                        </span>
                        {status === 'in_progress' && (
                          <span className="text-xs text-tago-yellow-400/60 animate-pulse">Processing...</span>
                        )}
                      </div>
                      <p className="text-xs text-white/40 mt-0.5">{step.action}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-white/30">
                        <span>{step.fromChainName}</span>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                        <span>{step.toChainName}</span>
                        <span className="text-white/20">|</span>
                        <span>~{Math.ceil(step.estimatedDurationSeconds / 60)} min</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Flow Status Indicator */}
        {flowStatus !== 'idle' && flowStatus !== 'completed' && (
          <div className="bg-tago-yellow-400/10 border border-tago-yellow-400/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-tago-yellow-400 border-t-transparent rounded-full animate-spin" />
              <div>
                <p className="text-sm text-tago-yellow-400 font-medium">
                  {flowStatus === 'quoting' && 'Getting quote...'}
                  {flowStatus === 'approving' && 'Switching network...'}
                  {flowStatus === 'swapping' && 'Executing swap...'}
                  {flowStatus === 'bridging' && 'Bridging assets...'}
                  {flowStatus === 'depositing' && 'Depositing to Hyperliquid...'}
                </p>
                <p className="text-xs text-tago-yellow-400/60 mt-0.5">
                  Please confirm the transaction in your wallet
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        {!quote ? (
          <Button
            variant="yellow"
            fullWidth
            size="lg"
            onClick={handleGetQuote}
            loading={quoting}
            disabled={!walletAddress || !amount || !fromChain || !fromToken}
          >
            {quoting ? 'Getting Quote...' : 'Get Quote'}
          </Button>
        ) : flowStatus === 'completed' || success ? (
          <Button
            variant="ghost"
            fullWidth
            size="lg"
            onClick={resetFlow}
          >
            Start New Deposit
          </Button>
        ) : (
          <div className="space-y-2">
            <Button
              variant="yellow"
              fullWidth
              size="lg"
              onClick={handleExecuteSwap}
              loading={loading}
              disabled={flowStatus !== 'idle'}
            >
              {loading ? 'Processing...' : testMode ? 'Deposit to Hyperliquid (Test)' : 'Bridge to Hyperliquid'}
            </Button>
            <Button
              variant="ghost"
              fullWidth
              onClick={resetFlow}
              disabled={flowStatus !== 'idle'}
            >
              Get New Quote
            </Button>
          </div>
        )}
      </SwapPanel>

      {/* Help text */}
      <div className="text-center">
        <p className="text-xs text-white/30">
          Powered by <a href="https://li.fi" target="_blank" rel="noopener noreferrer" className="text-tago-yellow-400 hover:underline">LI.FI</a> cross-chain aggregation
        </p>
      </div>
    </div>
  );
}
