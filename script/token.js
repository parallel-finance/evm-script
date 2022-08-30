const ethers = require('ethers');
const {deployContract} = require('./utils');
const {deployContractConstant,predictContractConstant} = require('./constAddressDeployer');

const ConstAddressDeployer = require('../artifacts/contracts/pre-deploy/ConstAddressDeployer.sol/ConstAddressDeployer.json');
const ERC20PrecompileInstance = require('../artifacts/contracts/pre-deploy/ERC20Precompile.sol/ERC20Instance.json')

const providerRPC = {
  dev: {
    name: 'parallel-evm-chain',
    rpc: 'http://127.0.0.1:29933',
    chainId: 592,
  },
};

const accountOfAlice = {
  address: '0x8097c3C354652CB1EEed3E5B65fBa2576470678A',
  //wellknown alice is not secret
  privateKey: '0xe5be9a5092b81bca64be81d212e7f2f9eba183bb7a90954f7b76361f6edb5c0a',
};

//mapping to asset with id=1(assuming dai) which is created in asset pallet
const asset_address = ethers.utils.getAddress('0xFfFFFFff00000000000000000000000000000001')

const provider = new ethers.providers.StaticJsonRpcProvider(
  providerRPC.dev.rpc, 
  {
    chainId: providerRPC.dev.chainId,
    name: providerRPC.dev.name,
  }
);

const wallet = new ethers.Wallet(accountOfAlice.privateKey, provider);

const balances = async (account) => {
    return ethers.utils.formatEther(await provider.getBalance(account));
};

const deployTokenWithConstAddress = async () => {
    //use ConstAddressDeployer
    const deployKey = 'parallel-evm-pre-deploy'
    const token_address = await predictContractConstant(
      deployer,
      wallet,
      ERC20PrecompileInstance,
      deployKey,
      [asset_address],
    );
    console.log(`predict ERC20Token deployed to ${token_address}`)
    const token_contract = await deployContractConstant(
      deployer,
      wallet,
      ERC20PrecompileInstance,
      deployKey,
      [asset_address],
    );
    console.log(`ERC20Token deployed to ${await token_contract.address}`)
}

const deploy = async ()=> {
    const balanceOfAlice = await balances(accountOfAlice.address);
    console.log(`The balance of ${accountOfAlice.address} is: ${balanceOfAlice} HKO`);
    //deploy constAddress deployer first
    let deployer = await deployContract(wallet, ConstAddressDeployer);
    console.log(`constAddressDeployer deployed to ${deployer.address}`)
    //deploy ERC20PrecompileInstance
    const token_contract = await deployContract(wallet, ERC20PrecompileInstance,[asset_address]);
    console.log(`ERC20Token deployed to ${await token_contract.address}`)
    //check name is same as in asset pallet
    console.log(`ERC20Token name as ${await token_contract.name()}`) 
}

const mint = async (token_address)=> {
  //before test manually set owner of asset to token contract
  const erc20_token = new ethers.Contract(token_address, ERC20PrecompileInstance.abi, wallet);
  console.log(`ERC20Token balance is ${await erc20_token.balanceOf(accountOfAlice.address)}`)
  await (await erc20_token.mint(accountOfAlice.address,ethers.utils.parseEther('1.0'))).wait();
  console.log(`ERC20Token balance after mint is ${await erc20_token.balanceOf(accountOfAlice.address)}`)
  await (await erc20_token.burn(accountOfAlice.address,ethers.utils.parseEther('0.5'))).wait();
  console.log(`ERC20Token balance after mint is ${await erc20_token.balanceOf(accountOfAlice.address)}`)
}

(async () => {
    try {
      const mode = process.argv.slice(2)[0];
      if(mode=='deploy'){
        await deploy()
      }else if(mode=='mint'){
        await mint(process.argv.slice(2)[1])
      }else{
        throw new Error('not support')
      }
    } catch (e) {
        console.error(e)
    }
})();