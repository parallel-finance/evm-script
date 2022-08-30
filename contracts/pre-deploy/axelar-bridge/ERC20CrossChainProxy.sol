// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import { Proxy } from '../upgradables/Proxy.sol';

contract ERC20CrossChainProxy is Proxy {
    function contractId() internal pure override returns (bytes32) {
        return keccak256('ERC20CrossChain');
    }
}
