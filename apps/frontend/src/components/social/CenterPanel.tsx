'use client';

import { useState, useEffect } from 'react';
import { TweetCard, type CryptoTweet } from './TweetCard';
import { Button } from '@/components/ui/Button';

// Animated placeholder suggestions
const PLACEHOLDER_SUGGESTIONS = [
  "I'm bullish on AI agents taking over DeFi...",
  "Memecoins are going to pump this week...",
  "ETH is undervalued compared to SOL right now...",
  "The AI narrative is just getting started...",
  "I think $VIRTUAL will 10x from here...",
  "Layer 2s are eating Ethereum's lunch...",
  "Gaming tokens are about to have their moment...",
  "DeFi yields are making a comeback...",
  "I want to fade the $PEPE hype...",
  "Infrastructure plays are the safe bet...",
  "The memecoin supercycle is real...",
  "I'm bearish on L1s that can't scale...",
];

interface CenterPanelProps {
  // Selected tweet (optional - for context)
  selectedTweet: CryptoTweet | null;
  onClearSelection: () => void;

  // Custom narrative input
  customNarrative: string;
  onNarrativeChange: (value: string) => void;
  onGenerateTrade: () => void;
  isGenerating: boolean;
}

export function CenterPanel({
  selectedTweet,
  onClearSelection,
  customNarrative,
  onNarrativeChange,
  onGenerateTrade,
  isGenerating,
}: CenterPanelProps) {
  // Always show the narrative input panel
  return (
    <NarrativeInputPanel
      selectedTweet={selectedTweet}
      onClearSelection={onClearSelection}
      customNarrative={customNarrative}
      onNarrativeChange={onNarrativeChange}
      onGenerateTrade={onGenerateTrade}
      isGenerating={isGenerating}
    />
  );
}

/**
 * Narrative Input Panel - Always shown in center
 */
function NarrativeInputPanel({
  selectedTweet,
  onClearSelection,
  customNarrative,
  onNarrativeChange,
  onGenerateTrade,
  isGenerating,
}: {
  selectedTweet: CryptoTweet | null;
  onClearSelection: () => void;
  customNarrative: string;
  onNarrativeChange: (value: string) => void;
  onGenerateTrade: () => void;
  isGenerating: boolean;
}) {
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [displayedPlaceholder, setDisplayedPlaceholder] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  // Animated typing effect for placeholder
  useEffect(() => {
    if (customNarrative.length > 0) return; // Don't animate if user is typing

    const currentSuggestion = PLACEHOLDER_SUGGESTIONS[placeholderIndex];
    let charIndex = 0;
    let typingTimeout: NodeJS.Timeout;
    let pauseTimeout: NodeJS.Timeout;

    if (isTyping) {
      // Type out the placeholder
      const typeChar = () => {
        if (charIndex <= currentSuggestion.length) {
          setDisplayedPlaceholder(currentSuggestion.slice(0, charIndex));
          charIndex++;
          typingTimeout = setTimeout(typeChar, 50 + Math.random() * 30);
        } else {
          // Pause at end then start erasing
          pauseTimeout = setTimeout(() => setIsTyping(false), 2000);
        }
      };
      typeChar();
    } else {
      // Erase the placeholder
      let eraseIndex = currentSuggestion.length;
      const eraseChar = () => {
        if (eraseIndex >= 0) {
          setDisplayedPlaceholder(currentSuggestion.slice(0, eraseIndex));
          eraseIndex--;
          typingTimeout = setTimeout(eraseChar, 20);
        } else {
          // Move to next suggestion
          setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDER_SUGGESTIONS.length);
          setIsTyping(true);
        }
      };
      eraseChar();
    }

    return () => {
      clearTimeout(typingTimeout);
      clearTimeout(pauseTimeout);
    };
  }, [placeholderIndex, isTyping, customNarrative.length]);

  const hasNarrative = customNarrative.trim().length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Selected Tweet Context (if any) */}
      {selectedTweet && (
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
            <img
              src={selectedTweet.authorAvatar || '/default-avatar.png'}
              alt={selectedTweet.authorDisplayName}
              className="w-8 h-8 rounded-full"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white/90 truncate">
                  {selectedTweet.authorDisplayName}
                </span>
                <span className="text-xs text-white/40">@{selectedTweet.authorUsername}</span>
              </div>
              <p className="text-sm text-white/60 line-clamp-2 mt-1">
                {selectedTweet.content}
              </p>
            </div>
            <button
              onClick={onClearSelection}
              className="p-1 rounded-md hover:bg-white/10 text-white/40 hover:text-white transition-colors"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Input Area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-lg space-y-6">
          {/* Title */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-light text-white/90">
              What's your narrative?
            </h2>
            <p className="text-sm text-white/40">
              Describe your market thesis and we'll generate a trade
            </p>
          </div>

          {/* Custom Narrative Input */}
          <div className="relative">
            <textarea
              value={customNarrative}
              onChange={(e) => onNarrativeChange(e.target.value)}
              placeholder={displayedPlaceholder || PLACEHOLDER_SUGGESTIONS[0]}
              className="w-full h-36 px-5 py-4 rounded-2xl bg-white/[0.03] border border-white/[0.1]
                text-white text-lg placeholder-white/25 resize-none
                focus:outline-none focus:ring-2 focus:ring-[#E8FF00]/30 focus:border-[#E8FF00]/30
                transition-all"
              maxLength={500}
            />
            {/* Typing cursor indicator when placeholder is animating */}
            {customNarrative.length === 0 && (
              <span className="absolute top-4 left-5 pointer-events-none text-lg text-white/25">
                {displayedPlaceholder}
                <span className="animate-pulse">|</span>
              </span>
            )}
            <div className="flex items-center justify-between mt-2 px-1">
              <span className="text-xs text-white/30">
                {selectedTweet ? 'Adding context from selected post' : 'Or select a post from the feed'}
              </span>
              <span className="text-xs text-white/40">{customNarrative.length}/500</span>
            </div>
          </div>

          {/* Generate Button */}
          <Button
            onClick={onGenerateTrade}
            disabled={!hasNarrative || isGenerating}
            className={`
              w-full h-14 text-lg font-semibold rounded-xl transition-all
              ${hasNarrative && !isGenerating
                ? 'bg-[#E8FF00] text-black hover:bg-[#d4eb00] shadow-lg shadow-[#E8FF00]/20'
                : 'bg-white/[0.08] text-white/40 cursor-not-allowed'
              }
            `}
          >
            {isGenerating ? (
              <span className="flex items-center justify-center gap-2">
                <LoadingSpinner className="w-5 h-5" />
                Generating Trade...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <SparklesIcon className="w-5 h-5" />
                Generate Trade
              </span>
            )}
          </Button>

          {/* Quick suggestions */}
          <div className="flex flex-wrap gap-2 justify-center">
            {['Bullish AI', 'Fade memes', 'Long SOL', 'DeFi revival'].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => onNarrativeChange(suggestion + ' - ')}
                className="px-3 py-1.5 text-xs font-medium rounded-full bg-white/[0.05] text-white/50
                  hover:bg-white/[0.1] hover:text-white/70 transition-colors border border-white/[0.08]"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Icons
function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}
