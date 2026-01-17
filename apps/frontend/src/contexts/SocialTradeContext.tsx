'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { CryptoTweet } from '@/components/social/TweetCard';
import type { NarrativeSuggestion } from '@/lib/api';
import { pearApi } from '@/lib/api';

interface SocialTradeState {
  // Tweet selection
  selectedTweet: CryptoTweet | null;
  selectTweet: (tweet: CryptoTweet) => void;
  clearSelection: () => void;

  // Custom narrative input
  customNarrative: string;
  setCustomNarrative: (value: string) => void;

  // Trade suggestion
  suggestion: NarrativeSuggestion | null;
  isGenerating: boolean;
  generateError: string | null;

  // Quick trade generation from tweet
  generateFromTweet: (tweet: CryptoTweet, direction: 'long' | 'short') => Promise<void>;

  // Custom narrative trade generation
  generateFromCustom: () => Promise<void>;

  // Clear suggestion
  clearSuggestion: () => void;

  // Trade configuration
  stakeUsd: string;
  leverage: number;
  setStakeUsd: (value: string) => void;
  setLeverage: (value: number) => void;

  // Asset weight management
  updateAssetWeight: (side: 'long' | 'short', index: number, weight: number) => void;
  removeAsset: (side: 'long' | 'short', asset: string) => void;
}

const SocialTradeContext = createContext<SocialTradeState | null>(null);

export function SocialTradeProvider({ children }: { children: ReactNode }) {
  // Tweet selection state
  const [selectedTweet, setSelectedTweet] = useState<CryptoTweet | null>(null);
  const [customNarrative, setCustomNarrative] = useState('');

  // Trade suggestion state
  const [suggestion, setSuggestion] = useState<NarrativeSuggestion | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Trade configuration
  const [stakeUsd, setStakeUsd] = useState('100');
  const [leverage, setLeverage] = useState(3);

  // Select a tweet for custom input
  const selectTweet = useCallback((tweet: CryptoTweet) => {
    setSelectedTweet(tweet);
    setCustomNarrative('');
    setSuggestion(null);
    setGenerateError(null);
  }, []);

  // Clear tweet selection
  const clearSelection = useCallback(() => {
    setSelectedTweet(null);
    setCustomNarrative('');
  }, []);

  // Clear suggestion
  const clearSuggestion = useCallback(() => {
    setSuggestion(null);
    setGenerateError(null);
  }, []);

  // Update asset weight and normalize remaining weights
  const updateAssetWeight = useCallback((side: 'long' | 'short', index: number, weight: number) => {
    setSuggestion(prev => {
      if (!prev) return prev;

      const assets = side === 'long' ? [...prev.longAssets] : [...prev.shortAssets];
      if (index < 0 || index >= assets.length) return prev;

      // Update the target weight
      assets[index] = { ...assets[index], weight };

      // Calculate remaining weight to distribute
      const totalWeight = assets.reduce((sum, a) => sum + a.weight, 0);

      // Normalize weights to sum to 1 (100%)
      if (totalWeight > 0) {
        const scaleFactor = 1 / totalWeight;
        assets.forEach((a, i) => {
          assets[i] = { ...a, weight: a.weight * scaleFactor };
        });
      }

      return side === 'long'
        ? { ...prev, longAssets: assets }
        : { ...prev, shortAssets: assets };
    });
  }, []);

  // Remove asset and redistribute weights
  const removeAsset = useCallback((side: 'long' | 'short', asset: string) => {
    setSuggestion(prev => {
      if (!prev) return prev;

      const assets = side === 'long' ? [...prev.longAssets] : [...prev.shortAssets];
      const filteredAssets = assets.filter(a => a.asset !== asset);

      // Redistribute weights among remaining assets
      if (filteredAssets.length > 0) {
        const totalWeight = filteredAssets.reduce((sum, a) => sum + a.weight, 0);
        if (totalWeight > 0) {
          const scaleFactor = 1 / totalWeight;
          filteredAssets.forEach((a, i) => {
            filteredAssets[i] = { ...a, weight: a.weight * scaleFactor };
          });
        }
      }

      return side === 'long'
        ? { ...prev, longAssets: filteredAssets }
        : { ...prev, shortAssets: filteredAssets };
    });
  }, []);

  // Generate trade from tweet with direction (Bullish/Bearish buttons)
  const generateFromTweet = useCallback(async (tweet: CryptoTweet, direction: 'long' | 'short') => {
    setIsGenerating(true);
    setGenerateError(null);

    try {
      const assets = tweet.mentionedAssets.length > 0
        ? tweet.mentionedAssets.join(', ')
        : 'the assets mentioned';

      const prompt = direction === 'long'
        ? `Based on this crypto tweet: "${tweet.content}" by @${tweet.authorUsername}. I want to go LONG on ${assets}. Generate a trade.`
        : `Based on this crypto tweet: "${tweet.content}" by @${tweet.authorUsername}. I want to SHORT ${assets} (fade the narrative). Generate a trade.`;

      const result = await pearApi.suggestNarrative(prompt);
      setSuggestion(result);

      // Apply suggested stake/leverage if provided
      if (result.suggestedStakeUsd) {
        setStakeUsd(result.suggestedStakeUsd.toString());
      }
      if (result.suggestedLeverage) {
        setLeverage(result.suggestedLeverage);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate trade';
      setGenerateError(message);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // Generate trade from custom narrative
  const generateFromCustom = useCallback(async () => {
    if (!selectedTweet || !customNarrative.trim()) return;

    setIsGenerating(true);
    setGenerateError(null);

    try {
      const prompt = `Context tweet by @${selectedTweet.authorUsername}: "${selectedTweet.content}"

User's trading thesis: "${customNarrative}"

Generate a pair trade based on this analysis.`;

      const result = await pearApi.suggestNarrative(prompt);
      setSuggestion(result);

      // Apply suggested stake/leverage if provided
      if (result.suggestedStakeUsd) {
        setStakeUsd(result.suggestedStakeUsd.toString());
      }
      if (result.suggestedLeverage) {
        setLeverage(result.suggestedLeverage);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate trade';
      setGenerateError(message);
    } finally {
      setIsGenerating(false);
    }
  }, [selectedTweet, customNarrative]);

  const value: SocialTradeState = {
    selectedTweet,
    selectTweet,
    clearSelection,
    customNarrative,
    setCustomNarrative,
    suggestion,
    isGenerating,
    generateError,
    generateFromTweet,
    generateFromCustom,
    clearSuggestion,
    stakeUsd,
    leverage,
    setStakeUsd,
    setLeverage,
    updateAssetWeight,
    removeAsset,
  };

  return (
    <SocialTradeContext.Provider value={value}>
      {children}
    </SocialTradeContext.Provider>
  );
}

export function useSocialTrade() {
  const context = useContext(SocialTradeContext);
  if (!context) {
    throw new Error('useSocialTrade must be used within a SocialTradeProvider');
  }
  return context;
}
