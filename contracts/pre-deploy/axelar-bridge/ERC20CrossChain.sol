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
    error NotOwner();
    error InvalidOwner();

    event FalseSender(string sourceChain, string sourceAddress);

    IAxelarGasService public immutable gasReceiver;

    address public immutable erc20address;

    address owner;

    constructor(address gatewayAddress_, address gasReceiver_, address erc20Token_) AxelarExecutable(gatewayAddress_) {
        gasReceiver = IAxelarGasService(gasReceiver_);
        erc20address = erc20Token_;
    }

    modifier onlyOwner() {
        if (owner != msg.sender) revert NotOwner();
        _;
    }

    function setupOwner(address _owner) external {
        if (owner != address(0)) revert AlreadyInitialized();
        owner = _owner;
    }

    function transferOwnership(address _owner) external onlyOwner {
        if (_owner == address(0)) revert InvalidOwner();
        owner = _owner;
    } 

    function _setup(bytes calldata params) internal {
        
    }

    function contractId() external pure returns (bytes32) {
        return keccak256('ERC20CrossChain');
    }

    function transferRemote(
        string calldata destinationChain,
        address destinationAddress,
        uint256 amount
    ) public payable override {
        _burn(msg.sender, amount);
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
        _mint(to, amount);
    }

    function burn(address from, uint256 value) external onlyOwner {
        _burn(from,value);
    }

    function _burn(address from, uint256 value) internal {
        // erc20Token.burn(from, value);
        (bool success, bytes memory returnData) = erc20address.call(abi.encodeWithSignature('burn(address,uint256)', from, value));
        assembly {
            if eq(success, 0) {
                revert(add(returnData, 0x20), returndatasize())
            }
        }
    }

    function mint(address to, uint256 value) external onlyOwner {
        _mint(to,value);
    }

    function _mint(address to, uint256 value) internal {
        // erc20Token.mint(to, value);
        (bool success, bytes memory returnData) = erc20address.call(abi.encodeWithSignature('mint(address,uint256)', to, value));
        assembly {
            if eq(success, 0) {
                revert(add(returnData, 0x20), returndatasize())
            }
        }
    }
}
