'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useOneClickSetup } from '@/hooks/useOneClickSetup';
import { useAccount, useChainId } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useHyperliquidBalance } from '@/hooks/useHyperliquidBalance';
import { useDepositModal } from '@/components/DepositModal';

interface InlineSetupBarProps {
  onCancel: () => void;
  className?: string;
}

export function InlineSetupBar({ onCancel, className }: InlineSetupBarProps) {
  const router = useRouter();
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const { openConnectModal } = useConnectModal();
  const { openDeposit } = useDepositModal();
  const { balance: hlBalance } = useHyperliquidBalance();
  const {
    steps,
    currentStep,
    isRunning,
    isComplete,
    error,
    startSetup,
    reset,
  } = useOneClickSetup();

  const [needsDeposit, setNeedsDeposit] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // Check if wallet is fully ready
  const isWalletReady = isConnected && address && chainId;

  // Check if we need deposit during agentApproval step
  const isOnAgentApproval = currentStep?.id === 'agentApproval';
  const hasNoBalance = hlBalance !== null && hlBalance.availableBalance === 0;

  useEffect(() => {
    if (isOnAgentApproval && hasNoBalance && !needsDeposit) {
      setNeedsDeposit(true);
    }
  }, [isOnAgentApproval, hasNoBalance, needsDeposit]);

  // Count completed steps
  const completedCount = steps.filter(s => s.status === 'completed').length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  // Auto-start setup when wallet is ready (with small delay to ensure connection is stable)
  useEffect(() => {
    if (isWalletReady && !isRunning && !isComplete && !error && !needsDeposit && !hasStarted) {
      // Small delay to ensure wallet connection is fully established
      const timer = setTimeout(() => {
        setHasStarted(true);
        startSetup();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isWalletReady, isRunning, isComplete, error, needsDeposit, hasStarted, startSetup]);

  // Handle completion
  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(() => {
        router.push('/robo');
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isComplete, router]);

  // Handle deposit completion - resume setup
  const handleDeposit = () => {
    openDeposit();
    // After deposit modal closes, we'll need to retry
    setNeedsDeposit(false);
  };

  // Wallet not connected or not ready
  if (!isWalletReady) {
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className={`font-mono ${className}`}
      >
        <div className="border border-white/10 rounded-lg px-4 py-3 bg-black/50 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-white/50 text-xs">{isConnected ? 'Connecting...' : 'Connect to continue'}</span>
            {!isConnected && (
              <button
                onClick={openConnectModal}
                className="px-4 py-1.5 bg-tago-yellow-400 text-black font-medium rounded text-xs hover:bg-tago-yellow-300 transition-colors"
              >
                Connect
              </button>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // Needs deposit
  if (needsDeposit || (isOnAgentApproval && hasNoBalance)) {
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className={`font-mono ${className}`}
      >
        <div className="border border-tago-yellow-400/30 rounded-lg px-4 py-3 bg-black/50 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-tago-yellow-400">!</span>
              <span className="text-white/60 text-xs">Deposit USDC to Hyperliquid</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDeposit}
                className="px-4 py-1.5 bg-tago-yellow-400 text-black font-medium rounded text-xs hover:bg-tago-yellow-300 transition-colors"
              >
                Deposit
              </button>
              <button
                onClick={onCancel}
                className="text-white/30 hover:text-white/50 text-xs"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Complete
  if (isComplete) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`font-mono ${className}`}
      >
        <div className="border border-green-400/30 rounded-lg px-4 py-3 bg-green-400/5 backdrop-blur-sm">
          <div className="flex items-center justify-center gap-2">
            <span className="text-green-400">✓</span>
            <span className="text-green-400 text-xs">Ready</span>
          </div>
        </div>
      </motion.div>
    );
  }

  // Error
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className={`font-mono ${className}`}
      >
        <div className="border border-red-400/30 rounded-lg px-4 py-3 bg-red-400/5 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-red-400/80 text-xs truncate">{error}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { reset(); setHasStarted(false); }}
                className="px-3 py-1 bg-tago-yellow-400 text-black font-medium rounded text-xs hover:bg-tago-yellow-300 transition-colors"
              >
                Retry
              </button>
              <button
                onClick={onCancel}
                className="text-white/30 hover:text-white/50 text-xs"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Running - compact progress
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className={`font-mono ${className}`}
    >
      <div className="border border-tago-yellow-400/30 rounded-lg px-4 py-3 bg-black/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          {/* Step dots */}
          <div className="flex items-center gap-1">
            {steps.map((step, i) => (
              <div
                key={step.id}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  step.status === 'completed'
                    ? 'bg-green-400'
                    : step.status === 'in_progress'
                    ? 'bg-tago-yellow-400 animate-pulse'
                    : 'bg-white/20'
                }`}
              />
            ))}
          </div>

          {/* Current step */}
          <span className="text-white/60 text-xs flex-1 truncate">
            {currentStep?.label || 'Starting...'}
          </span>

          {/* Progress */}
          <span className="text-white/40 text-xs">{progressPercent}%</span>

          {/* Cancel */}
          <button
            onClick={onCancel}
            className="text-white/30 hover:text-white/50 text-xs"
          >
            ✕
          </button>
        </div>
      </div>
    </motion.div>
  );
}
