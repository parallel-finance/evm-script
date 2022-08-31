const { ContractFactory, ethers } = require('ethers');
const { defaultAbiCoder, id, arrayify, keccak256 } = ethers.utils;
const http = require('http');
const { outputJsonSync } = require('fs-extra');

const logger = { log: console.log };

const getRandomInt = (max) => {
  return Math.floor(Math.random() * max);
};

const bigNumberToNumber = (bigNumber)=> {
  return bigNumber.toNumber();
}

const getSignedExecuteInput = async(data,wallet)=> {
  const signature = await wallet.signMessage(arrayify(keccak256(data)));
  const signData = defaultAbiCoder.encode(['address[]', 'uint256[]', 'uint256', 'bytes[]'], [[wallet.address], [1], 1, [signature]]);
  return defaultAbiCoder.encode(['bytes', 'bytes'], [data, signData]);
}

const getRandomID = () => id(getRandomInt(1e10).toString());

const getLogID = (chain, log) => {
  return id(chain + ':' + log.blockNumber + ':' + log.transactionIndex + ':' + log.logIndex);
};

const deployContract = async (
  wallet,
  contractJson,
  args = [],
  options = {},
) => {
  const factory = new ContractFactory(
    contractJson.abi,
    contractJson.bytecode,
    wallet,
  );

  const contract = await factory.deploy(...args, { ...options });
  await contract.deployed();
  return contract;
};

const setJSON = (data, name) => {
  outputJsonSync(name, data, {
    spaces: 2,
    EOL: '\n',
  });
};

const httpGet = (url) => {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      const { statusCode } = res;
      const contentType = res.headers['content-type'];
      let error;

      if (statusCode !== 200) {
        error = new Error('Request Failed.\n' + `Status Code: ${statusCode}`);
      } else if (!/^application\/json/.test(contentType)) {
        error = new Error(
          'Invalid content-type.\n' +
            `Expected application/json but received ${contentType}`,
        );
      }

      if (error) {
        res.resume();
        reject(error);
        return;
      }

      res.setEncoding('utf8');
      let rawData = '';
      res.on('data', (chunk) => {
        rawData += chunk;
      });
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(rawData);
          resolve(parsedData);
        } catch (e) {
          reject(e);
        }
      });
    });
  });
};

module.exports = {httpGet,logger,bigNumberToNumber,setJSON,deployContract,
  getLogID,getRandomID,getSignedExecuteInput}