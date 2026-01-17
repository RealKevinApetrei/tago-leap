'use client';

import { useState, useEffect, useCallback, useMemo, createContext, useContext } from 'react';
import { useAccount, useWalletClient, useSwitchChain } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { formatUnits, parseUnits, encodeFunctionData } from 'viem';
import { Button } from '@/components/ui/Button';
import { lifiApi, ApiError } from '@/lib/api';
import { parseApiErrorToTradeError } from '@/components/TradeErrorDisplay';
import type { RouteExtended } from '@lifi/sdk';
import Image from 'next/image';

// LI.FI SDK
let lifiSdk: typeof import('@lifi/sdk') | null = null;
async function getLifiSdk() {
  if (!lifiSdk) lifiSdk = await import('@lifi/sdk');
  return lifiSdk;
}

async function configureLifiWithWallet(switchChain: (chainId: number) => Promise<void>) {
  const sdk = await getLifiSdk();
  const { createWalletClient, custom } = await import('viem');
  const getWalletClientForChain = async (chainId?: number) => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) throw new Error('No wallet provider found');
    const accounts = await ethereum.request({ method: 'eth_accounts' });
    if (!accounts?.length) throw new Error('No accounts connected');
    const currentChainHex = await ethereum.request({ method: 'eth_chainId' });
    return createWalletClient({
      account: accounts[0] as `0x${string}`,
      chain: { id: chainId || parseInt(currentChainHex, 16) } as any,
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
          await new Promise(resolve => setTimeout(resolve, 500));
          return getWalletClientForChain(chainId);
        },
      }),
    ],
  });
}

interface TokenOption { address: string; symbol: string; decimals: number; logoUri?: string; priceUsd?: string; }
interface ChainOption { chainId: number; chainName: string; chainLogoUri?: string; tokens: TokenOption[]; }
interface QuoteResponse {
  id: string;
  recommended: {
    routeId: string; fromAmountFormatted: string; toAmountFormatted: string; toAmountUsd: string;
    estimatedDurationFormatted: string; exchangeRate: string;
    fees: { gasCostUsd: string; protocolFeeUsd: string; totalFeeUsd: string };
    steps: any[]; tags?: string[];
  };
  alternatives: any[]; routeCount: number; rawRoute?: any;
}

type FlowStatus = 'idle' | 'quoting' | 'swapping' | 'bridging' | 'depositing' | 'completed' | 'failed';

const ARBITRUM_CHAIN_ID = 42161;
const ARBITRUM_USDC = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const HYPERLIQUID_BRIDGE = '0x2Df1c51E09aECF9cacB7bc98cB1742757f163dF7';
const PRICE_REFRESH_INTERVAL = 20000;

const ERC20_ABI = [{ name: 'balanceOf', type: 'function', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] }] as const;
const ERC20_TRANSFER_ABI = [{ name: 'transfer', type: 'function', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] }] as const;

const CHAIN_LOGOS: Record<number, string> = {
  1: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/ethereum.svg',
  42161: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/arbitrum.svg',
  10: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/optimism.svg',
  137: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/polygon.svg',
  56: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/bsc.svg',
  43114: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/avalanche.svg',
  8453: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/base.svg',
  324: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/zksync.svg',
  999: 'https://app.hyperliquid.xyz/icons/hyperliquid.svg',
};

const TOKEN_LOGOS: Record<string, string> = {
  ETH: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
  WETH: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
  USDC: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
  USDT: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png',
  DAI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EescdeCB5f6d3B7/logo.png',
  MATIC: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png',
  BNB: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/binance/info/logo.png',
  AVAX: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/avalanchec/info/logo.png',
  HYPE: 'https://app.hyperliquid.xyz/icons/hyperliquid.svg',
};

