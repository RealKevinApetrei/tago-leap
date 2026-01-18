'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';

export type PanelType = 'portfolio' | 'risk' | null;

// Panel animation variants
const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
} as const;

const leftPanelVariants = {
  hidden: { x: '-100%', opacity: 0.8 },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 30,
      mass: 0.8,
    },
  },
  exit: {
    x: '-100%',
    opacity: 0.8,
    transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] as const },
  },
} as const;

const rightPanelVariants = {
  hidden: { x: '100%', opacity: 0.8 },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 30,
      mass: 0.8,
    },
  },
  exit: {
    x: '100%',
    opacity: 0.8,
    transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] as const },
  },
} as const;

const tabHoverVariants = {
  rest: { scale: 1, width: 40 },
  hover: { scale: 1.05, width: 48 },
} as const;

interface SidePanelsContextType {
  activePanel: PanelType;
  openPanel: (panel: PanelType) => void;
  closePanel: () => void;
  togglePanel: (panel: PanelType) => void;
}

const SidePanelsContext = createContext<SidePanelsContextType | null>(null);

export function useSidePanels() {
  const context = useContext(SidePanelsContext);
  if (!context) {
    throw new Error('useSidePanels must be used within a SidePanelsProvider');
  }
  return context;
}

interface SidePanelsProviderProps {
  children: ReactNode;
  portfolioContent: ReactNode;
  riskContent: ReactNode;
  activePanel?: PanelType;
  onPanelChange?: (panel: PanelType) => void;
  /** Whether trading setup is complete */
  isSetupComplete?: boolean;
  /** Callback when Connect to Trade button is clicked */
  onConnectClick?: () => void;
}

