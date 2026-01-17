import Anthropic from '@anthropic-ai/sdk';
import { serverEnv } from '../env';
import type { PearMarket, NarrativeSuggestion } from '@tago-leap/shared/types';

const getClient = () => new Anthropic({
  apiKey: serverEnv.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are a JSON API that creates cryptocurrency pair trades. Output ONLY valid JSON, no other text.

CRITICAL RULES:
1. You can ONLY use asset symbols that appear EXACTLY in the "AVAILABLE ASSETS" list provided
2. DO NOT invent symbols like "AI" or use generic names - only use EXACT symbols from the list
3. If the user's idea doesn't match available assets well, find the CLOSEST match from the available list
4. For AI-related trades, look for tokens like RENDER, FET, AGIX, TAO, etc. in the available list
5. For ETH alternatives, use the exact ETH symbol if available

Output this JSON structure:
{"narrative":"Name","rationale":"Explanation","longAssets":[{"asset":"EXACT_SYMBOL","weight":1.0,"name":"Token Name"}],"shortAssets":[{"asset":"EXACT_SYMBOL","weight":1.0,"name":"Token Name"}],"confidence":0.8,"suggestedLeverage":3,"suggestedStakeUsd":100,"warnings":[]}`;

export async function generateNarrativeSuggestion(
  userPrompt: string,
  availableMarkets: PearMarket[]
): Promise<NarrativeSuggestion> {
  if (availableMarkets.length > 0) {
    console.log('[claudeClient] First market structure:', JSON.stringify(availableMarkets[0], null, 2));
  }

  const uniqueAssets = new Set<string>();

  for (const market of availableMarkets) {
    if (Array.isArray(market.longAssets)) {
      for (const assetItem of market.longAssets) {
        if (assetItem && assetItem.asset) {
          uniqueAssets.add(assetItem.asset);
        }
      }
    }

    if (Array.isArray(market.shortAssets)) {
      for (const assetItem of market.shortAssets) {
        if (assetItem && assetItem.asset) {
          uniqueAssets.add(assetItem.asset);
        }
      }
    }
  }

  const symbolList = Array.from(uniqueAssets).sort();
  const assetsContext = symbolList.map(s => `- ${s}`).join('\n');

  console.log(`[claudeClient] Found ${symbolList.length} unique assets: ${symbolList.join(', ')}`);

  const userMessage = `User's trading idea: "${userPrompt}"

=== AVAILABLE ASSETS (YOU MUST USE ONLY THESE EXACT SYMBOLS) ===
${assetsContext}

SYMBOLS LIST: ${symbolList.join(', ')}

=== INSTRUCTIONS ===
Create a pair trade using ONLY symbols from the list above. Pick the best matching assets for the user's thesis.
For "AI tokens" look for: RENDER, FET, TAO, RNDR, WLD, ARKM, or similar if available.
For "ETH" use: ETH if available.
Output ONLY the JSON object.`;

  const client = getClient();
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const textContent = response.content.find(block => block.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  console.log('[claudeClient] Raw Claude response:', textContent.text.substring(0, 500));

  let jsonText = textContent.text.trim();

  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.slice(7);
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.slice(3);
  }
  if (jsonText.endsWith('```')) {
    jsonText = jsonText.slice(0, -3);
  }
  jsonText = jsonText.trim();

  const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonText = jsonMatch[0];
  }

  try {
    const suggestion = JSON.parse(jsonText) as NarrativeSuggestion;

    if (!suggestion.narrative || !suggestion.longAssets || !suggestion.shortAssets) {
      throw new Error('Invalid suggestion structure');
    }

    return suggestion;
  } catch (parseError) {
    console.error('[claudeClient] Failed to parse JSON. Text was:', jsonText.substring(0, 200));
    throw new Error(`Failed to parse Claude response as JSON: ${parseError}`);
  }
}

export function validateSuggestionAssets(
  suggestion: NarrativeSuggestion,
  availableMarkets: PearMarket[]
): { valid: boolean; invalidAssets: string[] } {
  const availableAssets = new Set<string>();

  for (const market of availableMarkets) {
    if (Array.isArray(market.longAssets)) {
      for (const assetItem of market.longAssets) {
        if (assetItem && assetItem.asset) {
          availableAssets.add(assetItem.asset.toUpperCase());
        }
      }
    }

    if (Array.isArray(market.shortAssets)) {
      for (const assetItem of market.shortAssets) {
        if (assetItem && assetItem.asset) {
          availableAssets.add(assetItem.asset.toUpperCase());
        }
      }
    }
  }

  const invalidAssets: string[] = [];

  for (const asset of [...suggestion.longAssets, ...suggestion.shortAssets]) {
    if (!availableAssets.has(asset.asset.toUpperCase())) {
      invalidAssets.push(asset.asset);
    }
  }

  return {
    valid: invalidAssets.length === 0,
    invalidAssets,
  };
}
