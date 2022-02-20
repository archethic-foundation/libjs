const TransactionBuilder = require("../lib/transaction_builder")
const Crypto = require("../lib/crypto")
const { hexToUint8Array, uint8ArrayToHex, concatUint8Arrays, encodeInt32, encodeInt64, toBigInt } = require("../lib/utils")

const assert = require("assert")

describe("Transaction builder", () => {
  it ("should assign type when create a new transaction instance", () => {
    const tx = new TransactionBuilder("transfer")
    assert.strictEqual(tx.type, "transfer")
  })

  describe("setCode", () => {
    it("should insert the code into the transaction data", () => {
      const tx = new TransactionBuilder("transfer").setCode("my smart contract code")
      assert.strictEqual(new TextDecoder().decode(tx.data.code), "my smart contract code")
    })
  })

  describe("setContent", () => {
    it("should insert the content into the transaction data", () => {
      const tx = new TransactionBuilder("transfer").setContent("my super content")
      assert.deepStrictEqual(tx.data.content, new TextEncoder().encode("my super content"))
    })
  })

  describe("addOwnership", () => {
    it("should add an ownership with a secret and its authorized keys into the transaction data", () => {
      const tx = new TransactionBuilder("transfer")
        .addOwnership("00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88", [{
          publicKey: "0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646",
          encryptedSecretKey: "00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88"
        }])

      assert.deepStrictEqual(tx.data.ownerships[0].secret, hexToUint8Array("00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88"))
      assert.deepStrictEqual(tx.data.ownerships[0].authorizedKeys, [
        {
          publicKey: hexToUint8Array("0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"),
          encryptedSecretKey: hexToUint8Array("00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88")
        }
      ])
    })
  })


  describe("addUCOTransfer", () => {
    it("should add an uco transfer to the transaction data", () => {
      const tx = new TransactionBuilder("transfer").addUCOTransfer("00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", 10.03)

      assert.strictEqual(tx.data.ledger.uco.transfers.length, 1)
      assert.deepStrictEqual(tx.data.ledger.uco.transfers[0].to, hexToUint8Array("00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"))
      assert.strictEqual(tx.data.ledger.uco.transfers[0].amount, toBigInt(10.03))
    })
  })

  describe("addNFTTransfer", () => {
    it("should add an nft transfer to the transaction data", () => {
      const tx = new TransactionBuilder("transfer").addNFTTransfer(
        "00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", 
        10.03, 
        "00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"
      )

      assert.strictEqual(tx.data.ledger.nft.transfers.length, 1)
      assert.deepStrictEqual(tx.data.ledger.nft.transfers[0].to, hexToUint8Array("00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"))
      assert.strictEqual(tx.data.ledger.nft.transfers[0].amount, toBigInt(10.03))
      assert.deepStrictEqual(tx.data.ledger.nft.transfers[0].nft, hexToUint8Array("00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"))
    })
  })

  describe("previousSignaturePayload", () => {
    it ("should generate binary encoding of the transaction before signing", () => {

      const code = `
              condition inherit: [
                uco_transferred: 0.020
              ]

              actions triggered by: transaction do
                  set_type transfer
                  add_uco_ledger to: "0056E763190B28B4CF9AAF3324CF379F27DE9EF7850209FB59AA002D71BA09788A", amount: 0.020
              end
            `

      const content = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec sit amet leo egestas, lobortis lectus a, dignissim orci." 

      const secret = "mysecret"

      const tx = new TransactionBuilder("transfer")
        .addOwnership(secret, [{ 
          publicKey: "0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646",
          encryptedSecretKey: "00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88"
        }])
        .addUCOTransfer("00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", 0.2020)
        .addNFTTransfer("00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", 100, "00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88")
        .setCode(code)
        .setContent(content)
        .addRecipient("00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88")

      const keypair = Crypto.deriveKeyPair("seed", 0);
      const address = Crypto.deriveAddress("seed", 1)

      tx.address = address
      tx.previousPublicKey = keypair.publicKey

      const payload = tx.previousSignaturePayload()

      const expected_binary = concatUint8Arrays([
        //Version
        encodeInt32(1),
        tx.address,
        Uint8Array.from([253]),
        //Code size
        encodeInt32(code.length),
        new TextEncoder().encode(code),
        //Content size
        encodeInt32(content.length),
        new TextEncoder().encode(content),
        //Nb of ownerships
        Uint8Array.from([1]),
        //Secret size
        encodeInt32(secret.length),
        new TextEncoder().encode(secret),
        // Nb of authorized keys
        Uint8Array.from([1]),
        // Authorized keys encoding
        concatUint8Arrays([hexToUint8Array("0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"), hexToUint8Array("00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88")]),
        // Nb of uco transfers
        Uint8Array.from([1]),
        concatUint8Arrays([hexToUint8Array("00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"), encodeInt64(toBigInt(0.2020))]),
        // Nb of NFT transfers
        Uint8Array.from([1]),
        concatUint8Arrays([hexToUint8Array("00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88"), hexToUint8Array("00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"), encodeInt64(toBigInt(100))]),
        // Nb of recipients
        Uint8Array.from([1]),
        hexToUint8Array("00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88")
      ])

      assert.deepStrictEqual(payload, expected_binary)
    })
  })

  describe("build", () => {
    it("should build the transaction and the related signature", () => {
      const tx = new TransactionBuilder("transfer")
        .addUCOTransfer("0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", 10.0)
        .build("seed", 0, "ed25519", "sha256")
  
      assert.deepStrictEqual(tx.address, hexToUint8Array("0000cb4ad2c856fda855aa8b67b0e6a46b5c3eeb301e67cd3e53e77ee9d9ccbfc430"))
      assert.deepStrictEqual(tx.previousPublicKey, hexToUint8Array("000061d6cd8da68207bd01198909c139c130a3df3a8bd20f4bacb123c46354ccd52c"))

      assert.strictEqual(Crypto.verify(tx.previousSignature, tx.previousSignaturePayload(), tx.previousPublicKey), true)
    })
  })

  describe("originSignaturePayload", () => {
    it ("should generate binary encoding of the transaction before signing", () => {

      const secret = "mysecret"
      const content = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec sit amet leo egestas, lobortis lectus a, dignissim orci."
      const code = `condition inherit: [
                            uco_transferred: 0.020
                          ]

                          actions triggered by: transaction do
                              set_type transfer
                              add_uco_ledger to: "0056E763190B28B4CF9AAF3324CF379F27DE9EF7850209FB59AA002D71BA09788A", amount: 0.020
                          end
      `

      const tx = new TransactionBuilder("transfer")
        .addOwnership(secret, [{ 
          publicKey: "0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646",
          encryptedSecretKey: "00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88"
        }])
        .addUCOTransfer("00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", 0.2020)
        .addNFTTransfer("00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", 100, "00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88")
        .setCode(code)
        .setContent(content)
        .addRecipient("00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88")
        .build("seed", 0, "P256")

      const transactionKeyPair = Crypto.deriveKeyPair("seed", 0)
      const previousSig = Crypto.sign(tx.previousSignaturePayload(), transactionKeyPair.privateKey)

      const payload = tx.originSignaturePayload()
      const expected_binary = concatUint8Arrays([
        //Version
        encodeInt32(1),
        tx.address,
        Uint8Array.from([253]),
        //Code size
        encodeInt32(code.length),
        new TextEncoder().encode(code),
        //Content size
        encodeInt32(content.length),
        new TextEncoder().encode(content),
        //Nb ownerships
        Uint8Array.from([1]),
        //Secret size
        encodeInt32(secret.length),
        new TextEncoder().encode(secret),
        // Nb of authorized keys
        Uint8Array.from([1]),
        // Authorized keys encoding
        concatUint8Arrays([
          hexToUint8Array("0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"), hexToUint8Array("00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88")
        ]),
        // Nb of uco transfers
        Uint8Array.from([1]),
        concatUint8Arrays([
          hexToUint8Array("00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"), 
          encodeInt64(toBigInt(0.2020))
        ]),
        // Nb of NFT transfers
        Uint8Array.from([1]),
        concatUint8Arrays([
          hexToUint8Array("00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88"), 
          hexToUint8Array("00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"), 
          encodeInt64(toBigInt(100))
        ]),
        // Nb of recipients
        Uint8Array.from([1]),
        hexToUint8Array("00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88"),
        transactionKeyPair.publicKey,
        Uint8Array.from([previousSig.length]),
        previousSig
      ])

      assert.deepStrictEqual(payload, expected_binary)
    })
  })

  describe("originSign", () => {
    it ("should sign the transaction with a origin private key", () => {
      const originKeypair = Crypto.deriveKeyPair("origin_seed", 0)

      const tx = new TransactionBuilder("transfer")
        .build("seed", 0)
        .originSign(originKeypair.privateKey)

      assert.strictEqual(Crypto.verify(tx.originSignature, tx.originSignaturePayload(), originKeypair.publicKey), true)
    })
  })

  describe("toJSON", () => {
    it("should return a JSON from the transaction", () => {
      const originKeypair = Crypto.deriveKeyPair("origin_seed", 0)
      const transactionKeyPair = Crypto.deriveKeyPair("seed", 0)


      const tx = new TransactionBuilder("transfer")
        .addUCOTransfer("0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", 0.2193)
        .addOwnership(Uint8Array.from([0, 1, 2, 3, 4]), [{
          publicKey: "0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646",
          encryptedSecretKey: "00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88"
        }])
        .build("seed", 0)
        .originSign(originKeypair.privateKey)

      const parsedTx = JSON.parse(tx.toJSON())

      const previousSig = Crypto.sign(tx.previousSignaturePayload(), transactionKeyPair.privateKey)
      const originSig = Crypto.sign(tx.originSignaturePayload(), originKeypair.privateKey)

      assert.strictEqual(parsedTx.address, uint8ArrayToHex(Crypto.deriveAddress("seed", 1)))
      assert.strictEqual(parsedTx.type, "transfer")
      assert.strictEqual(parsedTx.previousPublicKey, uint8ArrayToHex(transactionKeyPair.publicKey))
      assert.strictEqual(parsedTx.previousSignature, uint8ArrayToHex(previousSig))
      assert.strictEqual(parsedTx.originSignature, uint8ArrayToHex(originSig))
      assert.strictEqual(parsedTx.data.ownerships[0].secret, uint8ArrayToHex(Uint8Array.from([0, 1, 2, 3, 4])))
      assert.deepStrictEqual(parsedTx.data.ledger.uco.transfers[0], { to: "0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", amount: toBigInt(0.2193)})
      assert.deepStrictEqual(parsedTx.data.ownerships[0].authorizedKeys, [{ publicKey: "0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", encryptedSecretKey: "00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88"}])
    })
  })
})
