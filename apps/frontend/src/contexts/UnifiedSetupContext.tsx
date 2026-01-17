'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useUnifiedSetup, UnifiedStep, XAccount } from '@/hooks/useUnifiedSetup';
import { useDepositModal } from '@/components/DepositModal';

interface UnifiedSetupContextType {
  // Setup state
  steps: UnifiedStep[];
  currentStep: UnifiedStep | null;
  isRunning: boolean;
  isSetupComplete: boolean;

  // X Account state
  xAccount: XAccount | null;
  isConnectingX: boolean;
  isXConnected: boolean;

  // Combined state
  isFullyReady: boolean;
  needsDeposit: boolean;
  error: string | null;

  // Actions
  startSetup: () => Promise<void>;
  connectX: () => Promise<void>;
  disconnectX: () => Promise<void>;
  reset: () => void;

  // Modal state
  isModalOpen: boolean;
  openSetupModal: () => void;
  closeSetupModal: () => void;

  // Balance
  hlBalance: number;

  // Open deposit modal
  openDeposit: () => void;
}

const UnifiedSetupContext = createContext<UnifiedSetupContextType | null>(null);

export function UnifiedSetupProvider({ children }: { children: ReactNode }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
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
  } = useUnifiedSetup();

  const { openDeposit } = useDepositModal();

  const openSetupModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const closeSetupModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  // Auto-close modal when fully ready
  // useEffect(() => {
  //   if (isFullyReady && isModalOpen) {
  //     setTimeout(() => setIsModalOpen(false), 1500);
  //   }
  // }, [isFullyReady, isModalOpen]);

  const value: UnifiedSetupContextType = {
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
    startSetup: startUnifiedSetup,
    connectX,
    disconnectX,
    reset,
    isModalOpen,
    openSetupModal,
    closeSetupModal,
    hlBalance,
    openDeposit,
  };

  return (
    <UnifiedSetupContext.Provider value={value}>
      {children}
    </UnifiedSetupContext.Provider>
  );
}

export function useUnifiedSetupContext() {
  const context = useContext(UnifiedSetupContext);
  if (!context) {
    throw new Error('useUnifiedSetupContext must be used within a UnifiedSetupProvider');
  }
  return context;
}