export function SidePanelsProvider({
  children,
  portfolioContent,
  riskContent,
  activePanel: controlledActivePanel,
  onPanelChange,
  isSetupComplete = true,
  onConnectClick,
}: SidePanelsProviderProps) {
  const [internalActivePanel, setInternalActivePanel] = useState<PanelType>(null);

  // Use controlled state if provided, otherwise use internal state
  const activePanel = controlledActivePanel !== undefined ? controlledActivePanel : internalActivePanel;
  const setActivePanel = onPanelChange || setInternalActivePanel;

  const openPanel = (panel: PanelType) => setActivePanel(panel);
  const closePanel = () => setActivePanel(null);
  const togglePanel = (panel: PanelType) => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  return (
    <SidePanelsContext.Provider value={{ activePanel, openPanel, closePanel, togglePanel }}>
      {children}

      {/* Backdrop */}
      <AnimatePresence>
        {activePanel && (
          <motion.div
            className="fixed inset-0 bg-black/60 z-40"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={closePanel}
          />
        )}
      </AnimatePresence>

      {/* Left Edge Tab - Portfolio */}
      <motion.button
        onClick={() => togglePanel('portfolio')}
        className={`
          fixed left-0 top-1/2 -translate-y-1/2 z-50
          flex items-center justify-center
          h-32
          bg-gradient-to-r from-white/[0.08] to-white/[0.04]
          border-y border-r border-white/[0.1]
          rounded-r-xl
          ${activePanel === 'portfolio' ? 'bg-tago-yellow-400/20 border-tago-yellow-400/30' : ''}
        `}
        initial="rest"
        whileHover="hover"
        whileTap={{ scale: 0.95 }}
        variants={tabHoverVariants}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        <div className="flex flex-col items-center gap-2">
          <motion.svg
            className={`w-5 h-5 ${activePanel === 'portfolio' ? 'text-tago-yellow-400' : 'text-white/50'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            animate={{ rotate: activePanel === 'portfolio' ? 360 : 0 }}
            transition={{ duration: 0.5 }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
          </motion.svg>
          <span className={`text-[10px] font-medium tracking-wider uppercase ${activePanel === 'portfolio' ? 'text-tago-yellow-400' : 'text-white/40'}`}
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            Portfolio
          </span>
        </div>
      </motion.button>

      {/* Right Edge Tab - Risk */}
      <motion.button
        onClick={() => togglePanel('risk')}
        className={`
          fixed right-0 top-1/2 -translate-y-1/2 z-50
          flex items-center justify-center
          h-32
          bg-gradient-to-l from-white/[0.08] to-white/[0.04]
          border-y border-l border-white/[0.1]
          rounded-l-xl
          ${activePanel === 'risk' ? 'bg-amber-500/20 border-amber-500/30' : ''}
        `}
        initial="rest"
        whileHover="hover"
        whileTap={{ scale: 0.95 }}
        variants={tabHoverVariants}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        <div className="flex flex-col items-center gap-2">
          <motion.svg
            className={`w-5 h-5 ${activePanel === 'risk' ? 'text-amber-400' : 'text-white/50'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            animate={{ rotate: activePanel === 'risk' ? 360 : 0 }}
            transition={{ duration: 0.5 }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </motion.svg>
          <span className={`text-[10px] font-medium tracking-wider uppercase ${activePanel === 'risk' ? 'text-amber-400' : 'text-white/40'}`}
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            Risk
          </span>
        </div>
      </motion.button>

      {/* Portfolio Panel - Slides from Left */}
      <AnimatePresence>
        {activePanel === 'portfolio' && (
          <motion.div
            className="fixed top-16 left-0 bottom-0 z-50 w-[calc(100%-3rem)] max-w-6xl bg-gradient-to-br from-black/95 via-black/90 to-black/95 border-r border-white/[0.08] shadow-2xl shadow-black/50 overflow-y-auto"
            variants={leftPanelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
        {/* Panel Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-black/80 backdrop-blur-md border-b border-white/[0.05]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-tago-yellow-400/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-tago-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-light text-white">Portfolio</h2>
              <p className="text-xs text-white/40">Your positions and trading history</p>
            </div>
          </div>
          <button
            onClick={closePanel}
            className="p-2 rounded-lg hover:bg-white/[0.05] transition-colors"
          >
            <svg className="w-5 h-5 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Panel Content */}
        <div className="p-6 relative">
          {/* Blur overlay when setup incomplete */}
          {!isSetupComplete && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center backdrop-blur-md bg-black/60">
              <div className="text-center max-w-sm px-6">
                <div className="w-16 h-16 rounded-full bg-tago-yellow-400/10 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-tago-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Setup Required</h3>
                <p className="text-sm text-white/50 mb-6">
                  Complete your trading setup to view your portfolio and positions
                </p>
                {onConnectClick && (
                  <Button variant="yellow" onClick={onConnectClick}>
                    Connect to Trade
                  </Button>
                )}
              </div>
            </div>
          )}
          {portfolioContent}
        </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Risk Panel - Slides from Right */}
      <AnimatePresence>
        {activePanel === 'risk' && (
          <motion.div
            className="fixed top-16 right-0 bottom-0 z-50 w-[calc(100%-3rem)] max-w-6xl bg-gradient-to-bl from-black/95 via-black/90 to-black/95 border-l border-white/[0.08] shadow-2xl shadow-black/50 flex flex-col"
            variants={rightPanelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
        {/* Panel Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 bg-black/80 backdrop-blur-md border-b border-white/[0.05]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-light text-white">Risk Management</h2>
              <p className="text-[10px] text-white/40">Trading limits & strategies</p>
            </div>
          </div>
          <button
            onClick={closePanel}
            className="p-2 rounded-lg hover:bg-white/[0.05] transition-colors"
          >
            <svg className="w-5 h-5 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Panel Content - flex-1 to fill remaining space */}
        <div className="flex-1 p-6 relative overflow-y-auto">
          {/* Blur overlay when setup incomplete */}
          {!isSetupComplete && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center backdrop-blur-md bg-black/60">
              <div className="text-center max-w-sm px-6">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Setup Required</h3>
                <p className="text-sm text-white/50 mb-6">
                  Complete your trading setup to configure risk management settings
                </p>
                {onConnectClick && (
                  <Button variant="yellow" onClick={onConnectClick}>
                    Connect to Trade
                  </Button>
                )}
              </div>
            </div>
          )}
          {riskContent}
        </div>
          </motion.div>
        )}
      </AnimatePresence>
    </SidePanelsContext.Provider>
  );
}
