// SPDX-License-Identifier: Apache-2.0
// Copyright 2024 Aztec Labs.
pragma solidity >=0.8.27;

import {IFeeJuicePortal} from "@aztec/core/interfaces/IFeeJuicePortal.sol";
import {IRewardDistributor} from "@aztec/governance/interfaces/IRewardDistributor.sol";
import {Rollup as RealRollup, RollupConfig, GenesisState} from "@aztec/core/Rollup.sol";
import {TestConstants} from "./TestConstants.sol";
import {IERC20} from "@oz/token/ERC20/IERC20.sol";

contract Rollup is RealRollup {
  constructor(
    IFeeJuicePortal _fpcJuicePortal,
    IRewardDistributor _rewardDistributor,
    IERC20 _stakingAsset,
    address _governance
  )
    RealRollup(
      _fpcJuicePortal,
      _rewardDistributor,
      _stakingAsset,
      _governance,
      GenesisState({
        vkTreeRoot: TestConstants.GENESIS_VK_TREE_ROOT,
        protocolContractTreeRoot: TestConstants.GENESIS_PROTOCOL_CONTRACT_TREE_ROOT,
        genesisArchiveRoot: TestConstants.GENESIS_ARCHIVE_ROOT,
        genesisBlockHash: TestConstants.GENESIS_BLOCK_HASH
      }),
      RollupConfig({
        aztecSlotDuration: TestConstants.AZTEC_SLOT_DURATION,
        aztecEpochDuration: TestConstants.AZTEC_EPOCH_DURATION,
        targetCommitteeSize: TestConstants.AZTEC_TARGET_COMMITTEE_SIZE,
        aztecProofSubmissionWindow: TestConstants.AZTEC_PROOF_SUBMISSION_WINDOW,
        minimumStake: TestConstants.AZTEC_MINIMUM_STAKE,
        slashingQuorum: TestConstants.AZTEC_SLASHING_QUORUM,
        slashingRoundSize: TestConstants.AZTEC_SLASHING_ROUND_SIZE
      })
    )
  {}
}
