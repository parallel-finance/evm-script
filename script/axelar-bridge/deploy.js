
const { utils: { setJSON }, testnetInfo } = require('@axelar-network/axelar-local-dev');
const { Wallet, getDefaultProvider } = require('ethers');
const { keccak256, defaultAbiCoder } = require('ethers/lib/utils');
const { GasCostLogger } = require('./gasCosts');

async function deploy (env, chains, wallet, example) {
  const promises = [];
  for (const chain of chains) {
    const rpc = chain.rpc;
    const provider = getDefaultProvider(rpc);
    promises.push(example.deploy(chain, wallet.connect(provider)));
  }
  await Promise.all(promises);
  if (example.postDeploy) {
    for (const chain of chains) {
      const rpc = chain.rpc;
      const provider = getDefaultProvider(rpc);
      promises.push(example.postDeploy(chain, chains, wallet.connect(provider)));
    }
    await Promise.all(promises);
  }
  setJSON(chains, `./info/${env}.json`);
}

module.exports = {
  deploy,
};

if (require.main === module) {
  const example = require(`../${process.argv[2]}/index.js`);

  const env = process.argv[3];
  if (env == null || (env != 'testnet' && env != 'local')) throw new Error('Need to specify tesntet or local as an argument to this script.');
  let temp;
  if (env == 'local') {
    temp = require('../info/local.json');
  } else {
    try {
      temp = require('../info/testnet.json');
    } catch {
      temp = testnetInfo;
    }
  }
  const chains = temp;

  // 0x8ff26335325ad2c33d87bf8be4a53f28abaac5cf654a42080bc2b91938b1281d
  const private_key = keccak256(defaultAbiCoder.encode(['string'], ['this is a random string to get a random account. You need to provide the private key for a funded account here.']));
  const wallet = new Wallet(private_key);

  deploy(env, chains, wallet, example);
}
