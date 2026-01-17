// Trade Error Codes and Messages
// Organized by category for easy identification

export enum TradeErrorCode {
  // Setup errors (1xx) - User needs to complete onboarding
  NOT_AUTHENTICATED = 'E101',
  AGENT_WALLET_MISSING = 'E102',
  AGENT_WALLET_NOT_APPROVED = 'E103',
  BUILDER_FEE_NOT_APPROVED = 'E104',
  SALT_ACCOUNT_MISSING = 'E105',

  // Balance errors (2xx) - Insufficient funds
  INSUFFICIENT_BALANCE = 'E201',
  INSUFFICIENT_MARGIN = 'E202',
  BALANCE_CHECK_FAILED = 'E203',

  // Policy errors (3xx) - Trade violates policy limits
  LEVERAGE_EXCEEDED = 'E301',
  DAILY_NOTIONAL_EXCEEDED = 'E302',
  ASSET_NOT_ALLOWED = 'E303',
  DRAWDOWN_LIMIT_REACHED = 'E304',

  // Execution errors (4xx) - Trade failed during execution
  TRADE_REJECTED = 'E401',
  SLIPPAGE_EXCEEDED = 'E402',
  POSITION_SIZE_TOO_SMALL = 'E403',
  MARKET_CLOSED = 'E404',
  HYPERLIQUID_ERROR = 'E405',

  // Network errors (5xx) - Infrastructure issues
  NETWORK_ERROR = 'E501',
  SERVICE_UNAVAILABLE = 'E502',
  TIMEOUT = 'E503',
}

export interface TradeError {
  code: TradeErrorCode;
  message: string;           // User-friendly message
  technicalMessage?: string; // For debugging
  action?: string;           // What user can do to fix
  actionUrl?: string;        // Link to resolve (e.g., Hyperliquid deposit)
}

// Error message definitions with recovery actions
export const ERROR_MESSAGES: Record<TradeErrorCode, Omit<TradeError, 'code' | 'technicalMessage'>> = {
  // Setup errors
  [TradeErrorCode.NOT_AUTHENTICATED]: {
    message: 'Please sign in to Pear Protocol to continue',
    action: 'Sign In',
  },
  [TradeErrorCode.AGENT_WALLET_MISSING]: {
    message: 'You need to create an agent wallet to trade',
    action: 'Create Agent Wallet',
  },
  [TradeErrorCode.AGENT_WALLET_NOT_APPROVED]: {
    message: 'Your agent wallet needs to be approved on Hyperliquid',
    action: 'Approve Agent Wallet',
  },
  [TradeErrorCode.BUILDER_FEE_NOT_APPROVED]: {
    message: 'You need to approve the builder fee on Hyperliquid',
    action: 'Approve Builder Fee',
  },
  [TradeErrorCode.SALT_ACCOUNT_MISSING]: {
    message: 'You need to create a robo account to use automated trading',
    action: 'Create Robo Account',
  },

  // Balance errors
  [TradeErrorCode.INSUFFICIENT_BALANCE]: {
    message: 'Not enough USDC in your Hyperliquid account for this trade',
    action: 'Deposit USDC',
    actionUrl: 'https://app.hyperliquid.xyz',
  },
  [TradeErrorCode.INSUFFICIENT_MARGIN]: {
    message: 'This trade would put your account health below safe levels',
    action: 'Reduce position size or deposit more funds',
    actionUrl: 'https://app.hyperliquid.xyz',
  },
  [TradeErrorCode.BALANCE_CHECK_FAILED]: {
    message: 'Unable to check your Hyperliquid balance. Please try again.',
    action: 'Retry',
  },

  // Policy errors
  [TradeErrorCode.LEVERAGE_EXCEEDED]: {
    message: 'This trade exceeds your maximum leverage limit',
    action: 'Reduce leverage or update policy',
  },
  [TradeErrorCode.DAILY_NOTIONAL_EXCEEDED]: {
    message: 'This trade would exceed your daily notional limit',
    action: 'Wait until tomorrow or update policy',
  },
  [TradeErrorCode.ASSET_NOT_ALLOWED]: {
    message: 'One or more assets in this trade are not in your allowed list',
    action: 'Update your allowed pairs in policy settings',
  },
  [TradeErrorCode.DRAWDOWN_LIMIT_REACHED]: {
    message: 'Trading paused: Your account has reached the maximum drawdown limit',
    action: 'Review positions and update policy if needed',
  },

  // Execution errors
  [TradeErrorCode.TRADE_REJECTED]: {
    message: 'Trade was rejected by the exchange',
    action: 'Check trade parameters and try again',
  },
  [TradeErrorCode.SLIPPAGE_EXCEEDED]: {
    message: 'Price moved too much. Trade cancelled to protect you.',
    action: 'Try again or increase slippage tolerance',
  },
  [TradeErrorCode.POSITION_SIZE_TOO_SMALL]: {
    message: 'Position size is below the minimum required',
    action: 'Increase stake amount',
  },
  [TradeErrorCode.MARKET_CLOSED]: {
    message: 'This market is currently closed or unavailable',
    action: 'Try a different market or wait',
  },
  [TradeErrorCode.HYPERLIQUID_ERROR]: {
    message: 'Hyperliquid returned an error',
    action: 'Check Hyperliquid status and try again',
    actionUrl: 'https://app.hyperliquid.xyz',
  },

  // Network errors
  [TradeErrorCode.NETWORK_ERROR]: {
    message: 'Network connection issue. Please check your internet.',
    action: 'Check connection and retry',
  },
  [TradeErrorCode.SERVICE_UNAVAILABLE]: {
    message: 'Service temporarily unavailable. Please try again.',
    action: 'Wait a moment and retry',
  },
  [TradeErrorCode.TIMEOUT]: {
    message: 'Request timed out. Please try again.',
    action: 'Retry',
  },
};

// Helper function to create a full TradeError from a code
export function createTradeError(
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

// Validation check status for pre-trade checks
export type ValidationStatus = 'passed' | 'failed' | 'warning' | 'pending';

export interface ValidationCheck {
  id: string;
  label: string;
  status: ValidationStatus;
  message?: string;
  error?: TradeError;
}

export interface ValidationResult {
  canTrade: boolean;
  checks: ValidationCheck[];
  errors: TradeError[];
  warnings: string[];
}

// Hyperliquid balance types
export interface HyperliquidBalance {
  /** Available USDC for new trades */
  availableBalance: number;
  /** Total account equity (balance + unrealized PnL) */
  equity: number;
  /** Margin locked in existing positions */
  lockedMargin: number;
  /** Maintenance margin requirement */
  maintenanceMargin: number;
  /** Account health percentage (0-100, higher is better) */
  accountHealth: number;
  /** Unrealized PnL across all positions */
  unrealizedPnl: number;
  /** Raw response for debugging */
  raw?: unknown;
}

// Trade validation params
export interface TradeValidationParams {
  stakeUsd: number;
  leverage: number;
  longAssets: Array<{ asset: string; weight: number }>;
  shortAssets: Array<{ asset: string; weight: number }>;
}

// Policy validation result from Salt service
export interface PolicyValidationResult {
  valid: boolean;
  violations: Array<{
    type: 'leverage' | 'notional' | 'asset' | 'drawdown';
    message: string;
    limit: number;
    actual: number;
  }>;
  warnings: string[];
  todayNotional: number;
  remainingNotional: number;
}
