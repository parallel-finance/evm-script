const dotenv = require('dotenv');
dotenv.config({path:'./test.env'})

const ethers = require('ethers');
const {Wallet, Contract, providers, utils} = ethers;
const { defaultAbiCoder, arrayify, keccak256, toUtf8Bytes } = utils;
const fs = require('fs-extra');
const { deployContract, setJSON,logger,getSignedExecuteInput, getRandomID } = require('../utils');
const { deployContractConstant, predictContractConstant } = require('../constAddressDeployer');
const { deployUpgradable } = require('../upgradable');
const polkadotCryptoUtils = require('@polkadot/util-crypto');

const {asset_address,accountOfAdmin,providerRPC,provider,wallet,
  deployed_info_file,ConstAddressDeployer,ERC20PrecompileInstance,
  ERC20CrossChainExecutor,TokenDeployer,Auth,
  AxelarGasReceiver,AxelarGasReceiverProxy,
  AxelarGatewayProxy,AxelarGateway,IAxelarGateway,
  getBalance} = require('../env')


let contract_info = {
  gateway: '0x',
  gasReceiver: '0x',
  constAddressDeployer: '0x',
  crossChainTokenExecutor: '0x',
  ss58CrossChainTokenExecutor: '0x',
  erc20TokenAddress: '0x',
  erc20SS58Address: '',
};

// deploy constAddress deployer first
const init = async () => {
  await getBalance(accountOfAdmin.address);
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


(async () => {
  try {
    const mode = process.argv.slice(2)[0];
    if (mode == 'init') {
      await init();
    } else if (mode == 'deploy') {
      await deploy();
    } else {
      throw new Error('not support');
    }
  } catch (e) {
    console.error(e);
  }
})();
