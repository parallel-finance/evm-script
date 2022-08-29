// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import { AxelarExecutable } from '@axelar-network/axelar-utils-solidity/contracts/executables/AxelarExecutable.sol';
import { IAxelarGateway } from '@axelar-network/axelar-cgp-solidity/contracts/interfaces/IAxelarGateway.sol';
import { IAxelarGasService } from '@axelar-network/axelar-cgp-solidity/contracts/interfaces/IAxelarGasService.sol';
import { StringToAddress, AddressToString } from '@axelar-network/axelar-utils-solidity/contracts/StringAddressUtils.sol';

import "../interfaces/IERC20.sol";
import "./TestToken.sol";

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

    address public immutable gatewayAddress;
    IAxelarGateway public immutable _gateway;

    IERC20Plus public erc20Token;

    TestToken public testToken;

    constructor(address gatewayAddress_,address gasReceiver_,address erc20Token_) AxelarExecutable(gatewayAddress_) {
        if (gatewayAddress_ == address(0) || gasReceiver_ == address(0)) revert ZeroAddress();
        gatewayAddress = gatewayAddress_;
        _gateway = IAxelarGateway(gatewayAddress);
        gasReceiver = IAxelarGasService(gasReceiver_);
        if (erc20Token_ != address(0)) {
            erc20Token = IERC20Plus(erc20Token_);
        }
    }

    // Begin:This is for testing
    function init(string memory name_,
        string memory symbol_,
        uint8 decimals_
        ) external {
        testToken = new TestToken(name_, symbol_, decimals_);
    }

    // This is for testing.
    function balanceOf(address who) public view returns (uint256) {
        return testToken.balanceOf(who);
    }

    // This is for testing.
    function giveMe(uint256 amount) external {
        testToken.mint(msg.sender, amount);
    }

    function transferRemote(
        string calldata destinationChain,
        address destinationAddress,
        uint256 amount
    ) public payable override {
        if(address(erc20Token) != address(0)){
            erc20Token.burn(msg.sender, amount);
        }else{
            testToken.burn(msg.sender, amount);
        }
        
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
        if(address(erc20Token) != address(0)){
            erc20Token.mint(to, amount);
        }else{
            testToken.mint(to, amount);
        }
    }
}