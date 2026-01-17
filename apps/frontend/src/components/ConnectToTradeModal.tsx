'use client';

import { useUnifiedSetupContext } from '@/contexts/UnifiedSetupContext';
import { Button } from '@/components/ui/Button';
import type { UnifiedStep } from '@/hooks/useUnifiedSetup';

export function ConnectToTradeModal() {
  const {
    isModalOpen,
    closeSetupModal,
    steps,
    currentStep,
    isRunning,
    isSetupComplete,
    isXConnected,
    isFullyReady,
    needsDeposit,
    error,
    startSetup,
    reset,
    openDeposit,
    hlBalance,
  } = useUnifiedSetupContext();

  if (!isModalOpen) return null;

  // Get step icon based on status
  const getStepIcon = (step: UnifiedStep, index: number) => {
    if (step.status === 'completed') {
      return (
        <div className="w-7 h-7 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      );
    }
    if (step.status === 'in_progress') {
      return (
        <div className="w-7 h-7 rounded-full bg-yellow-400/20 flex items-center justify-center flex-shrink-0">
          <div className="w-4 h-4 rounded-full border-2 border-yellow-400 border-t-transparent animate-spin" />
        </div>
      );
    }
    if (step.status === 'error') {
      return (
        <div className="w-7 h-7 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      );
    }
    // Pending
    return (
      <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
        <span className="text-xs text-white/40 font-medium">{index + 1}</span>
      </div>
    );
  };

  // Get button text
  const getButtonText = () => {
    if (isFullyReady) return 'Ready to Trade!';
    if (isRunning) return currentStep?.label || 'Processing...';
    if (error) return 'Retry';
    if (isSetupComplete && !isXConnected) return 'Connect X Account';
    return 'Connect to Trade';
  };

  // Check if at Hyperliquid approval step with 0 balance
  const showDepositWarning = needsDeposit && currentStep?.id === 'agentApproval';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]"
        onClick={closeSetupModal}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-[101] p-4">
        <div className="w-full max-w-md bg-gradient-to-br from-[#0a0a0a] to-[#111] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-white/[0.06]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-medium text-white">
                  {isFullyReady ? 'Setup Complete!' : 'Connect to Trade'}
                </h2>
                <p className="text-sm text-white/50 mt-1">
                  {isFullyReady
                    ? 'You\'re all set to start trading'
                    : 'Complete setup to start social trading'
                  }
                </p>
              </div>
              <button
                onClick={closeSetupModal}
                className="p-2 rounded-lg hover:bg-white/[0.05] transition-colors"
              >
                <svg className="w-5 h-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Steps */}
          <div className="px-6 py-4 space-y-2 max-h-[400px] overflow-y-auto">
            {steps.map((step, idx) => (
              <div
                key={step.id}
                className={`flex items-start gap-3 p-3 rounded-xl transition-all ${
                  step.status === 'in_progress'
                    ? 'bg-yellow-400/5 border border-yellow-400/20'
                    : step.status === 'completed'
                    ? 'bg-green-500/5'
                    : step.status === 'error'
                    ? 'bg-red-500/5 border border-red-500/20'
                    : 'bg-white/[0.02]'
                }`}
              >
                {getStepIcon(step, idx)}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${
                    step.status === 'completed' ? 'text-green-400' :
                    step.status === 'in_progress' ? 'text-yellow-400' :
                    step.status === 'error' ? 'text-red-400' :
                    'text-white/60'
                  }`}>
                    {step.label}
                  </p>
                  {step.status === 'in_progress' && (
                    <p className="text-xs text-white/40 mt-0.5">{step.description}</p>
                  )}
                  {step.status === 'error' && step.error && (
                    <p className="text-xs text-red-400/70 mt-0.5">
                      {step.error.includes('rejected') || step.error.includes('denied')
                        ? 'Signature cancelled - click below to retry'
                        : step.error
                      }
                    </p>
                  )}

                  {/* Deposit warning for Hyperliquid approval */}
                  {step.id === 'agentApproval' && step.status !== 'completed' && hlBalance === 0 && (
                    <div className="mt-2 p-2 rounded-lg bg-yellow-400/10 border border-yellow-400/20">
                      <p className="text-xs text-yellow-400 font-medium">
                        Requires USDC deposit on Hyperliquid
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeposit();
                        }}
                        className="mt-1.5 text-xs text-yellow-400 hover:text-yellow-300 underline"
                      >
                        Deposit USDC →
                      </button>
                    </div>
                  )}
                </div>
                {step.status === 'in_progress' && (
                  <span className="text-[10px] text-yellow-400/60 flex-shrink-0">
                    Waiting...
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Success state */}
          {isFullyReady && (
            <div className="px-6 py-4 bg-green-500/5 border-t border-green-500/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-green-400">All set!</p>
                  <p className="text-xs text-white/50">You can now execute trades on social narratives</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="px-6 py-4 border-t border-white/[0.06]">
            {isFullyReady ? (
              <Button
                variant="yellow"
                fullWidth
                size="lg"
                onClick={closeSetupModal}
              >
                Start Trading
              </Button>
            ) : (
              <Button
                variant="yellow"
                fullWidth
                size="lg"
                onClick={() => {
                  if (error) {
                    reset();
                  }
                  startSetup();
                }}
                loading={isRunning}
              >
                {getButtonText()}
              </Button>
            )}

            {/* Help text */}
            {!isFullyReady && !isRunning && (
              <p className="text-xs text-white/30 text-center mt-3">
                {isSetupComplete && !isXConnected
                  ? 'Connect your X account to enable social trading'
                  : 'One-time setup. You\'ll sign a few messages to enable trading.'
                }
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
