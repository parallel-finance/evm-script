const ethers = require('ethers');
const {deployContract} = require('./utils');

const ConstAddressDeployer = require('../artifacts/contracts/pre-deploy/ConstAddressDeployer.sol/ConstAddressDeployer.json');


const providerRPC = {
  dev: {
    name: 'parallel-evm-dev-chain',
    rpc: 'http://127.0.0.1:29933',
    chainId: 592,
  },
};

const accountOfAlice = {
  address: '0x8097c3C354652CB1EEed3E5B65fBa2576470678A',
  //welknown alice is not secret
  privateKey: '0xe5be9a5092b81bca64be81d212e7f2f9eba183bb7a90954f7b76361f6edb5c0a',
};

const provider = new ethers.providers.StaticJsonRpcProvider(
  providerRPC.dev.rpc, 
  {
    chainId: providerRPC.dev.chainId,
    name: providerRPC.dev.name,
  }
);

const wallet = new ethers.Wallet(accountOfAlice.privateKey, provider);

const balances = async (account) => {
    const balanceof = ethers.utils.formatEther(await provider.getBalance(account));
    
    console.log(`The balance of ${account} is: ${balanceof} HKO`);
};

(async () => {
    try {
        await balances(accountOfAlice.address);
        let deployer = await deployContract(wallet, ConstAddressDeployer);
        console.log(`constAddressDeployer deployed to ${deployer.address}`)
        //todo: deploy pre-deploy contracts like erc20-adaptor and axelar-bridge
    } catch (e) {
        console.error(e)
    }
})();