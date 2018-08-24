let BITBOXCli = require('bitbox-cli/lib/bitbox-cli').default;
let BITBOX = new BITBOXCli({
  restURL: "https://trest.bitcoin.com/v1/"
});

const socket = new BITBOX.Socket({
  restURL: "https://trest.bitcoin.com"
})
socket.listen('transactions', (msg) => {
  const trans = JSON.parse(msg);
  for (const output of trans.outputs) {
    for(const addr of output.scriptPubKey.addresses) {
      if (addr === "mhdnbHsHgTRUYp1Jt6tZcWBb9PxwYt4eTC") {
        console.log('Transaction detected...')
      }
    }
  }
})

createAccount();
//spend();
//checkAccount();

function checkAccount() {
  const wif = 'cNgciJr2mLDL9hxX7z7TQRuV5TR5C8irJy6tJRyZZhwhJkt1PEmr';
  const ecPair = BITBOX.ECPair.fromWIF(wif);
  const address = BITBOX.ECPair.toCashAddress(ecPair);

  BITBOX.Address.details([address])
    .then(result => {
      return BITBOX.Transaction.details(result[0].transactions[1])
    })
    .then(tx => {
      const optData = tx.vout[0].scriptPubKey.asm;
      let fromAsm = BITBOX.Script.fromASM(optData)
      let decoded = BITBOX.Script.decode(fromAsm)
      console.log(decoded[1].toString('ascii'));
  })
    .catch(err => {
      console.log(err);
    })
}

function spend() {

  const wif = 'cNgciJr2mLDL9hxX7z7TQRuV5TR5C8irJy6tJRyZZhwhJkt1PEmr';
  const ecPair = BITBOX.ECPair.fromWIF(wif);
  const address = BITBOX.ECPair.toLegacyAddress(ecPair);

  console.log(address);
  if (!BITBOX.Address.isTestnetAddress(address)) {
    throw 'This is not a testnet address!!'
  }

  let balance = 0;
  BITBOX.Address.details(address)
    .then(result => {
      balance = result.balance;
      console.log(result);
      return BITBOX.Address.utxo(address)
    })
    .then(result => {
      if (!result[0]) {
        return;
      }

      // instance of transaction builder
      let transactionBuilder = new BITBOX.TransactionBuilder('testnet');
      // original amount of satoshis in vin
      let originalAmount = result[0].satoshis;

      // index of vout
      let vout = result[0].vout;

      // txid of vout
      let txid = result[0].txid;

      // add input with txid and index of vout
      transactionBuilder.addInput(txid, vout);

      let buf = new Buffer('Test 123');

      let data = BITBOX.Script.encode([
        BITBOX.Script.opcodes.OP_RETURN,
        buf
      ])
      // add encoded data as output and send 0 satoshis
      transactionBuilder.addOutput(data, 0)

      // get byte count to calculate fee. paying 1 sat/byte
      let byteCount = BITBOX.BitcoinCash.getByteCount({
        P2PKH: 2
      }, {
          P2PKH: 2
        });
      // 192
      // amount to send to receiver. It's the original amount - 1 sat/byte for tx size
      let sendAmount = originalAmount - byteCount;

      // add output w/ address and amount to send
      transactionBuilder.addOutput(address, sendAmount);

      // sign w/ HDNode
      let redeemScript;
      transactionBuilder.sign(0, ecPair, redeemScript, transactionBuilder.hashTypes.SIGHASH_ALL, originalAmount);

      // build tx
      let tx = transactionBuilder.build();
      // output rawhex
      let hex = tx.toHex();
      console.log(`Transaction raw hex: ${hex}`);

      return BITBOX.RawTransactions.sendRawTransaction(hex)
    })
    .then(tx => {
      console.log(tx);
    })
    .catch(err => {
      console.log(err)
    })
}

function createAccount() {
  let langs = [
    'english'
  ]

  let lang = langs[Math.floor(Math.random() * langs.length)];

  // create 256 bit BIP39 mnemonic
  let mnemonic = BITBOX.Mnemonic.generate(256, BITBOX.Mnemonic.wordLists()[lang])
  console.log("BIP44 $BCH Wallet");
  console.log(`256 bit ${lang} BIP39 Mnemonic: `, mnemonic);

  // root seed buffer
  let rootSeed = BITBOX.Mnemonic.toSeed(mnemonic)

  // master HDNode
  let masterHDNode = BITBOX.HDNode.fromSeed(rootSeed, 'testnet')

  const wif = BITBOX.HDNode.toWIF(masterHDNode);
  const address = BITBOX.HDNode.toLegacyAddress(masterHDNode);

  if (!BITBOX.Address.isTestnetAddress(address)) {
    throw 'This is not a testnet address!!'
  }

  console.log(wif);
  console.log(address);
}