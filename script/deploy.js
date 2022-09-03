const ethers = require('ethers');
const {Wallet, Contract, providers, utils} = ethers;
const { defaultAbiCoder, arrayify, keccak256, toUtf8Bytes } = utils;
const fs = require('fs-extra');
const { deployContract, setJSON,logger,getSignedExecuteInput, getRandomID } = require('./utils');
const { deployContractConstant, predictContractConstant } = require('./constAddressDeployer');
const { deployUpgradable } = require('./upgradable');
const polkadotCryptoUtils = require('@polkadot/util-crypto');

const ConstAddressDeployer = require('../artifacts/contracts/pre-deploy/ConstAddressDeployer.sol/ConstAddressDeployer.json');

const ERC20PrecompileInstance = require('../artifacts/contracts/pre-deploy/ERC20Precompile.sol/ERC20Instance.json');

const ERC20CrossChainExecutor = require('../artifacts/contracts/pre-deploy/axelar-bridge/ERC20CrossChain.sol/ERC20CrossChain.json');

const TokenDeployer = require('../artifacts/@axelar-network/axelar-cgp-solidity/contracts/TokenDeployer.sol/TokenDeployer.json');
const Auth = require('../artifacts/@axelar-network/axelar-cgp-solidity/contracts/auth/AxelarAuthWeighted.sol/AxelarAuthWeighted.json');
const AxelarGasReceiver = require('../artifacts/@axelar-network/axelar-cgp-solidity/contracts/gas-service/AxelarGasService.sol/AxelarGasService.json');
const AxelarGasReceiverProxy = require('../artifacts/@axelar-network/axelar-cgp-solidity/contracts/gas-service/AxelarGasServiceProxy.sol/AxelarGasServiceProxy.json');
const AxelarGatewayProxy = require('../artifacts/@axelar-network/axelar-cgp-solidity/contracts/AxelarGatewayProxy.sol/AxelarGatewayProxy.json');
const AxelarGateway = require('../artifacts/@axelar-network/axelar-cgp-solidity/contracts/AxelarGateway.sol/AxelarGateway.json');
const IAxelarGateway = require('../artifacts/@axelar-network/axelar-cgp-solidity/contracts/interfaces/IAxelarGateway.sol/IAxelarGateway.json');


const providerRPC = {
  chain: {
    name: 'parallel-evm-chain',
    rpc: (process.env.RPC_URL) || 'http://127.0.0.1:29933',
    chainId: (process.env.CHAIN_ID) || 592,
    addressPrefix: (process.env.SS58_PREFIX) || 110,
    deployKey: 'parallel-evm-deployer',
    maxGasLimit: 4_000_000,
  },
};

const ALICE = '0x8097c3C354652CB1EEed3E5B65fBa2576470678A' 
const ALICEKEY = '0xe5be9a5092b81bca64be81d212e7f2f9eba183bb7a90954f7b76361f6edb5c0a'

// we fund alice in substrate chain spec as admin
const accountOfAdmin = {
  address: (process.env.ADMIN_ADDRESS) || ALICE,
  // alice's key is no secret
  privateKey: (process.env.ADMIN_PRIVATE_KEY) || ALICEKEY
};

// mapping to asset with id=1(assuming dai) which is created in asset pallet
const asset_address = ethers.utils.getAddress(
  (process.env.ASSET_PRECOMPILE_ADDRESS) || '0xFfFFFFff00000000000000000000000000000001');

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
  gateway: '0x',
  gasReceiver: '0x',
  constAddressDeployer: '0x',
  crossChainTokenExecutor: '0x',
  ss58CrossChainTokenExecutor: '0x',
  erc20TokenAddress: '0x',
  erc20SS58Address: '',
};

const balances = async (account) => {
  return ethers.utils.formatEther(await provider.getBalance(account));
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
  await _deployToken()
  setJSON(contract_info, deployed_info_file);
};

const deploy = async () => {
  contract_info = await fs.readJson(deployed_info_file);
  await deploy_bridge();
  setJSON(contract_info, deployed_info_file);
};

const deploy_bridge = async () => {
  await _deployGateway()
  await _deployGasReceiver()
  await _deployCrossChainExecutor()
};

const _deployGateway = async () => {
  logger.log(`Deploying Axelar Gateway... `);
  const deployer = contract_info.constAddressDeployer;
  const deployKey = providerRPC.chain.deployKey;
  const auth = await deployContractConstant(
    deployer,
    wallet,
    Auth,
    deployKey,
    [
      [defaultAbiCoder.encode(['address[]', 'uint256[]', 'uint256'], [[wallet.address], [1], 1])],
    ],
  );
  logger.log(`Auth Deployed at ${auth.address}`);
  const tokenDeployer = await deployContractConstant(
    deployer,
    wallet,
    TokenDeployer,
    deployKey,
  );
  logger.log(`TokenDeployer Deployed at ${tokenDeployer.address}`);
  const _gateway = await deployContractConstant(
    deployer,
    wallet,
    AxelarGateway,
    deployKey,
    [auth.address, tokenDeployer.address],
    //need manually set, estimateGas will fail and need furthur investigate
    providerRPC.chain.maxGasLimit,
  );
  logger.log(`AxelarGateway Deployed at ${_gateway.address}`);
  const params = arrayify(
    defaultAbiCoder.encode(
        ['address[]', 'uint8', 'bytes'],
        [[wallet.address], 3, '0x']
    )
  );
  const proxy = await deployContractConstant(deployer, wallet, 
    AxelarGatewayProxy, deployKey,[_gateway.address, params],
    providerRPC.chain.maxGasLimit,
  );
  logger.log(`AxelarGatewayProxy Deployed at ${proxy.address}`);
  await auth.transferOwnership(proxy.address,{gasPrice: 1e9, gasLimit: 1e6});
  const gateway = new Contract(proxy.address, IAxelarGateway.abi, provider);
  contract_info.gateway = gateway.address;
}

