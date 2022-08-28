// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.9;

import "./IERC20.sol";

contract ERC20Instance is IERC20 {
    address public immutable erc20address;
    IERC20 public immutable erc20;

    constructor(address erc20address_) {
        erc20address = erc20address_;
        erc20 = IERC20(erc20address);
    }

    receive() external payable {
        // React to receiving ether
    }

    function name() external view override returns (string memory) {
        (bool success, bytes memory returnData) = erc20address.staticcall(abi.encodeWithSignature("name()"));
        assembly {
            if eq(success, 0) {
                revert(add(returnData, 0x20), returndatasize())
            }
        }

        return abi.decode(returnData, (string));
    }

    function symbol() external view override returns (string memory) {
        // We nominate our target collator with all the tokens provided
        (bool success, bytes memory returnData) = erc20address.staticcall(abi.encodeWithSignature("symbol()"));
        assembly {
            if eq(success, 0) {
                revert(add(returnData, 0x20), returndatasize())
            }
        }

        return abi.decode(returnData, (string));
    }

    function balanceOf(address who) external view override returns (uint256) {
        // We nominate our target collator with all the tokens provided
        // return erc20.balanceOf(who);
        (bool success, bytes memory returnData) = erc20address.staticcall(
            abi.encodeWithSignature("balanceOf(address)", who)
        );
        assembly {
            if eq(success, 0) {
                revert(add(returnData, 0x20), returndatasize())
            }
        }

        return abi.decode(returnData, (uint256));
    }

    function decimals() external view override returns (uint8) {
        (bool success, bytes memory returnData) = erc20address.staticcall(abi.encodeWithSignature("decimals()"));
        assembly {
            if eq(success, 0) {
                revert(add(returnData, 0x20), returndatasize())
            }
        }

        return abi.decode(returnData, (uint8));
    }

    function totalSupply() external view override returns (uint256) {
        (bool success, bytes memory returnData) = erc20address.staticcall(abi.encodeWithSignature("totalSupply()"));
        assembly {
            if eq(success, 0) {
                revert(add(returnData, 0x20), returndatasize())
            }
        }

        return abi.decode(returnData, (uint256));
    }

    

    function allowance(address owner, address spender)
        external
        view
        override
        returns (uint256)
    {
        (bool success, bytes memory returnData) = erc20address.staticcall(abi.encodeWithSignature("allowance(address,address)",owner,spender));
        assembly {
            if eq(success, 0) {
                revert(add(returnData, 0x20), returndatasize())
            }
        }

        return abi.decode(returnData, (uint256));
    }

    function mint(address to, uint256 value)
        external
        returns (bool)
    {
        (bool success, bytes memory returnData) = erc20address.call(
            abi.encodeWithSignature("mint(address,uint256)", to, value)
        );
        assembly {
            if eq(success, 0) {
                revert(add(returnData, 0x20), returndatasize())
            }
        }
        return true;
    }

    function transfer(address to, uint256 value)
        external
        override
        returns (bool)
    {
        (bool success, bytes memory returnData) = erc20address.call(
            abi.encodeWithSignature("transfer(address,uint256)", to, value)
        );
        assembly {
            if eq(success, 0) {
                revert(add(returnData, 0x20), returndatasize())
            }
        }
        return true;
    }

    function transfer_delegate(address to, uint256 value) pure
        external
        returns (bool)
    {
        revert();
    }

    function approve(address spender, uint256 value)
        external
        override
        returns (bool)
    {
        (bool success, bytes memory returnData) = erc20address.call(
            abi.encodeWithSignature("approve(address,uint256)", spender, value)
        );
        assembly {
            if eq(success, 0) {
                revert(add(returnData, 0x20), returndatasize())
            }
        }
        return true;
    }

    function approve_delegate(address spender, uint256 value) pure
        external
        returns (bool)
    {
        revert();
    }

    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external override returns (bool) {
        (bool success, bytes memory returnData) = erc20address.call(
            abi.encodeWithSignature("transferFrom(address,address,uint256)", from, to, value)
        );
        assembly {
            if eq(success, 0) {
                revert(add(returnData, 0x20), returndatasize())
            }
        }
        return true;
    }

    function transferFrom_delegate(
        address from,
        address to,
        uint256 value
    ) pure external returns (bool) {
        revert();
    }
}
