
const Web3 = require("web3");
const web3 = new Web3();

const address = process.argv[2];//"ffffffff00000000000000000000000000000001"
console.log(web3.utils.toChecksumAddress(address))