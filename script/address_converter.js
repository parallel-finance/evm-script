const help = '--address <address>: Calculate the EVM address that corresponds to a native Substrate address or vice versa.';

const polkadotCryptoUtils = require('@polkadot/util-crypto');
const polkadotUtils = require('@polkadot/util');
const addressPrefix = 110;

if (process.argv.length < 3) {
  console.error('Please provide the <address> parameter.');
  console.error(help);
  process.exit(9);
}

const address = process.argv[2];
if (!address.match(/^[A-z0-9]*/)) {
  console.error('Please enter a valid Substrate or EVM address.');
  console.error(help);
  process.exit(9);
}

if (polkadotCryptoUtils.isEthereumAddress(address)) {
  console.log(polkadotCryptoUtils.evmToAddress(address, addressPrefix));
} else {
  console.log(polkadotUtils.u8aToHex(polkadotCryptoUtils.addressToEvm(address, true)));
}
