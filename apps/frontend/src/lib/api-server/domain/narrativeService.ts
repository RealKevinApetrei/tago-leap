import type { NarrativeSuggestion } from '@tago-leap/shared/types';
import { getMarkets } from '../clients/pearClient';
import { generateNarrativeSuggestion, validateSuggestionAssets } from '../clients/claudeClient';

export async function suggestNarrative(userPrompt: string): Promise<NarrativeSuggestion> {
  console.log('[narrativeService] Fetching markets from Pear API...');
  let marketsResponse;
  try {
    marketsResponse = await getMarkets({
      active: true,
      pageSize: 100,
    });
    console.log(`[narrativeService] Got ${marketsResponse.markets?.length || 0} markets`);
  } catch (err: any) {
    console.error('[narrativeService] Failed to fetch markets:', err?.message);
    throw new Error(`Failed to fetch markets: ${err?.message}`);
  }

  if (!marketsResponse.markets || marketsResponse.markets.length === 0) {
    throw new Error('No markets available on Pear Protocol');
  }

  console.log('[narrativeService] Calling Claude for suggestion...');
  let suggestion;
  try {
    suggestion = await generateNarrativeSuggestion(userPrompt, marketsResponse.markets);
    console.log('[narrativeService] Got suggestion:', suggestion.narrative);
  } catch (err: any) {
    console.error('[narrativeService] Claude API failed:', err?.message);
    throw new Error(`Claude API failed: ${err?.message}`);
  }

  const validation = validateSuggestionAssets(suggestion, marketsResponse.markets);

  if (!validation.valid) {
    suggestion.warnings = suggestion.warnings || [];
    suggestion.warnings.push(
      `Some suggested assets may not be available: ${validation.invalidAssets.join(', ')}`
    );
    suggestion.confidence = Math.max(0.3, suggestion.confidence - 0.3);
  }

  normalizeWeights(suggestion);

  return suggestion;
}

function normalizeWeights(suggestion: NarrativeSuggestion): void {
  const longTotal = suggestion.longAssets.reduce((sum, a) => sum + a.weight, 0);
  const shortTotal = suggestion.shortAssets.reduce((sum, a) => sum + a.weight, 0);

  if (longTotal > 0) {
    for (const asset of suggestion.longAssets) {
      asset.weight = asset.weight / longTotal;
    }
  }

  if (shortTotal > 0) {
    for (const asset of suggestion.shortAssets) {
      asset.weight = asset.weight / shortTotal;
    }
  }
}

export async function validateModifiedSuggestion(
  suggestion: NarrativeSuggestion
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  if (!suggestion.longAssets || suggestion.longAssets.length === 0) {
    errors.push('At least one long asset is required');
  }

  if (!suggestion.shortAssets || suggestion.shortAssets.length === 0) {
    errors.push('At least one short asset is required');
  }

  const longTotal = suggestion.longAssets?.reduce((sum, a) => sum + a.weight, 0) || 0;
  const shortTotal = suggestion.shortAssets?.reduce((sum, a) => sum + a.weight, 0) || 0;

  if (Math.abs(longTotal - 1.0) > 0.01) {
    errors.push(`Long asset weights must sum to 1.0 (currently ${longTotal.toFixed(2)})`);
  }

  if (Math.abs(shortTotal - 1.0) > 0.01) {
    errors.push(`Short asset weights must sum to 1.0 (currently ${shortTotal.toFixed(2)})`);
  }

  if (suggestion.suggestedLeverage < 1 || suggestion.suggestedLeverage > 100) {
    errors.push('Leverage must be between 1 and 100');
  }

  if (suggestion.suggestedStakeUsd < 1) {
    errors.push('Minimum stake is $1 USD');
  }

  const marketsResponse = await getMarkets({ active: true, pageSize: 100 });
  const validation = validateSuggestionAssets(suggestion, marketsResponse.markets);

  if (!validation.valid) {
    errors.push(`Invalid assets: ${validation.invalidAssets.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