const _deployGasReceiver = async() => {
  logger.log(`Deploying Axelar Gas Receiver ... `);
  const deployer = contract_info.constAddressDeployer;
  const deployKey = providerRPC.chain.deployKey;
  const _gasReceiver = await deployContractConstant(
    deployer,
    wallet,
    AxelarGasReceiver,
    deployKey,
    [],
  );
  logger.log(`GasReceiver Deployed at ${_gasReceiver.address}`);
  
  const gasReceiverProxy = await deployContractConstant(deployer,wallet, AxelarGasReceiverProxy,deployKey);
  await gasReceiverProxy.init(_gasReceiver.address, wallet.address, '0x', {gasPrice: 1e9, gasLimit: 1e6});
  logger.log(`gasReceiverProxy Deployed and initialzed at ${gasReceiverProxy.address}`)
  contract_info.gasReceiver = gasReceiverProxy.address;
}

const _deployToken = async () => {
  logger.log(`Deploying ERC20 Token... `);
  const deployer = contract_info.constAddressDeployer;
  const deployKey = providerRPC.chain.deployKey;
  //contract address can be predicted
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

  const approveCall = await token_contract.setupOwner(wallet.address,{gasPrice: 1e9, gasLimit: 1e6})
  await approveCall.wait();
  console.log('ERC20Token reset ownership');
  
  contract_info.erc20TokenAddress = (await token_contract.address);
  contract_info.erc20SS58Address = polkadotCryptoUtils.evmToAddress(contract_info.erc20TokenAddress, providerRPC.chain.addressPrefix);
  console.log('erc20SS58Address is: ' + contract_info.erc20SS58Address);
    
};

const _deployCrossChainExecutor = async() => {
  console.log(`Deploying ERC20CrossChainExecutor ...`);
  const deployer = contract_info.constAddressDeployer;
  const deployKey = providerRPC.chain.deployKey;
  //for precompiles not support delegate call behind proxy
  //so not deploy with proxy here
  const crosschainExecutor = await deployContractConstant(
    deployer,
    wallet,
    ERC20CrossChainExecutor,
    deployKey,
    [contract_info.gateway, contract_info.gasReceiver, asset_address],
  );
  const resetOwnerCall = await crosschainExecutor.setupOwner(wallet.address,{gasPrice: 1e9, gasLimit: 1e6});
  await resetOwnerCall.wait();

  contract_info.crossChainTokenExecutor = crosschainExecutor.address;
  console.log(`Deployed ERC20CrossChainExecutor at ${crosschainExecutor.address}`);
  contract_info.ss58CrossChainTokenExecutor = polkadotCryptoUtils.evmToAddress(contract_info.crossChainTokenExecutor, providerRPC.chain.addressPrefix);
  console.log(`ERC20CrossChainExecutor's ss58 mapping address is: ${contract_info.ss58CrossChainTokenExecutor}`)
  
  const erc20_token = new Contract(contract_info.erc20TokenAddress, ERC20PrecompileInstance.abi, wallet);
  const approveCall = await erc20_token.setupOperators([crosschainExecutor.address,wallet.address],{gasPrice: 1e9, gasLimit: 1e6})
  await approveCall.wait();
  console.log('approve ERC20CrossChainExecutor as ERC20Token Operator');
}

const test = async () => {
  await mint();
};

// before this mint test we need manually set owner of asset to ss58 mapping of executor contract
const mint = async () => {
  contract_info = await fs.readJson(deployed_info_file);
  const token_address = contract_info.erc20TokenAddress;
  console.log('ERC20 Token Address:' + token_address);
  const erc20_token = new Contract(contract_info.erc20TokenAddress, ERC20PrecompileInstance.abi, wallet);
  // check name is same as in asset pallet
  console.log(`ERC20Token name is ${await erc20_token.name()}`);
  //since we add authentication, now only executor can mint/burn
  // await (await erc20_token.mint(accountOfAdmin.address, ethers.utils.parseEther('1.0'),{gasPrice: 1e9, gasLimit: 1e6})).wait();
  // console.log(`ERC20Token balance after mint is ${await erc20_token.balanceOf(accountOfAdmin.address)}`);
  // // await (await erc20_token.burn(accountOfAdmin.address, ethers.utils.parseEther('0.5'),{gasPrice: 1e9, gasLimit: 1e6})).wait();
  // console.log(`ERC20Token balance after burn is ${await erc20_token.balanceOf(accountOfAdmin.address)}`); 
  // //check executor can mint
  const crosschainExecutor = new Contract(contract_info.crossChainTokenExecutor, ERC20CrossChainExecutor.abi, wallet);
  await (await crosschainExecutor.mint(accountOfAdmin.address, ethers.utils.parseEther('1'),{gasPrice: 1e9, gasLimit: 1e6})).wait;
  console.log(`ERC20Token balance after mint is ${await erc20_token.balanceOf(accountOfAdmin.address)}`);
  await (await crosschainExecutor.burn(accountOfAdmin.address, ethers.utils.parseEther('0.5'),{gasPrice: 1e9, gasLimit: 1e6})).wait;
  console.log(`ERC20Token balance after mint is ${await erc20_token.balanceOf(accountOfAdmin.address)}`); 
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
