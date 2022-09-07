
const {
  utils,
  utils: { defaultAbiCoder, keccak256 },
  Wallet,
  Contract, providers,
} = require('ethers');
const { createLocal } = require('../script/axelar-bridge/createLocal.js');
const { test } = require('../script/axelar-bridge/test.js');
const { deploy } = require('../script/axelar-bridge/deploy.js');
const {
  stopAll,
  utils: { setLogger },
} = require('@axelar-network/axelar-local-dev');
const fs = require('fs-extra');
const dotenv = require('dotenv');
const {requestSignature} = require('../script/utils');
const { u8aToHex } = require('@polkadot/util');
const polkadotCryptoUtils = require('@polkadot/util-crypto');
dotenv.config({path:'./test.env'})

const tests = [
  'cross-chain-token',
];

describe('unit-test', function () {
  this.timeout(10000);
  setLogger((...args) => {});
  const deployer_key = keccak256(
    defaultAbiCoder.encode(
      ['string'],
      ['this is a random string to get a random account. You need to provide the private key for a funded account here.'],
    ),
  );
  const deployer_address = new Wallet(deployer_key).address;
  const toFund = [deployer_address];

  beforeEach(async () => {
    await createLocal(toFund);
  });

  afterEach(async () => {
    await stopAll();
  });

  for (const testName of tests) {
    const testCase = require(`./${testName}.js`);
    it(testName, async () => {
      const chains = fs.readJsonSync('./info/local.json');

      const wallet = new Wallet(deployer_key);
      if (testCase.deploy) await deploy('local', chains, wallet, testCase);

      await test('local', chains, [], wallet, testCase);
    });
  }
});

describe('live-test', function () {
  this.timeout(30000);
  const {wallet,accountOfAdmin,targetAddress,providerRPC} = require('../script/env');
  const deployed_info_file = './info/contracts.json';
  let contract_info,token_address,erc20_token,chain_prefix,executor_address,crosschainExecutor
  beforeEach(async () => {
    chain_prefix = providerRPC.chain.addressPrefix;
    contract_info = await fs.readJson(deployed_info_file);
    ERC20CrossChainExecutor = require('../artifacts/contracts/pre-deploy/axelar-bridge/ERC20CrossChain.sol/ERC20CrossChain.json');
    ERC20PrecompileInstance = require('../artifacts/contracts/pre-deploy/ERC20Precompile.sol/ERC20Instance.json');
    token_address = contract_info.erc20TokenAddress;
    erc20_token = new Contract(contract_info.erc20TokenAddress, ERC20PrecompileInstance.abi, wallet);
    console.log('ERC20 Token Address: ' + token_address);
    
    executor_address = contract_info.crossChainTokenExecutor;
    crosschainExecutor = new Contract(contract_info.crossChainTokenExecutor, ERC20CrossChainExecutor.abi, wallet);
    console.log('ERC20 Bridge Executor\'s Address: ' + executor_address);
    console.log('ERC20 Bridge Executor\'s ss58 Address: ' + polkadotCryptoUtils.evmToAddress(executor_address, chain_prefix));
  });

  it("mint-burn",async()=>{
    // check name is same as in asset pallet
    const token_name = await erc20_token.name();
    console.log(`ERC20Token name is ${token_name}`);
    //since we add authentication, now only executor can mint/burn
    console.log(`\n\nAlice(private key on evm): \nevm address: ${accountOfAdmin.address} \nss58 address: ${polkadotCryptoUtils.evmToAddress(accountOfAdmin.address, chain_prefix)}`)
    await (await crosschainExecutor.mint(accountOfAdmin.address, utils.parseEther('1'),{gasPrice: 1e9, gasLimit: 1e6})).wait;
    console.log(`EVM Alice's balance after mint is ${await erc20_token.balanceOf(accountOfAdmin.address)}`);
    await (await crosschainExecutor.burn(accountOfAdmin.address, utils.parseEther('0.5'),{gasPrice: 1e9, gasLimit: 1e6})).wait;
    console.log(`EVM Alice balance after burn is ${await erc20_token.balanceOf(accountOfAdmin.address)}`); 
    
    console.log(`\n\nAlice(private key on substrate): \noriginal ss58 address: hJKzPoi3MQnSLvbShxeDmzbtHncrMXe5zwS3Wa36P6kXeNpcv \nmapping evm address: ${targetAddress} \nss58 address mapping from evm: ${polkadotCryptoUtils.evmToAddress(targetAddress, chain_prefix)}`)
    await (await crosschainExecutor.mint(targetAddress, utils.parseEther('1'),{gasPrice: 1e9, gasLimit: 1e6})).wait;
    console.log(`Substrate Alice's balance after mint is ${await erc20_token.balanceOf(targetAddress)}`);
  });
});

describe('sign-test', function () {
  var ethUtil = require('ethereumjs-util')
  const ethers = require('ethers')
  const Web3 = require('web3')
  const { keccak256, defaultAbiCoder } = require('ethers/lib/utils')
  const {wallet,accountOfAdmin,provider,providerRPC} = require('../script/env')
  const web3 = new Web3(new Web3.providers.HttpProvider(providerRPC.chain.rpc));
  const { stringToU8a, bnToU8a, u8aConcat, u8aToHex } = require('@polkadot/util');
  it('personal sign',async()=>{
    const message = 'Hello Parallel'
    const _payload = u8aToHex(
      Buffer.from(message, 'utf8')
    );
    console.log(_payload)
    const payload = stringToU8a(message)
    console.log(payload)
    // const sig1 = await requestSignature(provider,payload,accountOfAdmin.address)
    // const messageBytes = keccak256(payload);
    // console.log(messageBytes)
    const sig1 = await wallet.signMessage(payload)
    console.log(sig1)
  });
})
