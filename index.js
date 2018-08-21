let BITBOXCli = require('bitbox-cli/lib/bitbox-cli').default;
let BITBOX = new BITBOXCli({
  protocol: "http",
  host: "localhost",
  port: "8332",
  username: "",
  password: ""
});


//createAccount();
spend();


function spend() {

  const wif = 'KwNibZk3gRh7AZSHVc1GyEeuUBvypgpXY4vWBK34bgD6D5uSXktn';
  const ecPair = BITBOX.ECPair.fromWIF(wif);
  const address = BITBOX.ECPair.toLegacyAddress(ecPair);

  console.log(address);
  // if (!BITBOX.Address.isTestnetAddress(address)) {
  //   throw 'This is not a testnet address!!'
  // }

  BITBOX.Address.details(address).then(result => {
    console.log(result);
  }, err => {
    console.log(err)
  })

  BITBOX.Address.utxo(address).then((result) => {
    console.log('result time!');
    console.log(result);
    if (!result[0]) {
      return;
    }

    // instance of transaction builder
    let transactionBuilder = new BITBOX.TransactionBuilder('bitcoincash');
    // original amount of satoshis in vin
    let originalAmount = result[0].satoshis;

    // index of vout
    let vout = result[0].vout;

    // txid of vout
    let txid = result[0].txid;

    // add input with txid and index of vout
    transactionBuilder.addInput(txid, vout);

    // get byte count to calculate fee. paying 1 sat/byte
    let byteCount = BITBOX.BitcoinCash.getByteCount({
      P2PKH: 1
    }, {
      P2PKH: 1
    });
    // 192
    // amount to send to receiver. It's the original amount - 1 sat/byte for tx size
    let sendAmount = originalAmount - byteCount;

    // add output w/ address and amount to send
    transactionBuilder.addOutput(cashAddress, sendAmount);

    // keypair
    let keyPair = BITBOX.HDNode.toKeyPair(change);

    // sign w/ HDNode
    let redeemScript;
    transactionBuilder.sign(0, keyPair, redeemScript, transactionBuilder.hashTypes.SIGHASH_ALL, originalAmount);

    // build tx
    let tx = transactionBuilder.build();
    // output rawhex
    let hex = tx.toHex();
    console.log(`Transaction raw hex: ${hex}`);

    // sendRawTransaction to running BCH node
    // BITBOX.RawTransactions.sendRawTransaction(hex).then((result) => {
    //   console.log(`Transaction ID: ${result}`);
    // }, (err) => {
    //   console.log(err);
    // });
  }, (err) => {
    console.log(err);
  });
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
  let masterHDNode = BITBOX.HDNode.fromSeed(rootSeed)

  const wif = BITBOX.HDNode.toWIF(masterHDNode);
  const address = BITBOX.HDNode.toLegacyAddress(masterHDNode);

  if (!BITBOX.Address.isTestnetAddress(address)) {
    throw 'This is not a testnet address!!'
  }

  console.log(wif);
  console.log(address);
}