function TokenLogo({ token, size = 24 }: { token: TokenOption; size?: number }) {
  const [error, setError] = useState(false);
  const url = token.logoUri || TOKEN_LOGOS[token.symbol];
  if (error || !url) return <div className="rounded-full bg-white/[0.10] flex items-center justify-center text-[10px] font-medium text-white" style={{ width: size, height: size }}>{token.symbol.slice(0, 2)}</div>;
  return <Image src={url} alt={token.symbol} width={size} height={size} className="rounded-full" onError={() => setError(true)} unoptimized />;
}

function ChainLogo({ chain, size = 16 }: { chain: ChainOption; size?: number }) {
  const [error, setError] = useState(false);
  const url = chain.chainLogoUri || CHAIN_LOGOS[chain.chainId];
  if (error || !url) return <div className="rounded-full bg-white/[0.20] flex items-center justify-center text-[8px] font-medium text-white" style={{ width: size, height: size }}>{chain.chainName.slice(0, 1)}</div>;
  return <Image src={url} alt={chain.chainName} width={size} height={size} className="rounded-full" onError={() => setError(true)} unoptimized />;
}

function TokenWithChain({ token, chain, size = 32 }: { token: TokenOption; chain: ChainOption; size?: number }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <TokenLogo token={token} size={size} />
      <div className="absolute -bottom-0.5 -right-0.5 rounded-full bg-black p-[2px]">
        <ChainLogo chain={chain} size={Math.round(size * 0.45)} />
      </div>
    </div>
  );
}

// Context for global modal state
interface DepositModalContextType {
  isOpen: boolean;
  openDeposit: () => void;
  closeDeposit: () => void;
}

const DepositModalContext = createContext<DepositModalContextType>({
  isOpen: false,
  openDeposit: () => {},
  closeDeposit: () => {},
});

export function useDepositModal() {
  return useContext(DepositModalContext);
}

