import { readFieldCompressedString } from '@aztec/aztec.js';
import { createLogger } from '@aztec/foundation/log';
import { TokenContract } from '@aztec/noir-contracts.js/Token';

import { jest } from '@jest/globals';

import { type TestWallets, deployTestWalletWithTokens, setupTestWalletsWithTokens } from './setup_test_wallets.js';
import { isK8sConfig, setupEnvironment, startPortForward } from './utils.js';

const config = setupEnvironment(process.env);

describe('token transfer test', () => {
  jest.setTimeout(10 * 60 * 2000); // 20 minutes

  const logger = createLogger(`e2e:spartan-test:transfer`);
  const MINT_AMOUNT = 1n;

  const ROUNDS = 1n;

  let testWallets: TestWallets;

  beforeAll(async () => {
    let PXE_URL;
    if (isK8sConfig(config)) {
      await startPortForward({
        resource: `svc/${config.INSTANCE_NAME}-aztec-network-pxe`,
        namespace: config.NAMESPACE,
        containerPort: config.CONTAINER_PXE_PORT,
        hostPort: config.HOST_PXE_PORT,
      });
      PXE_URL = `http://127.0.0.1:${config.HOST_PXE_PORT}`;

      await startPortForward({
        resource: `svc/${config.INSTANCE_NAME}-aztec-network-eth-execution`,
        namespace: config.NAMESPACE,
        containerPort: config.CONTAINER_ETHEREUM_PORT,
        hostPort: config.HOST_ETHEREUM_PORT,
      });
      const ETHEREUM_HOSTS = `http://127.0.0.1:${config.HOST_ETHEREUM_PORT}`;

      await startPortForward({
        resource: `svc/${config.INSTANCE_NAME}-aztec-network-validator`,
        namespace: config.NAMESPACE,
        containerPort: config.CONTAINER_SEQUENCER_PORT,
        hostPort: config.HOST_SEQUENCER_PORT,
      });
      const NODE_URL = `http://127.0.0.1:${config.HOST_SEQUENCER_PORT}`;

      const L1_ACCOUNT_MNEMONIC = config.L1_ACCOUNT_MNEMONIC;

      testWallets = await deployTestWalletWithTokens(
        PXE_URL,
        NODE_URL,
        ETHEREUM_HOSTS,
        L1_ACCOUNT_MNEMONIC,
        MINT_AMOUNT,
        logger,
      );
    } else {
      PXE_URL = config.PXE_URL;
      testWallets = await setupTestWalletsWithTokens(PXE_URL, MINT_AMOUNT, logger);
    }
    expect(ROUNDS).toBeLessThanOrEqual(MINT_AMOUNT);
  });

  it('can get info', async () => {
    const name = readFieldCompressedString(await testWallets.tokenAdminWallet.methods.private_get_name().simulate());
    expect(name).toBe(testWallets.tokenName);
  });

  it('can transfer 1 token privately and publicly', async () => {
    const recipient = testWallets.recipientWallet.getAddress();
    const transferAmount = 1n;

    for (const w of testWallets.wallets) {
      expect(MINT_AMOUNT).toBe(await testWallets.tokenAdminWallet.methods.balance_of_public(w.getAddress()).simulate());
    }

    expect(0n).toBe(await testWallets.tokenAdminWallet.methods.balance_of_public(recipient).simulate());

    // For each round, make both private and public transfers
    for (let i = 1n; i <= ROUNDS; i++) {
      const interactions = await Promise.all([
        ...testWallets.wallets.map(async w =>
          (
            await TokenContract.at(testWallets.tokenAddress, w)
          ).methods.transfer_in_public(w.getAddress(), recipient, transferAmount, 0),
        ),
      ]);

      const txs = await Promise.all(interactions.map(async i => await i.prove()));

      await Promise.all(txs.map(t => t.send().wait({ timeout: 600 })));
    }

    for (const w of testWallets.wallets) {
      expect(MINT_AMOUNT - ROUNDS * transferAmount).toBe(
        await testWallets.tokenAdminWallet.methods.balance_of_public(w.getAddress()).simulate(),
      );
    }

    expect(ROUNDS * transferAmount * BigInt(testWallets.wallets.length)).toBe(
      await testWallets.tokenAdminWallet.methods.balance_of_public(recipient).simulate(),
    );
  });
});
