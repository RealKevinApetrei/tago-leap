'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useOneClickSetup, SetupStep, SetupStepStatus } from './useOneClickSetup';
import { useHyperliquidBalance } from './useHyperliquidBalance';

export type UnifiedStepId = 'auth' | 'agentWallet' | 'agentApproval' | 'builderFee' | 'saltAccount' | 'xAccount';

export interface UnifiedStep {
  id: UnifiedStepId;
  label: string;
  description: string;
  status: SetupStepStatus;
  error?: string;
}

export interface XAccount {
  id: string;
  username: string;
  avatar: string;
}

interface UseUnifiedSetupReturn {
  // All steps including X connection
  steps: UnifiedStep[];
  currentStep: UnifiedStep | null;

  // Running state
  isRunning: boolean;
  isSetupComplete: boolean;

  // X Account state
  xAccount: XAccount | null;
  isConnectingX: boolean;
  isXConnected: boolean;

  // Combined state
  isFullyReady: boolean;  // setupComplete AND xConnected
  needsDeposit: boolean;  // balance === 0 at agentApproval step

  // Errors
  error: string | null;

  // Actions
  startUnifiedSetup: () => Promise<void>;
  connectX: () => Promise<void>;
  disconnectX: () => Promise<void>;
  reset: () => void;

  // Balance for deposit checks
  hlBalance: number;
}

/**
 * Hook that combines useOneClickSetup with X account connection
 * into a single unified onboarding flow.
 */
export function useUnifiedSetup(): UseUnifiedSetupReturn {
  const { address, isConnected } = useAccount();

  // Use existing one-click setup
  const {
    steps: setupSteps,
    currentStep: setupCurrentStep,
    isRunning: setupRunning,
    isComplete: isSetupComplete,
    error: setupError,
    startSetup,
    reset: resetSetup,
  } = useOneClickSetup();

  // Hyperliquid balance for deposit detection
  const { balance: hlBalanceData } = useHyperliquidBalance();
  const hlBalance = hlBalanceData?.availableBalance ?? 0;

  // X Account state
  const [xAccount, setXAccount] = useState<XAccount | null>(null);
  const [isConnectingX, setIsConnectingX] = useState(false);
  const [xError, setXError] = useState<string | null>(null);

  // X step status derived from state
  const xStepStatus: SetupStepStatus = useMemo(() => {
    if (xAccount) return 'completed';
    if (isConnectingX) return 'in_progress';
    if (xError) return 'error';
    return 'pending';
  }, [xAccount, isConnectingX, xError]);

  // Combined steps (setup steps + X connection)
  const steps: UnifiedStep[] = useMemo(() => {
    const baseSteps = setupSteps.map(step => ({
      ...step,
      id: step.id as UnifiedStepId,
    }));

    const xStep: UnifiedStep = {
      id: 'xAccount',
      label: 'Connect X Account',
      description: 'Link your X account for social trading',
      status: xStepStatus,
      error: xError || undefined,
    };

    return [...baseSteps, xStep];
  }, [setupSteps, xStepStatus, xError]);

  // Current step (first non-completed in_progress step)
  const currentStep = useMemo(() => {
    return steps.find(step => step.status === 'in_progress') || null;
  }, [steps]);

  // Combined states
  const isXConnected = !!xAccount;
  const isFullyReady = isSetupComplete && isXConnected;
  const isRunning = setupRunning || isConnectingX;

  // Detect if deposit is needed (at agentApproval step with 0 balance)
  const needsDeposit = useMemo(() => {
    const agentApprovalStep = steps.find(s => s.id === 'agentApproval');
    const isAtOrBeforeApproval = agentApprovalStep?.status === 'in_progress' ||
                                  agentApprovalStep?.status === 'pending';
    return isAtOrBeforeApproval && hlBalance === 0;
  }, [steps, hlBalance]);

  // Combined error
  const error = setupError || xError;

  // Check X connection status on mount
  useEffect(() => {
    if (!address) return;

    const checkXStatus = async () => {
      try {
        const response = await fetch(`/api/twitter/status?wallet=${address}`);
        const data = await response.json();

        if (data.connected && data.account) {
          setXAccount({
            id: data.account.id,
            username: data.account.username,
            avatar: data.account.avatar,
          });
        }
      } catch (err) {
        console.error('[useUnifiedSetup] Failed to check X status:', err);
      }
    };

    checkXStatus();
  }, [address]);

  // Connect X account via OAuth
  // DEMO MODE: Skip actual OAuth and mock the connection
  const connectX = useCallback(async () => {
    if (!address) return;

    setIsConnectingX(true);
    setXError(null);

    // Demo mode: simulate connection delay then set mock account
    await new Promise(resolve => setTimeout(resolve, 1000));

    setXAccount({
      id: 'demo_user_123',
      username: 'demo_trader',
      avatar: 'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png',
    });
    setIsConnectingX(false);

    // TODO: Re-enable real OAuth when X API is set up
    // try {
    //   const response = await fetch('/api/twitter/auth', { method: 'POST' });
    //   const data = await response.json();
    //
    //   if (data.error) {
    //     console.error('[useUnifiedSetup] X OAuth config error:', data.error);
    //     setXError(data.error);
    //     setIsConnectingX(false);
    //     return;
    //   }
    //
    //   if (data.authUrl) {
    //     document.cookie = `x_code_verifier=${data.codeVerifier}; path=/; max-age=600; SameSite=Lax`;
    //     document.cookie = `x_wallet=${address}; path=/; max-age=600; SameSite=Lax`;
    //     document.cookie = `x_state=${data.state}; path=/; max-age=600; SameSite=Lax`;
    //     window.location.href = data.authUrl;
    //   } else {
    //     setXError('Failed to get authorization URL');
    //     setIsConnectingX(false);
    //   }
    // } catch (err) {
    //   console.error('[useUnifiedSetup] Failed to initiate X OAuth:', err);
    //   setXError('Failed to connect to X');
    //   setIsConnectingX(false);
    // }
  }, [address]);

  // Disconnect X account
  const disconnectX = useCallback(async () => {
    if (!address) return;

    try {
      await fetch(`/api/twitter/status?wallet=${address}`, { method: 'DELETE' });
      setXAccount(null);
    } catch (err) {
      console.error('[useUnifiedSetup] Failed to disconnect X:', err);
    }
  }, [address]);

  // Main unified setup flow
  const startUnifiedSetup = useCallback(async () => {
    if (!isConnected) {
      return;
    }

    // If already fully ready, nothing to do
    if (isFullyReady) {
      return;
    }

    // If setup not complete, run setup first
    if (!isSetupComplete) {
      await startSetup();
      // After setup completes, if X not connected, we'll prompt for X
      // But we don't auto-redirect - user clicks again or we show X step
      return;
    }

    // Setup complete but X not connected - connect X
    if (!isXConnected) {
      await connectX();
    }
  }, [isConnected, isFullyReady, isSetupComplete, isXConnected, startSetup, connectX]);

  // Reset errors and retry
  const reset = useCallback(() => {
    resetSetup();
    setXError(null);
  }, [resetSetup]);

  return {
    steps,
    currentStep,
    isRunning,
    isSetupComplete,
    xAccount,
    isConnectingX,
    isXConnected,
    isFullyReady,
    needsDeposit,
    error,
    startUnifiedSetup,
    connectX,
    disconnectX,
    reset,
    hlBalance,
  };
}
