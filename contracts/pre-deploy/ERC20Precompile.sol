// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.9;

import './interfaces/IERC20.sol';

contract ERC20Instance {
    address public immutable erc20address;

    error AlreadyInitialized();
    error NotOwner();
    error InvalidOwner();
    error NotOperator();

    address owner;
    mapping(address => bool) internal operators;

    constructor(address erc20address_) {
        erc20address = erc20address_;
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

    modifier onlyOperators() {
        if (!operators[msg.sender]) revert NotOwner();
        _;
    }

    function setupOperators(address[] calldata _operators) external onlyOwner {
        for (uint256 i = 0; i < _operators.length; i++) {
			operators[_operators[i]] = true;
		}
    }

    function name() external view returns (string memory) {
        (bool success, bytes memory returnData) = erc20address.staticcall(abi.encodeWithSignature('name()'));
        assembly {
            if eq(success, 0) {
                revert(add(returnData, 0x20), returndatasize())
            }
        }

        return abi.decode(returnData, (string));
    }

    function symbol() external view returns (string memory) {
        // We nominate our target collator with all the tokens provided
        (bool success, bytes memory returnData) = erc20address.staticcall(abi.encodeWithSignature('symbol()'));
        assembly {
            if eq(success, 0) {
                revert(add(returnData, 0x20), returndatasize())
            }
        }

        return abi.decode(returnData, (string));
    }

    function minimumBalance() external view returns (uint256) {
        (bool success, bytes memory returnData) = erc20address.staticcall(abi.encodeWithSignature('minimum_balance()'));
        assembly {
            if eq(success, 0) {
                revert(add(returnData, 0x20), returndatasize())
            }
        }

        return abi.decode(returnData, (uint256));
    }

    function balanceOf(address who) external view returns (uint256) {
        // We nominate our target collator with all the tokens provided
        // return erc20.balanceOf(who);
        (bool success, bytes memory returnData) = erc20address.staticcall(abi.encodeWithSignature('balanceOf(address)', who));
        assembly {
            if eq(success, 0) {
                revert(add(returnData, 0x20), returndatasize())
            }
        }

        return abi.decode(returnData, (uint256));
    }

    function decimals() external view returns (uint8) {
        (bool success, bytes memory returnData) = erc20address.staticcall(abi.encodeWithSignature('decimals()'));
        assembly {
            if eq(success, 0) {
                revert(add(returnData, 0x20), returndatasize())
            }
        }

        return abi.decode(returnData, (uint8));
    }

    function totalSupply() external view returns (uint256) {
        (bool success, bytes memory returnData) = erc20address.staticcall(abi.encodeWithSignature('totalSupply()'));
        assembly {
            if eq(success, 0) {
                revert(add(returnData, 0x20), returndatasize())
            }
        }

        return abi.decode(returnData, (uint256));
    }

    function allowance(address _owner, address spender) external view returns (uint256) {
        (bool success, bytes memory returnData) = erc20address.staticcall(
            abi.encodeWithSignature('allowance(address,address)', _owner, spender)
        );
        assembly {
            if eq(success, 0) {
                revert(add(returnData, 0x20), returndatasize())
            }
        }

        return abi.decode(returnData, (uint256));
    }

    function mint(address to, uint256 value) external onlyOperators returns (bool) {
        (bool success, bytes memory returnData) = erc20address.call(abi.encodeWithSignature('mint(address,uint256)', to, value));
        assembly {
            if eq(success, 0) {
                revert(add(returnData, 0x20), returndatasize())
            }
        }
        return true;
    }

    function burn(address from, uint256 value) external onlyOperators returns (bool) {
        (bool success, bytes memory returnData) = erc20address.call(abi.encodeWithSignature('burn(address,uint256)', from, value));
        assembly {
            if eq(success, 0) {
                revert(add(returnData, 0x20), returndatasize())
            }
        }
        return true;
    }

    function transfer(address to, uint256 value) external returns (bool) {
        (bool success, bytes memory returnData) = erc20address.call(abi.encodeWithSignature('transfer(address,uint256)', to, value));
        assembly {
            if eq(success, 0) {
                revert(add(returnData, 0x20), returndatasize())
            }
        }
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        (bool success, bytes memory returnData) = erc20address.call(abi.encodeWithSignature('approve(address,uint256)', spender, value));
        assembly {
            if eq(success, 0) {
                revert(add(returnData, 0x20), returndatasize())
            }
        }
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external onlyOperators returns (bool) {
        (bool success, bytes memory returnData) = erc20address.call(
            abi.encodeWithSignature('transferFrom(address,address,uint256)', from, to, value)
        );
        assembly {
            if eq(success, 0) {
                revert(add(returnData, 0x20), returndatasize())
            }
        }
        return true;
    }
}
