const ethers = require('ethers');
const fs = require('fs-extra');
const { deployContract, setJSON } = require('./utils');
const { deployContractConstant, predictContractConstant } = require('./constAddressDeployer');
const polkadotCryptoUtils = require('@polkadot/util-crypto');

const ConstAddressDeployer = require('../artifacts/contracts/pre-deploy/ConstAddressDeployer.sol/ConstAddressDeployer.json');
const ERC20PrecompileInstance = require('../artifacts/contracts/pre-deploy/ERC20Precompile.sol/ERC20Instance.json');

const providerRPC = {
  chain: {
    name: 'parallel-evm-chain',
    rpc: (process.env.RPC_URL) || 'http://127.0.0.1:29933',
    chainId: (process.env.CHAIN_ID) || 592,
    addressPrefix: (process.env.SS58_PREFIX) || 110,
  },
};

// we fund alice in substrate chain spec as admin
const accountOfAdmin = {
  address: (process.env.ADMIN_ADDRESS) || '0x8097c3C354652CB1EEed3E5B65fBa2576470678A',
  // alice's key is no secret
  privateKey: (process.env.ADMIN_PRIVATE_KEY) || '0xe5be9a5092b81bca64be81d212e7f2f9eba183bb7a90954f7b76361f6edb5c0a',
};

// mapping to asset with id=1(assuming dai) which is created in asset pallet
const asset_address = ethers.utils.getAddress((process.env.ASSET_PRECOMPILE_ADDRESS) || '0xFfFFFFff00000000000000000000000000000001');

const provider = new ethers.providers.StaticJsonRpcProvider(
  providerRPC.chain.rpc,
  {
    chainId: providerRPC.chain.chainId,
    name: providerRPC.chain.name,
  },
);

const wallet = new ethers.Wallet(accountOfAdmin.privateKey, provider);

const deployed_info_file = './info/contracts.json';

let contract_info = {
  gateway: '0xD9C3b5474f1ec7578E3549BAd3ce266bAa5c2D3c',
  gasReceiver: '0x5737A424F8e9A0dbA8701A4cDaB8E425F9031b33',
  constAddressDeployer: '0x69aeB7Dc4f2A86873Dae8D753DE89326Cf90a77a',
  crossChainToken: '0x4fD879b5ea331d1EDBB962A1aF21B6F665396bD5',
  erc20TokenAddress: '0xE7f944Ac1e3791Fd6276Dac52E1F42849e4aC540',
  erc20SS58Address: 'hJFw794pmc69B7xgp6HyqgKNY9iBCNiQJJpuNLmFMmy7eLaHr',
};

const balances = async (account) => {
  return ethers.utils.formatEther(await provider.getBalance(account));
};

const deployTokenWithConstAddress = async () => {
  // use ConstAddressDeployer
  contract_info = await fs.readJson(deployed_info_file);
  const deployer = contract_info.constAddressDeployer;
  const deployKey = 'parallel-evm-pre-deploy';
  const token_address = await predictContractConstant(
    deployer,
    wallet,
    ERC20PrecompileInstance,
    deployKey,
    [asset_address],
  );
  console.log(`predict ERC20Token deployed to ${token_address}`);
  const token_contract = await deployContractConstant(
    deployer,
    wallet,
    ERC20PrecompileInstance,
    deployKey,
    [asset_address],
  );
  console.log(`ERC20Token deployed to ${await token_contract.address}`);
  return token_contract;
};

const checkAdminBalance = async () => {
  const balanceOfAdmin = await balances(accountOfAdmin.address);
  console.log(`The balance of ${accountOfAdmin.address} is: ${balanceOfAdmin} HKO`);
};

// deploy constAddress deployer first
const init = async () => {
  await checkAdminBalance();
  const deployer = (await deployContract(wallet, ConstAddressDeployer)).address;
  console.log(`constAddressDeployer deployed to ${deployer}`);
  contract_info.constAddressDeployer = deployer;
  setJSON(contract_info, deployed_info_file);
};

const deploy = async () => {
  await deploy_token();
  await deploy_bridge();
};

const deploy_token = async () => {
  const token_contract = await deployTokenWithConstAddress();
  contract_info.erc20TokenAddress = (await token_contract.address);
  contract_info.erc20SS58Address = polkadotCryptoUtils.evmToAddress(contract_info.erc20TokenAddress, providerRPC.chain.addressPrefix);
  console.log('erc20SS58Address is:' + contract_info.erc20SS58Address);
  setJSON(contract_info, deployed_info_file);
};

const deploy_bridge = async () => {
  // todo
};

const test = async () => {
  await mint();
};

// before test we need manually set owner of asset to token contract
const mint = async () => {
  contract_info = await fs.readJson(deployed_info_file);
  const token_address = contract_info.erc20TokenAddress;
  const erc20_token = new ethers.Contract(token_address, ERC20PrecompileInstance.abi, wallet);
  // check name is same as in asset pallet
  console.log(`ERC20Token name is ${await erc20_token.name()}`);
  console.log(`ERC20Token init balance is ${await erc20_token.balanceOf(accountOfAdmin.address)}`);
  await (await erc20_token.mint(accountOfAdmin.address, ethers.utils.parseEther('1.0'))).wait();
  console.log(`ERC20Token balance after mint is ${await erc20_token.balanceOf(accountOfAdmin.address)}`);
  await (await erc20_token.burn(accountOfAdmin.address, ethers.utils.parseEther('0.5'))).wait();
  console.log(`ERC20Token balance after burn is ${await erc20_token.balanceOf(accountOfAdmin.address)}`);
};

(async () => {
  try {
    const mode = process.argv.slice(2)[0];
    if (mode == 'init') {
      await init();
    } else if (mode == 'deploy') {
      await deploy();
    } else if (mode == 'test') {
      await test();
    } else {
      throw new Error('not support');
    }
  } catch (e) {
    console.error(e);
  }
})();
