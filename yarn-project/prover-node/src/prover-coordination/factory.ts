import type { ArchiveSource, Archiver } from '@aztec/archiver';
import { BBCircuitVerifier, TestCircuitVerifier } from '@aztec/bb-prover';
import type { EpochCache } from '@aztec/epoch-cache';
import { createLogger } from '@aztec/foundation/log';
import type { DataStoreConfig } from '@aztec/kv-store/config';
import { getVKTreeRoot } from '@aztec/noir-protocol-circuits-types/vk-tree';
import { createP2PClient } from '@aztec/p2p';
import { protocolContractTreeRoot } from '@aztec/protocol-contracts';
import { createAztecNodeClient } from '@aztec/stdlib/interfaces/client';
import type { ProverCoordination, WorldStateSynchronizer } from '@aztec/stdlib/interfaces/server';
import { P2PClientType } from '@aztec/stdlib/p2p';
import { getComponentsVersionsFromConfig } from '@aztec/stdlib/versioning';
import { type TelemetryClient, makeTracedFetch } from '@aztec/telemetry-client';

import type { ProverNodeConfig } from '../config.js';

// We return a reference to the P2P client so that the prover node can stop the service when it shuts down.
type ProverCoordinationDeps = {
  aztecNodeTxProvider?: ProverCoordination;
  worldStateSynchronizer?: WorldStateSynchronizer;
  archiver?: Archiver | ArchiveSource;
  telemetry?: TelemetryClient;
  epochCache?: EpochCache;
};

/**
 * Creates a prover coordination service.
 * If p2p is enabled, prover coordination is done via p2p.
 * If an Aztec node URL is provided, prover coordination is done via the Aztec node over http.
 * If an aztec node is provided, it is returned directly.
 */
export async function createProverCoordination(
  config: ProverNodeConfig & DataStoreConfig,
  deps: ProverCoordinationDeps,
): Promise<ProverCoordination> {
  const log = createLogger('prover-node:prover-coordination');

  if (deps.aztecNodeTxProvider) {
    log.info('Using prover coordination via aztec node');
    return deps.aztecNodeTxProvider;
  }

  if (config.p2pEnabled) {
    log.info('Using prover coordination via p2p');

    if (!deps.archiver || !deps.worldStateSynchronizer || !deps.telemetry || !deps.epochCache) {
      throw new Error('Missing dependencies for p2p prover coordination');
    }

    const proofVerifier = config.realProofs ? await BBCircuitVerifier.new(config) : new TestCircuitVerifier();
    const p2pClient = await createP2PClient(
      P2PClientType.Prover,
      config,
      deps.archiver,
      proofVerifier,
      deps.worldStateSynchronizer,
      deps.epochCache,
      deps.telemetry,
    );
    await p2pClient.start();

    return p2pClient;
  }

  if (config.proverCoordinationNodeUrl) {
    log.info('Using prover coordination via node url');
    const versions = getComponentsVersionsFromConfig(config, protocolContractTreeRoot, getVKTreeRoot());
    return createAztecNodeClient(config.proverCoordinationNodeUrl, versions, makeTracedFetch([1, 2, 3], false));
  } else {
    throw new Error(`Aztec Node URL for Tx Provider is not set.`);
  }
}
