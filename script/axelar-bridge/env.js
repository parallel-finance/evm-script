const ethers = require('ethers');

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

const ConstAddressDeployer = require('../../artifacts/contracts/pre-deploy/ConstAddressDeployer.sol/ConstAddressDeployer.json');
const ERC20PrecompileInstance = require('../../artifacts/contracts/pre-deploy/ERC20Precompile.sol/ERC20Instance.json');
const ERC20CrossChainExecutor = require('../../artifacts/contracts/pre-deploy/axelar-bridge/ERC20CrossChain.sol/ERC20CrossChain.json');
const TokenDeployer = require('../../artifacts/@axelar-network/axelar-cgp-solidity/contracts/TokenDeployer.sol/TokenDeployer.json');
const Auth = require('../../artifacts/@axelar-network/axelar-cgp-solidity/contracts/auth/AxelarAuthWeighted.sol/AxelarAuthWeighted.json');
const AxelarGasReceiver = require('../../artifacts/@axelar-network/axelar-cgp-solidity/contracts/gas-service/AxelarGasService.sol/AxelarGasService.json');
const AxelarGasReceiverProxy = require('../../artifacts/@axelar-network/axelar-cgp-solidity/contracts/gas-service/AxelarGasServiceProxy.sol/AxelarGasServiceProxy.json');
const AxelarGatewayProxy = require('../../artifacts/@axelar-network/axelar-cgp-solidity/contracts/AxelarGatewayProxy.sol/AxelarGatewayProxy.json');
const AxelarGateway = require('../../artifacts/@axelar-network/axelar-cgp-solidity/contracts/AxelarGateway.sol/AxelarGateway.json');
const IAxelarGateway = require('../../artifacts/@axelar-network/axelar-cgp-solidity/contracts/interfaces/IAxelarGateway.sol/IAxelarGateway.json');


  
const getBalance = async (account) => {
const balance = await ethers.utils.formatEther(await provider.getBalance(account));
console.log(`The balance of ${account} is: ${balance} HKO`);
};

module.exports = {
    asset_address,accountOfAdmin,providerRPC,provider,wallet,deployed_info_file,
    ConstAddressDeployer,ERC20PrecompileInstance,ERC20CrossChainExecutor,
    TokenDeployer,Auth,AxelarGasReceiver,AxelarGasReceiverProxy,
    AxelarGatewayProxy,AxelarGateway,IAxelarGateway,getBalance
}
