const {
    getDefaultProvider,
    Contract,
    constants: { AddressZero },
    utils: { defaultAbiCoder },
} = require('ethers');
const { deployUpgradable } = require('@axelar-network/axelar-gmp-sdk-solidity');

const ERC20CrossChainProxy = require('../artifacts/contracts/pre-deploy/axelar-bridge/ERC20CrossChainProxy.sol/ERC20CrossChainProxy.json');
const ERC20CrossChain = require('../artifacts/contracts/pre-deploy/axelar-bridge/ERC20CrossChainTest.sol/ERC20CrossChain.json');

const name = 'DAI';
const symbol = 'DAI';
const decimals = 18;

async function deploy(chain, wallet) {
    console.log(`Deploying ERC20CrossChain for ${chain.name}.`);
    const contract = await deployUpgradable(
        chain.constAddressDeployer,
        wallet,
        ERC20CrossChain,
        ERC20CrossChainProxy,
        [chain.gateway, chain.gasReceiver, decimals],
        [],
        defaultAbiCoder.encode(['string', 'string'], [name, symbol]),
        'ERC20CrossChain',
    );
    chain.crossChainToken = contract.address;
    console.log(`Deployed ERC20CrossChain for ${chain.name} at ${chain.crossChainToken}.`);
}

async function test(chains, wallet, options) {
    const args = options.args || [];
    const getGasPrice = options.getGasPrice;
    for (const chain of chains) {
        const provider = getDefaultProvider(chain.rpc);
        chain.wallet = wallet.connect(provider);
        chain.contract = await deployUpgradable(
            chain.constAddressDeployer,
            chain.wallet,
            ERC20CrossChain,
            ERC20CrossChainProxy,
            [chain.gateway, chain.gasReceiver, decimals],
            [],
            defaultAbiCoder.encode(['string', 'string'], [name, symbol]),
            'ERC20CrossChain',
        );
    }
    const source = chains.find((chain) => chain.name == (args[0] || 'Avalanche'));
    const destination = chains.find((chain) => chain.name == (args[1] || 'Fantom'));
    const amount = parseInt(args[2]) || 1e5;

    async function print() {
        console.log(`Balance at ${source.name} is ${await source.contract.balanceOf(wallet.address)}`);
        console.log(`Balance at ${destination.name} is ${await destination.contract.balanceOf(wallet.address)}`);
    }
    function sleep(ms) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve();
            }, ms);
        });
    }
    const initialBalance = (await destination.contract.balanceOf(wallet.address)).toNumber();
    console.log('--- Initially ---');
    await print();

    // Set the gasLimit to 3e5 (a safe overestimate) and get the gas price (this is constant and always 1).
    const gasLimit = 3e5;
    const gasPrice = await getGasPrice(source, destination, AddressZero);
    await (await source.contract.giveMe(amount)).wait();
    console.log('--- After getting some token on the source chain ---');
    await print();

    await (
        await source.contract.transferRemote(destination.name, wallet.address, amount, { value: BigInt(Math.floor(gasLimit * gasPrice)) })
    ).wait();

    while ((await destination.contract.balanceOf(wallet.address)).toNumber() === initialBalance) {
        await sleep(2000);
    }

    console.log('--- After ---');
    await print();
}

module.exports = {
    deploy,
    test,
};
