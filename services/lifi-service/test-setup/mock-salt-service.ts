/**
 * Mock Salt Service
 *
 * A minimal mock of the salt-service for testing lifi-service in isolation.
 * This simulates salt wallet creation/retrieval without needing the full salt-service.
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';

const PORT = process.env.MOCK_SALT_PORT ? parseInt(process.env.MOCK_SALT_PORT) : 3003;

// In-memory store for mock salt wallets
const saltWallets = new Map<string, string>();

// Generate a deterministic mock salt wallet address from user address
function generateMockSaltWallet(userAddress: string): string {
  // Create a "derived" address by hashing - for testing this is just a simple transform
  const hash = userAddress.slice(2, 10) + 'salt' + userAddress.slice(-8);
  return '0x' + hash.padStart(40, '0').slice(0, 40);
}

async function main() {
  const app = Fastify({
    logger: {
      level: 'info',
      transport: { target: 'pino-pretty' },
    },
  });

  await app.register(cors, { origin: true });

  // Health check
  app.get('/health', async () => {
    return { status: 'ok', service: 'mock-salt-service' };
  });

  // GET /salt/wallets/:address - Get or create salt wallet
  app.get<{
    Params: { address: string };
  }>('/salt/wallets/:address', async (request) => {
    const { address } = request.params;
    const normalizedAddress = address.toLowerCase();

    app.log.info(`Getting salt wallet for ${normalizedAddress}`);

    // Check if we already have a salt wallet for this user
    let saltWalletAddress = saltWallets.get(normalizedAddress);

    if (!saltWalletAddress) {
      // Create a new mock salt wallet
      saltWalletAddress = generateMockSaltWallet(normalizedAddress);
      saltWallets.set(normalizedAddress, saltWalletAddress);
      app.log.info(`Created new mock salt wallet: ${saltWalletAddress}`);
    } else {
      app.log.info(`Found existing salt wallet: ${saltWalletAddress}`);
    }

    return {
      success: true,
      data: {
        saltWalletAddress,
        userWalletAddress: normalizedAddress,
        exists: true,
      },
    };
  });

  // List all mock wallets (debug endpoint)
  app.get('/salt/wallets', async () => {
    const wallets: Array<{ user: string; salt: string }> = [];
    saltWallets.forEach((salt, user) => {
      wallets.push({ user, salt });
    });
    return { success: true, data: wallets };
  });

  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`\n🧂 Mock Salt Service running on http://localhost:${PORT}`);
    console.log('   Endpoints:');
    console.log('   - GET  /health');
    console.log('   - GET  /salt/wallets/:address');
    console.log('   - GET  /salt/wallets (list all)\n');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