export function DepositModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openDeposit = useCallback(() => setIsOpen(true), []);
  const closeDeposit = useCallback(() => setIsOpen(false), []);

  return (
    <DepositModalContext.Provider value={{ isOpen, openDeposit, closeDeposit }}>
      {children}
      <DepositModal isOpen={isOpen} onClose={closeDeposit} />
    </DepositModalContext.Provider>
  );
}

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DepositModal({ isOpen, onClose }: DepositModalProps) {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { switchChainAsync } = useSwitchChain();

  const [options, setOptions] = useState<ChainOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [quoting, setQuoting] = useState(false);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [success, setSuccess] = useState(false);

  const [fromChain, setFromChain] = useState('');
  const [fromToken, setFromToken] = useState('');
  const [amount, setAmount] = useState('');

  const [flowStatus, setFlowStatus] = useState<FlowStatus>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [lifiRoute, setLifiRoute] = useState<RouteExtended | null>(null);

  const [tokenBalances, setTokenBalances] = useState<Record<string, string>>({});
  const [balancesLoading, setBalancesLoading] = useState(false);

  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectorTab, setSelectorTab] = useState<'token' | 'chain'>('token');

  type ToastType = { type: 'error' | 'success' | 'info'; message: string } | null;
  const [toast, setToast] = useState<ToastType>(null);

  const showToast = useCallback((type: 'error' | 'success' | 'info', message: string) => setToast({ type, message }), []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.type === 'error' ? 6000 : 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const walletAddress = address || '';

  const loadOptions = useCallback(async () => {
    try {
      const data = await lifiApi.getOptions();
      const filtered = data.map((chain: ChainOption) => ({
        ...chain,
        tokens: chain.tokens.filter((t: TokenOption) => t.logoUri || TOKEN_LOGOS[t.symbol])
      })).filter((chain: ChainOption) => chain.tokens.length > 0);
      setOptions(filtered);
      if (filtered.length > 0 && !fromChain) {
        const defaultChain = filtered.find((o: ChainOption) => o.chainId === 42161) || filtered[0];
        setFromChain(String(defaultChain.chainId));
        if (defaultChain.tokens.length > 0) {
          const usdc = defaultChain.tokens.find((t: TokenOption) => t.symbol === 'USDC');
          setFromToken(usdc?.address || defaultChain.tokens[0].address);
        }
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to load');
    }
  }, [fromChain, showToast]);

  useEffect(() => {
    if (isOpen) {
      setOptionsLoading(true);
      loadOptions().finally(() => setOptionsLoading(false));
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const i = setInterval(() => loadOptions(), PRICE_REFRESH_INTERVAL);
    return () => clearInterval(i);
  }, [isOpen, loadOptions]);

  const fetchTokenBalances = useCallback(async () => {
    if (!walletAddress || !fromChain || options.length === 0) return;
    const chainId = parseInt(fromChain);
    const chain = options.find(o => o.chainId === chainId);
    if (!chain?.tokens.length) return;

    setBalancesLoading(true);
    try {
      const { createPublicClient, http } = await import('viem');
      const { mainnet, arbitrum, optimism, polygon, base, bsc, avalanche } = await import('viem/chains');
      const chainMap: Record<number, any> = { 1: mainnet, 42161: arbitrum, 10: optimism, 137: polygon, 8453: base, 56: bsc, 43114: avalanche };
      const viemChain = chainMap[chainId];

      if (!viemChain) {
        const sdk = await getLifiSdk();
        const tokens = chain.tokens.map(t => ({ address: t.address as `0x${string}`, chainId, symbol: t.symbol, decimals: t.decimals, name: t.symbol, priceUSD: '0' }));
        const balances = await sdk.getTokenBalances(walletAddress as `0x${string}`, tokens);
        const balanceMap: Record<string, string> = {};
        balances.forEach(token => {
          const key = token.address.toLowerCase();
          balanceMap[key] = token.amount && BigInt(token.amount) > 0n ? (parseFloat(formatUnits(BigInt(token.amount), token.decimals)) < 0.01 ? parseFloat(formatUnits(BigInt(token.amount), token.decimals)).toFixed(6) : parseFloat(formatUnits(BigInt(token.amount), token.decimals)).toFixed(4)) : '0';
        });
        setTokenBalances(balanceMap);
        return;
      }

      const publicClient = createPublicClient({ chain: viemChain, transport: http() });
      const balanceMap: Record<string, string> = {};
      const NATIVE = '0x0000000000000000000000000000000000000000';

      for (const token of chain.tokens) {
        try {
          const key = token.address.toLowerCase();
          const isNative = token.address === NATIVE || token.address.toLowerCase() === NATIVE;
          const balance = isNative ? await publicClient.getBalance({ address: walletAddress as `0x${string}` }) : await publicClient.readContract({ address: token.address as `0x${string}`, abi: ERC20_ABI, functionName: 'balanceOf', args: [walletAddress as `0x${string}`] }) as bigint;
          balanceMap[key] = balance > 0n ? (parseFloat(formatUnits(balance, token.decimals)) < 0.01 ? parseFloat(formatUnits(balance, token.decimals)).toFixed(6) : parseFloat(formatUnits(balance, token.decimals)).toFixed(4)) : '0';
        } catch { balanceMap[token.address.toLowerCase()] = '0'; }
      }
      setTokenBalances(balanceMap);
    } catch { setTokenBalances({}); }
    finally { setBalancesLoading(false); }
  }, [walletAddress, fromChain, options]);

  useEffect(() => { if (isOpen) fetchTokenBalances(); }, [isOpen, fetchTokenBalances]);

  const selectedChain = options.find(o => String(o.chainId) === fromChain);
  const selectedToken = selectedChain?.tokens.find(t => t.address === fromToken);
  const selectedTokenBalance = selectedToken ? tokenBalances[selectedToken.address.toLowerCase()] || '0' : '0';

  const inputUsdValue = useMemo(() => {
    if (!amount || !selectedToken?.priceUsd) return null;
    const numAmount = parseFloat(amount);
    const price = parseFloat(selectedToken.priceUsd);
    if (isNaN(numAmount) || isNaN(price) || numAmount <= 0) return null;
    const usd = numAmount * price;
    return usd < 0.01 ? '< $0.01' : `~$${usd.toFixed(2)}`;
  }, [amount, selectedToken?.priceUsd]);

  const parseAmount = (value: string, decimals: number): string => {
    if (!value) return '0';
    const parts = value.split('.');
    return BigInt((parts[0] || '0') + (parts[1] || '').padEnd(decimals, '0').slice(0, decimals)).toString();
  };

  const resetFlow = useCallback(() => { setQuote(null); setLifiRoute(null); setSuccess(false); setFlowStatus('idle'); setTxHash(null); }, []);

  useEffect(() => { if (flowStatus === 'failed') { const t = setTimeout(resetFlow, 3000); return () => clearTimeout(t); } }, [flowStatus, resetFlow]);

  const depositToHyperliquidL1 = async () => {
    if (!walletClient || !address) throw new Error('Wallet not connected');
    const ethereum = (window as any).ethereum;
    if (ethereum) {
      const currentChainHex = await ethereum.request({ method: 'eth_chainId' });
      if (parseInt(currentChainHex, 16) !== ARBITRUM_CHAIN_ID) {
        showToast('info', 'Switching to Arbitrum...');
        await ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: `0x${ARBITRUM_CHAIN_ID.toString(16)}` }] });
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    const depositAmountFormatted = quote?.recommended?.toAmountFormatted || amount || '0';
    const depositAmount = parseUnits(depositAmountFormatted, 6);
    if (depositAmount <= 0n) throw new Error('Invalid amount');
    if (depositAmount < 5000000n) throw new Error('Min deposit: 5 USDC');

    const { createPublicClient, http } = await import('viem');
    const { arbitrum } = await import('viem/chains');
    const publicClient = createPublicClient({ chain: arbitrum, transport: http() });
    const balance = await publicClient.readContract({ address: ARBITRUM_USDC as `0x${string}`, abi: ERC20_ABI, functionName: 'balanceOf', args: [address] }) as bigint;
    if (balance < depositAmount) throw new Error(`Insufficient USDC`);

    showToast('info', 'Confirm in wallet...');
    const transferData = encodeFunctionData({ abi: ERC20_TRANSFER_ABI, functionName: 'transfer', args: [HYPERLIQUID_BRIDGE as `0x${string}`, depositAmount] });
    const depositTxHash = await walletClient.sendTransaction({ to: ARBITRUM_USDC as `0x${string}`, data: transferData, chain: { id: ARBITRUM_CHAIN_ID } as any });
    setTxHash(depositTxHash);
    showToast('info', 'Confirming...');
    await publicClient.waitForTransactionReceipt({ hash: depositTxHash });
    showToast('success', 'Done!');
  };

  const handleGetQuote = async () => {
    if (!walletAddress || !fromChain || !fromToken || !amount || !selectedToken) return;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) { showToast('error', 'Enter valid amount'); return; }

    setQuoting(true); setQuote(null); setLifiRoute(null); setFlowStatus('quoting');

    try {
      const parsedAmount = parseAmount(amount, selectedToken.decimals);
      const sourceChainId = parseInt(fromChain);
      const isArbitrumUsdc = sourceChainId === ARBITRUM_CHAIN_ID && fromToken.toLowerCase() === ARBITRUM_USDC.toLowerCase();

      let result;
      if (isArbitrumUsdc) {
        result = { id: `direct-${Date.now()}`, recommended: { routeId: 'direct', fromAmountFormatted: amount, toAmountFormatted: amount, toAmountUsd: amount, estimatedDurationFormatted: '~1 min', exchangeRate: '1.0', fees: { gasCostUsd: '0', protocolFeeUsd: '0', totalFeeUsd: '0' }, steps: [], tags: ['DIRECT'] }, alternatives: [], routeCount: 1, rawRoute: null };
      } else {
        result = await lifiApi.getQuote({ userWalletAddress: walletAddress, fromChainId: sourceChainId, fromTokenAddress: fromToken, amount: parsedAmount, toTokenAddress: ARBITRUM_USDC, toChainId: ARBITRUM_CHAIN_ID });
      }
      if (!isArbitrumUsdc && !result.rawRoute) throw new Error('No routes');
      setLifiRoute(result.rawRoute || null); setQuote(result); setFlowStatus('idle');
    } catch (err: any) {
      const error = err instanceof ApiError && err.tradeError ? err.tradeError : parseApiErrorToTradeError(err);
      showToast('error', error.message); setFlowStatus('failed');
    } finally { setQuoting(false); }
  };

  const handleExecuteSwap = async () => {
    if (!quote || !walletClient) { showToast('error', 'Missing quote'); return; }
    const isDirectDeposit = quote.recommended?.routeId === 'direct' || quote.recommended?.tags?.includes('DIRECT');
    if (!lifiRoute && !isDirectDeposit) { showToast('error', 'Missing route'); return; }

    setLoading(true); setFlowStatus('swapping');

    try {
      if (lifiRoute) {
        showToast('info', 'Bridging...');
        await configureLifiWithWallet(async (chainId) => { await switchChainAsync({ chainId: chainId as any }); });
        const sdk = await getLifiSdk();
        await sdk.executeRoute(lifiRoute!, { updateRouteHook: (r) => setLifiRoute(r), acceptExchangeRateUpdateHook: async () => true });
        if (quote.id && txHash) { try { await lifiApi.trackOnboarding({ flowId: quote.id, txHashes: [txHash] }); } catch {} }
      }
      setFlowStatus('depositing');
      await new Promise(r => setTimeout(r, 2000));
      await depositToHyperliquidL1();
      setSuccess(true); setFlowStatus('completed'); showToast('success', 'Complete!');
    } catch (err: any) { showToast('error', err.message || 'Failed'); setFlowStatus('failed'); }
    finally { setLoading(false); }
  };

  const isProcessing = flowStatus !== 'idle' && flowStatus !== 'completed' && flowStatus !== 'failed';

  const handleClose = () => {
    if (isProcessing) return;
    onClose();
    // Reset state after close animation
    setTimeout(() => {
      resetFlow();
      setAmount('');
    }, 200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={handleClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[110] animate-in slide-in-from-top fade-in duration-200">
          <div className={`backdrop-blur-xl border rounded-lg px-4 py-2.5 shadow-2xl flex items-center gap-3 ${toast.type === 'error' ? 'bg-red-500/90 border-red-400/30' : toast.type === 'success' ? 'bg-green-500/90 border-green-400/30' : 'bg-black/80 border-white/[0.08]'}`}>
            <span className="text-sm font-light text-white">{toast.message}</span>
            <button onClick={() => setToast(null)} className="text-white/60 hover:text-white"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
        </div>
      )}

      {/* Modal */}
      <div
        className={`relative w-full max-w-[400px] mx-4 transition-all duration-300 ${isProcessing ? 'blur-sm pointer-events-none' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.08] overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="px-5 py-4 flex items-center justify-between border-b border-white/[0.05]">
            <h1 className="text-base font-light text-white">Deposit to Hyperliquid</h1>
            <button
              onClick={handleClose}
              disabled={isProcessing}
              className="w-8 h-8 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] hover:border-white/[0.10] flex items-center justify-center transition-all duration-200 disabled:opacity-50"
            >
              <svg className="w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {!isConnected ? (
            <div className="p-8 text-center">
              <div className="w-14 h-14 mx-auto mb-6 rounded-xl bg-yellow-400/10 flex items-center justify-center">
                <svg className="w-7 h-7 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
              <p className="text-sm font-light text-white/40 mb-6">Connect wallet to deposit</p>
              <ConnectButton />
            </div>
          ) : (
            <div className="p-5 space-y-4" onClick={() => setSelectorOpen(false)}>
              {/* You Pay */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-light text-white/40">You pay</span>
                  {selectedToken && <span className="text-xs font-light text-white/40">Balance: <span className="text-white/60">{balancesLoading ? '...' : selectedTokenBalance}</span></span>}
                </div>

                <div className="bg-white/[0.03] rounded-xl border border-white/[0.05] p-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={amount}
                      onChange={(e) => { const val = e.target.value.replace(/[^0-9.]/g, ''); const parts = val.split('.'); setAmount(parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : val); if (quote) resetFlow(); }}
                      placeholder="0"
                      className="flex-1 bg-transparent text-[28px] font-light text-white placeholder-white/20 focus:outline-none w-0"
                    />

                    {/* Combined Token Selector */}
                    <div className="relative">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectorOpen(!selectorOpen); setSelectorTab('token'); }}
                        disabled={optionsLoading}
                        className="flex items-center gap-2.5 pl-2 pr-3 py-2 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.05] hover:border-white/[0.10] rounded-xl transition-all duration-200"
                      >
                        {selectedToken && selectedChain && <TokenWithChain token={selectedToken} chain={selectedChain} size={28} />}
                        <span className="text-sm font-normal text-white">{selectedToken?.symbol || 'Select'}</span>
                        <svg className={`w-4 h-4 text-white/30 transition-transform ${selectorOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </button>

                      {/* Selector Dropdown */}
                      {selectorOpen && (
                        <div className="absolute right-0 z-40 mt-2 w-72 bg-black/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                          {/* Tabs */}
                          <div className="flex border-b border-white/[0.05]">
                            <button onClick={() => setSelectorTab('token')} className={`flex-1 py-2.5 text-xs font-light transition-colors ${selectorTab === 'token' ? 'text-white bg-white/[0.05]' : 'text-white/40 hover:text-white/60'}`}>Token</button>
                            <button onClick={() => setSelectorTab('chain')} className={`flex-1 py-2.5 text-xs font-light transition-colors ${selectorTab === 'chain' ? 'text-white bg-white/[0.05]' : 'text-white/40 hover:text-white/60'}`}>Chain</button>
                          </div>

                          <div className="max-h-64 overflow-y-auto">
                            {selectorTab === 'chain' ? (
                              options.map(chain => (
                                <button
                                  key={chain.chainId}
                                  onClick={() => {
                                    setFromChain(String(chain.chainId));
                                    const usdc = chain.tokens.find(t => t.symbol === 'USDC');
                                    setFromToken(usdc?.address || chain.tokens[0]?.address || '');
                                    setSelectorTab('token');
                                    resetFlow();
                                  }}
                                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.05] transition-colors ${String(chain.chainId) === fromChain ? 'bg-white/[0.05]' : ''}`}
                                >
                                  <ChainLogo chain={chain} size={24} />
                                  <span className="text-sm font-light text-white/90">{chain.chainName}</span>
                                  {String(chain.chainId) === fromChain && <svg className="w-4 h-4 text-yellow-400 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                                </button>
                              ))
                            ) : selectedChain ? (
                              selectedChain.tokens.map(token => {
                                const bal = tokenBalances[token.address.toLowerCase()] || '0';
                                return (
                                  <button
                                    key={token.address}
                                    onClick={() => { setFromToken(token.address); setSelectorOpen(false); resetFlow(); }}
                                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.05] transition-colors ${token.address === fromToken ? 'bg-white/[0.05]' : ''}`}
                                  >
                                    <TokenWithChain token={token} chain={selectedChain} size={28} />
                                    <div className="flex-1 text-left">
                                      <span className="text-sm font-light text-white/90 block">{token.symbol}</span>
                                      <span className="text-xs font-light text-white/40">{selectedChain.chainName}</span>
                                    </div>
                                    {parseFloat(bal) > 0 && <span className="text-xs font-light text-white/50">{bal}</span>}
                                  </button>
                                );
                              })
                            ) : null}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* USD + MAX */}
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-sm font-light text-white/40">{inputUsdValue || '~$0.00'}</span>
                    {parseFloat(selectedTokenBalance) > 0 && (
                      <button onClick={() => setAmount(selectedTokenBalance)} className="px-2 py-0.5 text-[10px] font-medium text-yellow-400 bg-yellow-400/10 rounded hover:bg-yellow-400/20 transition-colors">MAX</button>
                    )}
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <div className="w-8 h-8 rounded-full bg-white/[0.03] border border-white/[0.05] flex items-center justify-center">
                  <svg className="w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                </div>
              </div>

              {/* You Receive */}
              <div>
                <span className="text-xs font-light text-white/40 block mb-2">You receive on Hyperliquid</span>
                <div className="bg-white/[0.03] rounded-xl border border-white/[0.05] p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[28px] font-light text-white">{quote?.recommended?.toAmountFormatted || (quoting ? '...' : '0')}</span>
                    <div className="flex items-center gap-2 pl-2 pr-3 py-2 bg-white/[0.05] rounded-xl">
                      <Image src={TOKEN_LOGOS.USDC} alt="USDC" width={24} height={24} className="rounded-full" unoptimized />
                      <span className="text-sm font-normal text-white">USDC</span>
                    </div>
                  </div>
                  {quote?.recommended?.toAmountFormatted && parseFloat(quote.recommended.toAmountFormatted) < 5 && (
                    <p className="text-xs font-light text-red-400 mt-3">Min: 5 USDC</p>
                  )}
                </div>
              </div>

              {/* Quote Details */}
              {quote?.recommended && (
                <div className="space-y-2 px-1 text-sm font-light">
                  <div className="flex justify-between"><span className="text-white/40">Rate</span><span className="text-white/60">1 {selectedToken?.symbol} ≈ {quote.recommended.exchangeRate} USDC</span></div>
                  <div className="flex justify-between"><span className="text-white/40">Time</span><span className="text-white/60">{quote.recommended.estimatedDurationFormatted}</span></div>
                  <div className="flex justify-between"><span className="text-white/40">Fees</span><span className="text-white/60">~${quote.recommended.fees.totalFeeUsd}</span></div>
                </div>
              )}

              {/* Action */}
              {!quote ? (
                <Button variant="yellow" fullWidth size="lg" onClick={handleGetQuote} loading={quoting} disabled={!walletAddress || !amount || !fromChain || !fromToken || parseFloat(amount) <= 0}>
                  {quoting ? 'Getting Quote...' : 'Get Quote'}
                </Button>
              ) : success ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center"><svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div>
                    <div><p className="text-sm font-normal text-green-400">Complete</p><p className="text-xs font-light text-green-400/60">Arriving in ~1 min</p></div>
                  </div>
                  <Button variant="yellow" fullWidth size="lg" onClick={handleClose}>Done</Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Button variant="yellow" fullWidth size="lg" onClick={handleExecuteSwap} loading={loading} disabled={flowStatus !== 'idle'}>{loading ? 'Processing...' : 'Deposit'}</Button>
                  <button onClick={resetFlow} disabled={flowStatus !== 'idle'} className="w-full py-2.5 text-sm font-light text-white/40 hover:text-white/60 transition-colors disabled:opacity-50">Cancel</button>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="px-5 py-3 border-t border-white/[0.05]">
            <p className="text-center text-xs font-light text-white/20">Powered by <a href="https://li.fi" target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-white/50 transition-colors">LI.FI</a></p>
          </div>
        </div>
      </div>

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="absolute inset-0 z-[105] flex items-center justify-center">
          <div className="bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-8 text-center max-w-xs mx-4">
            <div className="w-10 h-10 mx-auto mb-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-white font-normal">{flowStatus === 'quoting' ? 'Getting Quote...' : flowStatus === 'swapping' ? 'Bridging...' : flowStatus === 'depositing' ? 'Depositing...' : 'Processing...'}</p>
            <p className="text-sm font-light text-white/40 mt-1">Confirm in wallet</p>
          </div>
        </div>
      )}
    </div>
  );
}
