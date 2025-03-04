import type { Fr } from '@aztec/foundation/fields';
import type { ContractArtifact } from '@aztec/stdlib/abi';

/**
 * PXE database for managing contract artifacts.
 */
export interface ContractArtifactDatabase {
  /**
   * Adds a new contract artifact to the database or updates an existing one.
   * @param id - Id of the corresponding contract class.
   * @param contract - Contract artifact to add.
   * @throws - If there are duplicate private function selectors.
   */
  addContractArtifact(id: Fr, contract: ContractArtifact): Promise<void>;
  /**
   * Gets a contract artifact given its resulting contract class id.
   * @param id - Contract class id for the given artifact.
   */
  getContractArtifact(id: Fr): Promise<ContractArtifact | undefined>;
}
