// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import { AxelarExecutable } from '@axelar-network/axelar-utils-solidity/contracts/executables/AxelarExecutable.sol';
import { IAxelarGateway } from '@axelar-network/axelar-utils-solidity/contracts/interfaces/IAxelarGateway.sol';
import { IAxelarGasService } from '@axelar-network/axelar-cgp-solidity/contracts/interfaces/IAxelarGasService.sol';
import { StringToAddress, AddressToString } from '@axelar-network/axelar-utils-solidity/contracts/StringAddressUtils.sol';

import "./IERC20.sol";

interface IERC20CrossChain{
    function transferRemote(
        string calldata destinationChain,
        address destinationAddress,
        uint256 amount
    ) external payable;
}

contract ERC20CrossChain is AxelarExecutable,IERC20CrossChain {
    using StringToAddress for string;
    using AddressToString for address;

    error AlreadyInitialized();
    error ZeroAddress();

    event FalseSender(string sourceChain, string sourceAddress);

    IAxelarGasService public immutable gasReceiver;
    IAxelarGateway public immutable _gateway;
    IERC20Plus public immutable erc20Token;
    address public immutable gatewayAddress;

    constructor(address gatewayAddress_,address gasReceiver_,address erc20Token_) AxelarExecutable(gatewayAddress_) {
        if (gatewayAddress_ == address(0)) revert ZeroAddress();
        gatewayAddress = gatewayAddress_;
        _gateway = IAxelarGateway(gatewayAddress);
        gasReceiver = IAxelarGasService(gasReceiver_);
        erc20Token = IERC20Plus(erc20Token_);
        //todo: invoke erc20.set_team to set owner of erc20 to this
    }

    // This is for testing.
    function giveMe(uint256 amount) external {
        erc20Token.mint(msg.sender, amount);
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
        _gateway.callContract(destinationChain, stringAddress, payload);
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
}