
const {
  Contract,
  ContractFactory,
  utils: { keccak256 },
} = require('ethers');
const { deployAndInitContractConstant,deployContractConstant } = require('./constAddressDeployer');

const IUpgradable = require('../artifacts/contracts/pre-deploy/interfaces/IUpgradable.sol/IUpgradable.json');

async function deployUpgradableWithInit (
  constAddressDeployerAddress,
  wallet,
  implementationJson,
  proxyJson,
  implementationConstructorArgs = [],
  proxyConstructorArgs = [],
  setupParams = '0x',
  key = Date.now(),
) {
  const implementationFactory = new ContractFactory(
    implementationJson.abi,
    implementationJson.bytecode,
    wallet,
  );

  const implementation = await implementationFactory.deploy(
    ...implementationConstructorArgs,
  );
  await implementation.deployed();

  const proxy = await deployAndInitContractConstant(
    constAddressDeployerAddress,
    wallet,
    proxyJson,
    key,
    proxyConstructorArgs,
    [implementation.address, wallet.address, setupParams],
    4e6,
  );

  return new Contract(proxy.address, implementationJson.abi, wallet);
}

async function deployUpgradable (
  constAddressDeployerAddress,
  wallet,
  implementationJson,
  proxyJson,
  implementationConstructorArgs = [],
  key,
) {
  const implementationFactory = new ContractFactory(
    implementationJson.abi,
    implementationJson.bytecode,
    wallet,
  );

  const implementation = await implementationFactory.deploy(
    ...implementationConstructorArgs,
  );
  await implementation.deployed();

  const proxy = await deployContractConstant(
    constAddressDeployerAddress,
    wallet,
    proxyJson,
    key,
    // proxyConstructorArgs,
    [],
    4e6,
  );
  
  await proxy.init(implementation.address, wallet.address, '0x', {gasPrice: 1000000000, gasLimit: 1e6});

  return new Contract(proxy.address, implementationJson.abi, wallet);
}

async function upgradeUpgradable (
  proxyAddress,
  wallet,
  contractJson,
  implementationConstructorArgs = [],
  setupParams = '0x',
) {
  const proxy = new Contract(proxyAddress, IUpgradable.abi, wallet);

  const implementationFactory = new ContractFactory(
    contractJson.abi,
    contractJson.bytecode,
    wallet,
  );

  const implementation = await implementationFactory.deploy(
    ...implementationConstructorArgs,
  );
  await implementation.deployed();

  const implementationCode = await wallet.provider.getCode(
    implementation.address,
  );
  const implementationCodeHash = keccak256(implementationCode);

  const tx = await proxy.upgrade(
    implementation.address,
    implementationCodeHash,
    setupParams,
  );
  await tx.wait();
  return tx;
}

module.exports = {
  deployUpgradable,
  upgradeUpgradable,
};
