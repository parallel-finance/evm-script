// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import { IAxelarGateway } from '@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGateway.sol';
import { IAxelarGasService } from '@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGasService.sol';
import { AxelarExecutable } from '@axelar-network/axelar-gmp-sdk-solidity/contracts/executables/AxelarExecutable.sol';
import { Upgradable } from '@axelar-network/axelar-gmp-sdk-solidity/contracts/upgradables/Upgradable.sol';
import { StringToAddress, AddressToString } from '@axelar-network/axelar-gmp-sdk-solidity/contracts/StringAddressUtils.sol';

import '../interfaces/IERC20.sol';

interface IERC20CrossChain {
    function transferRemote(
        string calldata destinationChain,
        address destinationAddress,
        uint256 amount
    ) external payable;
}

contract ERC20CrossChain is AxelarExecutable, IERC20CrossChain {
    using StringToAddress for string;
    using AddressToString for address;

    error AlreadyInitialized();
    error ZeroAddress();

    event FalseSender(string sourceChain, string sourceAddress);

    IAxelarGasService public immutable gasReceiver;

    IERC20Plus public erc20Token;

    constructor(address gatewayAddress_, address gasReceiver_, address erc20Token_) AxelarExecutable(gatewayAddress_) {
        gasReceiver = IAxelarGasService(gasReceiver_);
        erc20Token = IERC20Plus(erc20Token_);
    }

    function _setup(bytes calldata params) internal {
        address erc20Token_ = abi.decode(params, (address));
        if (address(erc20Token) != address(0)) revert AlreadyInitialized();
        erc20Token = IERC20Plus(erc20Token_);
    }

    function transferRemote(
        string calldata destinationChain,
        address destinationAddress,
        uint256 amount
    ) public payable override {
        erc20Token.burn(msg.sender, amount);
        bytes memory payload = abi.encode(destinationAddress, amount);
        string memory stringAddress = address(this).toString();
        if (msg.value > 0) {
            gasReceiver.payNativeGasForContractCall{ value: msg.value }(
                address(this),
                destinationChain,
                stringAddress,
                payload,
                msg.sender
            );
        }
        gateway.callContract(destinationChain, stringAddress, payload);
    }

    function _execute(
        string calldata, /*sourceChain*/
        string calldata sourceAddress,
        bytes calldata payload
    ) internal override {
        if (sourceAddress.toAddress() != address(this)) {
            emit FalseSender(sourceAddress, sourceAddress);
            return;
        }
        (address to, uint256 amount) = abi.decode(payload, (address, uint256));
        erc20Token.mint(to, amount);
    }

    function contractId() external pure returns (bytes32) {
        return keccak256('ERC20CrossChain');
    }
}
