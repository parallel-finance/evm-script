'use strict';

const {
    utils: { defaultAbiCoder, keccak256 },
    Wallet,
} = require('ethers');
const { createLocal } = require('../script/axelar-bridge/createLocal.js');
const { test } = require('../script/axelar-bridge/test.js');
const { deploy } = require('../script/axelar-bridge/deploy.js');
const {
    stopAll,
    utils: { setLogger },
} = require('@axelar-network/axelar-local-dev');
const fs = require('fs-extra');

const examples = [
    'cross-chain-token'
];

describe('examples', function () {
    this.timeout(30000); 
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

    for (const exampleName of examples) {
        const example = require(`../examples/${exampleName}/index.js`);
        it(exampleName, async () => {
            const chains = fs.readJsonSync('./info/local.json');

            const wallet = new Wallet(deployer_key);
            if (example.deploy) await deploy('local', chains, wallet, example);

            await test('local', chains, [], wallet, example);
        });
    }
});
