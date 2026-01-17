'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { usePearAuth } from './usePearAuth';
import { useAgentWallet } from './useAgentWallet';
import { useBuilderFee } from './useBuilderFee';
import { useSaltAccount } from './useSaltAccount';

export type SetupStepId = 'auth' | 'agentWallet' | 'agentApproval' | 'builderFee' | 'saltAccount';
export type SetupStepStatus = 'pending' | 'in_progress' | 'completed' | 'error';

export interface SetupStep {
  id: SetupStepId;
  label: string;
  description: string;
  status: SetupStepStatus;
  error?: string;
}

interface UseOneClickSetupReturn {
  steps: SetupStep[];
  currentStep: SetupStep | null;
  isRunning: boolean;
  isComplete: boolean;
  error: string | null;
  startSetup: () => Promise<void>;
  reset: () => void;
}

/**
 * Hook to orchestrate one-click onboarding setup.
 *
 * Chains all setup steps:
 * 1. Pear Authentication (EIP-712 signature)
 * 2. Create Agent Wallet (API call)
 * 3. Approve Agent on Hyperliquid (EIP-712 signature)
 * 4. Approve Builder Fee (EIP-712 signature)
 * 5. Create Salt Account (API call)
 */
export function useOneClickSetup(): UseOneClickSetupReturn {
  const { isConnected } = useAccount();

  // Use existing hooks
  const {
    isAuthenticated,
    isAuthenticating,
    authenticate,
    error: authError,
  } = usePearAuth();

  const {
    agentWalletAddress,
    exists: agentWalletExists,
    isCreating: agentWalletCreating,
    isApproving: agentWalletApproving,
    createAgentWallet,
    approveAgentWallet,
    error: agentWalletError,
  } = useAgentWallet();

  const {
    isApproved: builderFeeApproved,
    isApproving: builderFeeApproving,
    approveBuilderFee,
    error: builderFeeError,
  } = useBuilderFee();

  const {
    account,
    isCreating: saltAccountCreating,
    createAccount,
    error: saltAccountError,
  } = useSaltAccount();

  const [steps, setSteps] = useState<SetupStep[]>([
    { id: 'auth', label: 'Authenticate', description: 'Sign in to Pear Protocol', status: 'pending' },
    { id: 'agentWallet', label: 'Create Agent Wallet', description: 'Set up your trading wallet', status: 'pending' },
    { id: 'agentApproval', label: 'Approve on Hyperliquid', description: 'Allow trading on your behalf', status: 'pending' },
    { id: 'builderFee', label: 'Approve Builder Fee', description: 'Enable 0.1% trading fee', status: 'pending' },
    { id: 'saltAccount', label: 'Create Robo Account', description: 'Set up risk management', status: 'pending' },
  ]);

  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to update a step's status
  const updateStep = useCallback((stepId: SetupStepId, status: SetupStepStatus, errorMsg?: string) => {
    setSteps(prev => prev.map(step =>
      step.id === stepId
        ? { ...step, status, error: errorMsg }
        : step
    ));
  }, []);

  // Initialize step statuses based on current state from hooks
  useEffect(() => {
    if (!isRunning) {
      setSteps(prev => prev.map(step => {
        // Only update to 'completed' if we're not in a running state
        if (step.id === 'auth' && isAuthenticated) {
          return { ...step, status: 'completed', error: undefined };
        }
        if (step.id === 'agentWallet' && agentWalletAddress) {
          return { ...step, status: 'completed', error: undefined };
        }
        if (step.id === 'agentApproval' && agentWalletExists) {
          return { ...step, status: 'completed', error: undefined };
        }
        if (step.id === 'builderFee' && builderFeeApproved) {
          return { ...step, status: 'completed', error: undefined };
        }
        if (step.id === 'saltAccount' && account) {
          return { ...step, status: 'completed', error: undefined };
        }
        // Keep pending status for incomplete steps
        if (step.status !== 'error') {
          return { ...step, status: 'pending' };
        }
        return step;
      }));
    }
  }, [isAuthenticated, agentWalletAddress, agentWalletExists, builderFeeApproved, account, isRunning]);

  // Check if all steps are complete
  const isComplete = useMemo(() => {
    return isAuthenticated && agentWalletExists && builderFeeApproved && !!account;
  }, [isAuthenticated, agentWalletExists, builderFeeApproved, account]);

  // Get current step (first non-completed step that's in_progress)
  const currentStep = useMemo(() => {
    return steps.find(step => step.status === 'in_progress') || null;
  }, [steps]);

  // Main setup orchestration
  const startSetup = useCallback(async () => {
    if (!isConnected) {
      setError('Wallet not connected');
      return;
    }

    if (isComplete) {
      return;
    }

    setIsRunning(true);
    setError(null);

    try {
      // Step 1: Authenticate with Pear
      if (!isAuthenticated) {
        console.log('[useOneClickSetup] Starting authentication...');
        updateStep('auth', 'in_progress');

        await authenticate();

        // Check for auth error
        if (authError) {
          throw new Error(authError);
        }

        updateStep('auth', 'completed');
        console.log('[useOneClickSetup] Authentication complete');
      }

      // Step 2: Create Agent Wallet
      let walletAddr = agentWalletAddress;
      if (!walletAddr) {
        console.log('[useOneClickSetup] Creating agent wallet...');
        updateStep('agentWallet', 'in_progress');

        walletAddr = await createAgentWallet();

        if (!walletAddr) {
          throw new Error(agentWalletError || 'Failed to create agent wallet');
        }

        updateStep('agentWallet', 'completed');
        console.log('[useOneClickSetup] Agent wallet created:', walletAddr);
      }

      // Step 3: Approve Agent on Hyperliquid
      if (!agentWalletExists && walletAddr) {
        console.log('[useOneClickSetup] Approving agent on Hyperliquid...');
        updateStep('agentApproval', 'in_progress');

        await approveAgentWallet(walletAddr);

        updateStep('agentApproval', 'completed');
        console.log('[useOneClickSetup] Agent approved on Hyperliquid');
      }

      // Step 4: Approve Builder Fee
      if (!builderFeeApproved) {
        console.log('[useOneClickSetup] Approving builder fee...');
        updateStep('builderFee', 'in_progress');

        await approveBuilderFee();

        updateStep('builderFee', 'completed');
        console.log('[useOneClickSetup] Builder fee approved');
      }

      // Step 5: Create Salt Account
      if (!account) {
        console.log('[useOneClickSetup] Creating Salt account...');
        updateStep('saltAccount', 'in_progress');

        await createAccount();

        updateStep('saltAccount', 'completed');
        console.log('[useOneClickSetup] Salt account created');
      }

      console.log('[useOneClickSetup] Setup complete!');
    } catch (err: any) {
      console.error('[useOneClickSetup] Setup failed:', err);
      const errorMessage = err?.message || 'Setup failed';
      setError(errorMessage);

      // Mark current in_progress step as error
      setSteps(prev => prev.map(step =>
        step.status === 'in_progress'
          ? { ...step, status: 'error', error: errorMessage }
          : step
      ));
    } finally {
      setIsRunning(false);
    }
  }, [
    isConnected,
    isComplete,
    isAuthenticated,
    agentWalletAddress,
    agentWalletExists,
    builderFeeApproved,
    account,
    authenticate,
    createAgentWallet,
    approveAgentWallet,
    approveBuilderFee,
    createAccount,
    authError,
    agentWalletError,
    builderFeeError,
    saltAccountError,
    updateStep,
  ]);

  // Reset to retry from failed step
  const reset = useCallback(() => {
    setError(null);
    setSteps(prev => prev.map(step =>
      step.status === 'error'
        ? { ...step, status: 'pending', error: undefined }
        : step
    ));
  }, []);

  return {
    steps,
    currentStep,
    isRunning,
    isComplete,
    error,
    startSetup,
    reset,
  };
}
