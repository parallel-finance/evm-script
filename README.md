 Script and provisioning Contracts for evm runtime chain

# evm-substrate-address-converter
 a script for converting substrate address to evm address and back

```package.json
    "evm_2_ss58": "node script/address_converter.js 0x302F0B71B8aD3CF6dD90aDb668E49b2168d652fd",
    "ss58_2_evm": "node script/address_converter.js hJGPPw4H2TarBvBrjehoRxD2HkBZwDe5JP4WA4YBpGwHHQkCD",
```
# Substrate EVM Utilities

some helpful utilities for working with Substrate and the EVM pallet.

- script for calculate slot based on contract address and slot number in the contract so we can query storage value from EVM pallet later

```package.json
    "erc20_slot": "node script/erc20_slot.js 0 0x34cfb6da89f12770442ce8997e44f06ebb279225",  
```

# EVM Chain Provisioning

- start live chain and provisioning

```
    "start-chain": "cd ../.. && make local-dev-launch",
    "init-chain": "node script/token.js init",
    "deploy-token": "node script/token.js deploy",
    "provisioning-chain": "npm run deploy-token",
```

# Alexar Bridge Integration Test

- mock test for example `cross-chain-token` implementation

```
    "test-bridge": "npx hardhat test --grep bridge" 
```

- live chain test
  
```
    "test-mint-token": "node script/token.js test",
    "test-chain": "npm run test-mint-token", 
```