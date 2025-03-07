import {
  AztecAddress,
  type ContractArtifact,
  type ContractInstanceWithAddress,
  Fr,
  PublicKeys,
  getContractClassFromArtifact,
} from '@aztec/aztec.js';
import { getContractArtifact } from '@aztec/cli/cli-utils';
import type { NamespacedApiHandlers } from '@aztec/foundation/json-rpc/server';
import type { LogFn } from '@aztec/foundation/log';
import {
  type CliPXEOptions,
  type PXEService,
  type PXEServiceConfig,
  allPxeConfigMappings,
  createPXEService,
} from '@aztec/pxe/server';
import { type AztecNode, PXESchema, createAztecNodeClient } from '@aztec/stdlib/interfaces/client';
import { L2BasicContractsMap, Network } from '@aztec/stdlib/network';
import { makeTracedFetch } from '@aztec/telemetry-client';

import { extractRelevantOptions } from '../util.js';
import { getVersions } from '../versioning.js';

export type { PXEServiceConfig, CliPXEOptions };

const contractAddressesUrl = 'http://static.aztec.network';

export async function startPXE(
  options: any,
  signalHandlers: (() => Promise<void>)[],
  services: NamespacedApiHandlers,
  userLog: LogFn,
): Promise<{ pxe: PXEService; config: PXEServiceConfig & CliPXEOptions }> {
  return await addPXE(options, signalHandlers, services, userLog, {});
}

function isValidNetwork(value: any): value is Network {
  return Object.values(Network).includes(value);
}

async function fetchBasicContractAddresses(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch basic contract addresses from ${url}`);
  }
  return response.json();
}

export async function addPXE(
  options: any,
  signalHandlers: (() => Promise<void>)[],
  services: NamespacedApiHandlers,
  userLog: LogFn,
  deps: { node?: AztecNode } = {},
): Promise<{ pxe: PXEService; config: PXEServiceConfig & CliPXEOptions }> {
  const pxeConfig = extractRelevantOptions<PXEServiceConfig & CliPXEOptions>(options, allPxeConfigMappings, 'pxe');

  let nodeUrl;
  if (pxeConfig.network) {
    if (isValidNetwork(pxeConfig.network)) {
      if (!pxeConfig.apiKey && !pxeConfig.nodeUrl) {
        userLog(`API Key or Aztec Node URL is required to connect to ${pxeConfig.network}`);
        process.exit(1);
      } else if (pxeConfig.apiKey) {
        nodeUrl = `https://api.aztec.network/${pxeConfig.network}/aztec-node-1/${pxeConfig.apiKey}`;
      } else if (pxeConfig.nodeUrl) {
        nodeUrl = pxeConfig.nodeUrl;
      }
    } else {
      userLog(`Network ${pxeConfig.network} is not supported`);
      process.exit(1);
    }
  } else {
    nodeUrl = pxeConfig.nodeUrl;
  }
  if (!nodeUrl && !deps.node && !pxeConfig.network) {
    userLog('Aztec Node URL (nodeUrl | AZTEC_NODE_URL) option is required to start PXE without --node option');
    process.exit(1);
  }

  const node = deps.node ?? createAztecNodeClient(nodeUrl!, getVersions(pxeConfig), makeTracedFetch([1, 2, 3], true));
  const pxe = await createPXEService(node, pxeConfig as PXEServiceConfig);

  // register basic contracts
  if (pxeConfig.network) {
    userLog(`Registering basic contracts for ${pxeConfig.network}`);
    const basicContractsInfo = await fetchBasicContractAddresses(
      `${contractAddressesUrl}/${pxeConfig.network}/basic_contracts.json`,
    );
    const l2Contracts: Record<
      string,
      { name: string; address: AztecAddress; initHash: Fr; salt: Fr; artifact: ContractArtifact }
    > = {};
    for (const [key, artifactName] of Object.entries(L2BasicContractsMap[pxeConfig.network as Network])) {
      l2Contracts[key] = {
        name: key,
        address: AztecAddress.fromString(basicContractsInfo[key].address),
        initHash: Fr.fromHexString(basicContractsInfo[key].initHash),
        salt: Fr.fromHexString(basicContractsInfo[key].salt),
        artifact: await getContractArtifact(artifactName, userLog),
      };
    }

    await Promise.all(
      Object.values(l2Contracts).map(async ({ name, address, artifact, initHash, salt }) => {
        const contractClass = await getContractClassFromArtifact(artifact!);
        const instance: ContractInstanceWithAddress = {
          version: 1,
          salt,
          initializationHash: initHash,
          address,
          deployer: AztecAddress.ZERO,
          currentContractClassId: contractClass.id,
          originalContractClassId: contractClass.id,
          publicKeys: PublicKeys.default(),
        };
        userLog(`Registering ${name} at ${address.toString()}`);
        await pxe.registerContract({ artifact, instance });
      }),
    );
  }

  // Add PXE to services list
  services.pxe = [pxe, PXESchema];

  return { pxe, config: pxeConfig };
}
