// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import { IUpgradable } from '@axelar-network/axelar-utils-solidity/contracts/interfaces/IUpgradable.sol';
import { IAxelarExecutable } from '@axelar-network/axelar-cgp-solidity/contracts/interfaces/IAxelarExecutable.sol';
import { TokenDeployer } from '@axelar-network/axelar-cgp-solidity/contracts/TokenDeployer.sol';
import { AxelarGatewayProxy } from '@axelar-network/axelar-cgp-solidity/contracts/AxelarGatewayProxy.sol';
import { AxelarGateway } from '@axelar-network/axelar-cgp-solidity/contracts/AxelarGateway.sol';
import { BurnableMintableCappedERC20 } from '@axelar-network/axelar-cgp-solidity/contracts/BurnableMintableCappedERC20.sol';
import { AxelarAuthWeighted } from '@axelar-network/axelar-cgp-solidity/contracts/auth/AxelarAuthWeighted.sol';
import { AxelarGasService } from '@axelar-network/axelar-cgp-solidity/contracts/gas-service/AxelarGasService.sol';
import { AxelarGasServiceProxy } from '@axelar-network/axelar-cgp-solidity/contracts/gas-service/AxelarGasServiceProxy.sol';
import { ConstAddressDeployer } from '@axelar-network/axelar-utils-solidity/contracts/ConstAddressDeployer.sol';
