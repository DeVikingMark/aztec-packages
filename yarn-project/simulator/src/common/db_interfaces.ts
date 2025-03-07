import type { L1_TO_L2_MSG_TREE_HEIGHT } from '@aztec/constants';
import type { Fr } from '@aztec/foundation/fields';
import type { FunctionSelector } from '@aztec/stdlib/abi';
import type { AztecAddress } from '@aztec/stdlib/aztec-address';
import type { ContractInstanceWithAddress } from '@aztec/stdlib/contract';
import type { NullifierMembershipWitness } from '@aztec/stdlib/trees';

import type { MessageLoadOracleInputs } from './message_load_oracle_inputs.js';

/**
 * Database interface for providing access to public state.
 */
export interface PublicStateDB {
  /**
   * Reads a value from public storage, returning zero if none.
   * @param contract - Owner of the storage.
   * @param slot - Slot to read in the contract storage.
   * @returns The current value in the storage slot.
   */
  storageRead(contract: AztecAddress, slot: Fr): Promise<Fr>;

  /**
   * Records a write to public storage.
   * @param contract - Owner of the storage.
   * @param slot - Slot to read in the contract storage.
   * @param newValue - The new value to store.
   */
  storageWrite(contract: AztecAddress, slot: Fr, newValue: Fr): Promise<void>;
}

/**
 * Database interface for providing access to public contract data.
 */
export interface PublicContractsDB {
  /**
   * Returns a publicly deployed contract instance.
   * @param address - Address of the contract.
   * @returns The contract instance or undefined if not found.
   */
  getContractInstance(address: AztecAddress): Promise<ContractInstanceWithAddress | undefined>;

  getDebugFunctionName(contractAddress: AztecAddress, selector: FunctionSelector): Promise<string | undefined>;
}

/** Database interface for providing access to commitment tree, l1 to l2 message tree, and nullifier tree. */
export interface CommitmentsDB {
  /**
   * Fetches a message from the db, given its key.
   * @param contractAddress - Address of a contract by which the message was emitted.
   * @param messageHash - Hash of the message.
   * @param secret - Secret used to compute a nullifier.
   * @dev Contract address and secret are only used to compute the nullifier to get non-nullified messages
   * @returns The l1 to l2 membership witness (index of message in the tree and sibling path).
   */
  getL1ToL2MembershipWitness(
    contractAddress: AztecAddress,
    messageHash: Fr,
    secret: Fr,
  ): Promise<MessageLoadOracleInputs<typeof L1_TO_L2_MSG_TREE_HEIGHT>>;

  /**
   * @param leafIndex the leaf to look up
   * @returns The l1 to l2 leaf value or undefined if not found.
   */
  getL1ToL2LeafValue(leafIndex: bigint): Promise<Fr | undefined>;

  /**
   * Gets the index of a commitment in the note hash tree.
   * @param commitment - The commitment.
   * @returns - The index of the commitment. Undefined if it does not exist in the tree.
   */
  getCommitmentIndex(commitment: Fr): Promise<bigint | undefined>;

  /**
   * Gets commitment in the note hash tree given a leaf index.
   * @param leafIndex - the leaf to look up.
   * @returns - The commitment at that index. Undefined if leaf index is not found.
   */
  getCommitmentValue(leafIndex: bigint): Promise<Fr | undefined>;

  /**
   * Gets the index of a nullifier in the nullifier tree.
   * @param nullifier - The nullifier.
   * @returns - The index of the nullifier. Undefined if it does not exist in the tree.
   */
  getNullifierIndex(nullifier: Fr): Promise<bigint | undefined>;

  /**
   * Returns a nullifier membership witness for the given nullifier or undefined if not found.
   * REFACTOR: Same as getL1ToL2MembershipWitness, can be combined with aztec-node method that does almost the same thing.
   * @param nullifier - Nullifier we're looking for.
   */
  getNullifierMembershipWitnessAtLatestBlock(nullifier: Fr): Promise<NullifierMembershipWitness | undefined>;
}
