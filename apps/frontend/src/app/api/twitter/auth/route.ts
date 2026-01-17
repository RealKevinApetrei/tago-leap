import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAuthUrl, validateXConfig } from '@/lib/api-server/clients/twitterClient';

// Generate PKCE code verifier and challenge
function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  // Generate random code verifier (43-128 characters)
  const codeVerifier = crypto.randomBytes(32).toString('base64url');

  // Generate code challenge using SHA256
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  return { codeVerifier, codeChallenge };
}

/**
 * POST /api/twitter/auth
 * Initiates Twitter OAuth 2.0 PKCE flow
 */
export async function POST(request: NextRequest) {
  try {
    // Validate X configuration before proceeding
    const configError = validateXConfig();
    if (configError) {
      console.error('[twitter/auth] Configuration error:', configError);
      return NextResponse.json(
        { error: configError },
        { status: 500 }
      );
    }

    // Generate state for CSRF protection
    const state = crypto.randomBytes(16).toString('hex');

    // Generate PKCE codes
    const { codeVerifier, codeChallenge } = generatePKCE();

    // Get authorization URL
    const authUrl = getAuthUrl(state, codeChallenge);

    console.log('[twitter/auth] Generated auth URL, redirecting user to X OAuth');

    // Return auth URL and state/verifier (client should store in session)
    return NextResponse.json({
      authUrl,
      state,
      codeVerifier, // Client needs to store this for the callback
    });
  } catch (error) {
    console.error('[twitter/auth] Error initiating OAuth:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth flow' },
      { status: 500 }
    );
  }
}
