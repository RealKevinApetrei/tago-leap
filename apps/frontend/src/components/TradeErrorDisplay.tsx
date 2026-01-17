'use client';

import { TradeError, TradeErrorCode, ERROR_MESSAGES } from '@tago-leap/shared/types';
import { Button } from '@/components/ui/Button';

interface TradeErrorDisplayProps {
  error: Partial<TradeError> & { message: string };
  onRetry?: () => void;
  onAction?: () => void;
  onDismiss?: () => void;
  className?: string;
}

function getErrorCategory(code: TradeErrorCode | undefined): 'setup' | 'balance' | 'policy' | 'execution' | 'network' {
  if (!code || typeof code !== 'string') return 'execution';
  const codeNum = parseInt(code.replace('E', ''));
  if (isNaN(codeNum)) return 'execution';
  if (codeNum >= 100 && codeNum < 200) return 'setup';
  if (codeNum >= 200 && codeNum < 300) return 'balance';
  if (codeNum >= 300 && codeNum < 400) return 'policy';
  if (codeNum >= 400 && codeNum < 500) return 'execution';
  return 'network';
}

function getErrorIcon(category: ReturnType<typeof getErrorCategory>) {
  switch (category) {
    case 'setup':
      return (
        <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      );
    case 'balance':
      return (
        <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
          <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
        </svg>
      );
    case 'policy':
      return (
        <svg className="w-5 h-5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      );
    case 'execution':
      return (
        <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      );
    case 'network':
      return (
        <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M17.778 8.222c-4.296-4.296-11.26-4.296-15.556 0A1 1 0 01.808 6.808c5.076-5.077 13.308-5.077 18.384 0a1 1 0 01-1.414 1.414zM14.95 11.05a7 7 0 00-9.9 0 1 1 0 01-1.414-1.414 9 9 0 0112.728 0 1 1 0 01-1.414 1.414zM12.12 13.88a3 3 0 00-4.242 0 1 1 0 01-1.415-1.415 5 5 0 017.072 0 1 1 0 01-1.415 1.415zM9 16a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
        </svg>
      );
  }
}

function getCategoryStyles(category: ReturnType<typeof getErrorCategory>) {
  switch (category) {
    case 'setup':
      return 'bg-blue-500/10 border-blue-500/20';
    case 'balance':
      return 'bg-yellow-500/10 border-yellow-500/20';
    case 'policy':
      return 'bg-orange-500/10 border-orange-500/20';
    case 'execution':
      return 'bg-red-500/10 border-red-500/20';
    case 'network':
      return 'bg-gray-500/10 border-gray-500/20';
  }
}

export function TradeErrorDisplay({
  error,
  onRetry,
  onAction,
  onDismiss,
  className = '',
}: TradeErrorDisplayProps) {
  const category = getErrorCategory(error.code);
  const showRetry = category === 'execution' || category === 'network';
  const showTechnicalDetails = error.technicalMessage && (category === 'execution' || category === 'network');

  return (
    <div className={`rounded-xl border p-4 ${getCategoryStyles(category)} ${className}`}>
      {/* Header */}
      <div className="flex items-start gap-3">
        {getErrorIcon(category)}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {error.code && <span className="text-xs font-mono text-white/40">[{error.code}]</span>}
            <span className="text-sm font-medium text-white">{getCategoryLabel(category)}</span>
          </div>
          <p className="text-sm text-white/70">{error.message}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-white/40 hover:text-white/60 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Technical details (collapsible) */}
      {showTechnicalDetails && (
        <details className="mt-3 group">
          <summary className="text-xs text-white/40 cursor-pointer hover:text-white/60 flex items-center gap-1">
            <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Technical details
          </summary>
          <pre className="mt-2 text-xs text-white/50 bg-black/20 rounded-lg p-2 overflow-x-auto">
            {error.technicalMessage}
          </pre>
        </details>
      )}

      {/* Actions */}
      {(error.action || showRetry) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {error.action && (
            error.actionUrl ? (
              <a
                href={error.actionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-tago-yellow-400 text-black text-sm font-medium rounded-lg hover:bg-tago-yellow-300 transition-colors"
              >
                {error.action}
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            ) : onAction ? (
              <Button variant="yellow" size="sm" onClick={onAction}>
                {error.action}
              </Button>
            ) : (
              <span className="text-xs text-white/50">{error.action}</span>
            )
          )}

          {showRetry && onRetry && (
            <Button variant="ghost" size="sm" onClick={onRetry}>
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retry
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function getCategoryLabel(category: ReturnType<typeof getErrorCategory>): string {
  switch (category) {
    case 'setup':
      return 'Setup Required';
    case 'balance':
      return 'Balance Issue';
    case 'policy':
      return 'Policy Violation';
    case 'execution':
      return 'Execution Failed';
    case 'network':
      return 'Network Error';
  }
}

/**
 * Helper to create a TradeError from an error code
 */
export function createTradeErrorFromCode(
  code: TradeErrorCode,
  technicalMessage?: string
): TradeError {
  const template = ERROR_MESSAGES[code];
  return {
    code,
    message: template.message,
    action: template.action,
    actionUrl: template.actionUrl,
    technicalMessage,
  };
}

/**
 * Helper to parse API errors into TradeError
 */
export function parseApiErrorToTradeError(error: unknown): TradeError {
  // If it's already a TradeError, return it
  if (isTradeError(error)) {
    return error;
  }

  // If it's an Error with a message, try to parse it
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Map common error messages to TradeErrorCode
    if (message.includes('insufficient') || message.includes('balance')) {
      return createTradeErrorFromCode(TradeErrorCode.INSUFFICIENT_BALANCE, error.message);
    }
    if (message.includes('authenticate') || message.includes('sign in')) {
      return createTradeErrorFromCode(TradeErrorCode.NOT_AUTHENTICATED, error.message);
    }
    if (message.includes('agent wallet') && message.includes('missing')) {
      return createTradeErrorFromCode(TradeErrorCode.AGENT_WALLET_MISSING, error.message);
    }
    if (message.includes('agent wallet') && message.includes('approved')) {
      return createTradeErrorFromCode(TradeErrorCode.AGENT_WALLET_NOT_APPROVED, error.message);
    }
    if (message.includes('builder fee')) {
      return createTradeErrorFromCode(TradeErrorCode.BUILDER_FEE_NOT_APPROVED, error.message);
    }
    if (message.includes('leverage')) {
      return createTradeErrorFromCode(TradeErrorCode.LEVERAGE_EXCEEDED, error.message);
    }
    if (message.includes('notional') || message.includes('daily limit')) {
      return createTradeErrorFromCode(TradeErrorCode.DAILY_NOTIONAL_EXCEEDED, error.message);
    }
    if (message.includes('slippage')) {
      return createTradeErrorFromCode(TradeErrorCode.SLIPPAGE_EXCEEDED, error.message);
    }
    if (message.includes('rejected')) {
      return createTradeErrorFromCode(TradeErrorCode.TRADE_REJECTED, error.message);
    }
    if (message.includes('timeout')) {
      return createTradeErrorFromCode(TradeErrorCode.TIMEOUT, error.message);
    }
    if (message.includes('network') || message.includes('fetch')) {
      return createTradeErrorFromCode(TradeErrorCode.NETWORK_ERROR, error.message);
    }
    if (message.includes('hyperliquid')) {
      return createTradeErrorFromCode(TradeErrorCode.HYPERLIQUID_ERROR, error.message);
    }

    // Default to generic execution error
    return createTradeErrorFromCode(TradeErrorCode.TRADE_REJECTED, error.message);
  }

  // Unknown error type
  return createTradeErrorFromCode(TradeErrorCode.SERVICE_UNAVAILABLE, String(error));
}

function isTradeError(error: unknown): error is TradeError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof (error as TradeError).code === 'string' &&
    (error as TradeError).code.startsWith('E')
  );
}
