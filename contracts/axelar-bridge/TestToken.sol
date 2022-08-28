// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import { ERC20 } from '@axelar-network/axelar-cgp-solidity/contracts/ERC20.sol';

contract TestToken is ERC20 {
    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_
    ) ERC20(name_, symbol_, decimals_) {}

    function burn(address account, uint256 amount) external {
        _burn(account, amount);
    }

    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }
}