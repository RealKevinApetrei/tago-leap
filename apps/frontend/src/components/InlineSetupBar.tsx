'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useOneClickSetup, SetupStep } from '@/hooks/useOneClickSetup';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';

interface InlineSetupBarProps {
  onCancel: () => void;
  className?: string;
}

const STEP_INFO: Record<string, { title: string; description: string }> = {
  auth: { title: 'Sign In', description: 'Authenticate with Pear Protocol' },
  agentWallet: { title: 'Create Wallet', description: 'Set up trading agent wallet' },
  agentApproval: { title: 'Approve Agent', description: 'Allow trading on Hyperliquid' },
  builderFee: { title: 'Builder Fee', description: 'Enable 0.1% trading fee' },
  saltAccount: { title: 'Robo Account', description: 'Set up risk management' },
};

function StepRow({
  step,
  isActive,
  onExecute
}: {
  step: SetupStep;
  isActive: boolean;
  onExecute: () => void;
}) {
  const info = STEP_INFO[step.id];
  const isComplete = step.status === 'completed';
  const isError = step.status === 'error';
  const isPending = step.status === 'pending';
  const isInProgress = step.status === 'in_progress';

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center justify-between py-2 px-3 rounded border transition-colors ${
        isActive
          ? 'border-tago-yellow-400/30 bg-tago-yellow-400/5'
          : isComplete
          ? 'border-green-400/20 bg-green-400/5'
          : isError
          ? 'border-red-400/20 bg-red-400/5'
          : 'border-white/10 bg-white/5'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Status indicator */}
        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
          isComplete
            ? 'bg-green-400 text-black'
            : isError
            ? 'bg-red-400 text-white'
            : isInProgress
            ? 'bg-tago-yellow-400 text-black'
            : 'bg-white/20 text-white/60'
        }`}>
          {isComplete ? '✓' : isError ? '!' : isInProgress ? (
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              ◐
            </motion.span>
          ) : '○'}
        </div>

        <div>
          <div className="text-xs text-white/80 font-medium">{info.title}</div>
          <div className="text-[10px] text-white/40">{info.description}</div>
        </div>
      </div>

      {/* Action button */}
      {isActive && isPending && (
        <button
          onClick={onExecute}
          className="px-3 py-1 text-[10px] font-medium bg-tago-yellow-400 text-black rounded hover:bg-tago-yellow-300 transition-colors"
        >
          Execute
        </button>
      )}
      {isInProgress && (
        <span className="text-[10px] text-tago-yellow-400">Processing...</span>
      )}
      {isError && (
        <button
          onClick={onExecute}
          className="px-3 py-1 text-[10px] font-medium border border-red-400/50 text-red-400 rounded hover:bg-red-400/10 transition-colors"
        >
          Retry
        </button>
      )}
    </motion.div>
  );
}

export function InlineSetupBar({ onCancel, className }: InlineSetupBarProps) {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const {
    steps,
    isRunning,
    error,
    startSetup,
  } = useOneClickSetup();

  // Find first incomplete step
  const firstIncompleteIndex = steps.findIndex(s => s.status !== 'completed');
  const activeStep = firstIncompleteIndex >= 0 ? steps[firstIncompleteIndex] : null;

  // Count completed steps
  const completedCount = steps.filter(s => s.status === 'completed').length;
  const allComplete = completedCount === steps.length;

  // Execute single step
  const executeStep = useCallback(async () => {
    if (!activeStep || isRunning) return;
    await startSetup();
  }, [activeStep, isRunning, startSetup]);

  // Handle completion - navigate to /robo
  useEffect(() => {
    if (allComplete) {
      const timer = setTimeout(() => {
        router.push('/robo');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [allComplete, router]);

  // Wallet not connected
  if (!isConnected) {
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className={`font-mono ${className}`}
      >
        <div className="border border-white/10 rounded-lg p-4 bg-black/50 backdrop-blur-sm">
          <div className="text-center space-y-3">
            <p className="text-white/60 text-sm">Connect wallet to continue</p>
            <button
              onClick={openConnectModal}
              className="px-6 py-2 bg-tago-yellow-400 text-black font-medium rounded hover:bg-tago-yellow-300 transition-colors text-sm"
            >
              Connect Wallet
            </button>
            <button
              onClick={onCancel}
              className="block mx-auto text-white/30 hover:text-white/50 text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // All complete - success state
  if (allComplete) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`font-mono ${className}`}
      >
        <div className="border border-green-400/30 rounded-lg p-4 bg-green-400/5 backdrop-blur-sm">
          <div className="text-center space-y-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 10 }}
              className="text-green-400 text-xl"
            >
              ✓
            </motion.div>
            <p className="text-green-400 text-sm font-medium">Setup Complete</p>
            <p className="text-white/40 text-xs">Launching dashboard...</p>
          </div>
        </div>
      </motion.div>
    );
  }

  // Main setup UI
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className={`font-mono ${className}`}
    >
      <div className="border border-white/10 rounded-lg p-4 bg-black/50 backdrop-blur-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm text-white/80 font-medium">Account Setup</h3>
            <p className="text-[10px] text-white/40">{completedCount}/{steps.length} steps complete</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Progress bar */}
            <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-tago-yellow-400"
                initial={{ width: 0 }}
                animate={{ width: `${(completedCount / steps.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </div>

        {/* Steps list */}
        <div className="space-y-2">
          {steps.map((step, index) => (
            <StepRow
              key={step.id}
              step={step}
              isActive={index === firstIncompleteIndex}
              onExecute={executeStep}
            />
          ))}
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-3 p-2 rounded bg-red-400/10 border border-red-400/20">
            <p className="text-red-400 text-xs">{error}</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={onCancel}
            className="text-white/30 hover:text-white/50 text-xs transition-colors"
          >
            Cancel
          </button>

          {firstIncompleteIndex > 0 && (
            <span className="text-[10px] text-white/30">
              Click Execute on each step to proceed
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
