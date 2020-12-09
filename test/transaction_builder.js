const TransactionBuilder = require("../lib/transaction_builder")
const Crypto = require("../lib/crypto")
const { hexToUint8Array, uint8ArrayToHex, concatUint8Arrays, encodeInt64, encodeInt32, encodeFloat64 } = require("../lib/utils")

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

    describe("setSecret", () => {
        it("should insert the secret into the transaction data", () => {
            const tx = new TransactionBuilder("transfer").setSecret("00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88")
            assert.deepStrictEqual(tx.data.keys.secret, hexToUint8Array("00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88"))
        })
    })

    describe("addAuthorizedKey", () => {
        it("should add an authorized key to the transaction data", () => {
            const publicKey = "00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"
            const encryptedKey = "00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88"

            const tx = new TransactionBuilder("transfer").addAuthorizedKey(publicKey, encryptedKey)

            assert.deepStrictEqual(tx.data.keys.authorizedKeys[publicKey], hexToUint8Array(encryptedKey))
        })
    })

    describe("addUCOTransfer", () => {
        it("should add an uco transfer to the transaction data", () => {
            const tx = new TransactionBuilder("transfer").addUCOTransfer("00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", 10.03)

            assert.strictEqual(tx.data.ledger.uco.transfers.length, 1)
            assert.deepStrictEqual(tx.data.ledger.uco.transfers[0].to, hexToUint8Array("00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"))
            assert.strictEqual(tx.data.ledger.uco.transfers[0].amount, 10.03)
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
            assert.strictEqual(tx.data.ledger.nft.transfers[0].amount, 10.03)
            assert.deepStrictEqual(tx.data.ledger.nft.transfers[0].nft, hexToUint8Array("00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"))
        })
    })

    describe("previousSignaturePayload", () => {
        it ("should generate binary encoding of the transaction before signing", () => {
            const tx = new TransactionBuilder("transfer")
                .addAuthorizedKey("00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", "00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88")
                .setSecret("mysecret")
                .addUCOTransfer("00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", 0.2020)
                .addNFTTransfer("00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", 100, "00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88")
                .setCode(`
                    condition inherit: next_transaction.uco_transfered == 0.020
                    actions triggered by: transaction do
                        set_type transfer
                        add_uco_ledger to: "0056E763190B28B4CF9AAF3324CF379F27DE9EF7850209FB59AA002D71BA09788A", amount: 0.020
                    end
                `)
                .setContent("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec sit amet leo egestas, lobortis lectus a, dignissim orci.")
                .addRecipient("00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88")
            
            const keypair = Crypto.deriveKeyPair("seed", 0);
            const nextKeypair = Crypto.deriveKeyPair("seed", 1)
            const address = Crypto.hash(nextKeypair.publicKey)

            tx.address = address
            tx.previousPublicKey = keypair.publicKey
            tx.timestamp = new Date().getTime()

            const payload = tx.previousSignaturePayload()

            const expected_binary = concatUint8Arrays([
                tx.address,
                Uint8Array.from([2]),
                encodeInt64(tx.timestamp),
                //Code size
                encodeInt32(347),
                new TextEncoder().encode(`
                    condition inherit: next_transaction.uco_transfered == 0.020
                    actions triggered by: transaction do
                        set_type transfer
                        add_uco_ledger to: "0056E763190B28B4CF9AAF3324CF379F27DE9EF7850209FB59AA002D71BA09788A", amount: 0.020
                    end
                `),
                //Content size
                encodeInt32(119),
                new TextEncoder().encode("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec sit amet leo egestas, lobortis lectus a, dignissim orci."),
                //Secret size
                encodeInt32(8),
                new TextEncoder().encode("mysecret"),
                // Nb of authorized keys
                Uint8Array.from([1]),
                // Authorized keys encoding
                concatUint8Arrays([hexToUint8Array("00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"), hexToUint8Array("00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88")]),
                // Nb of uco transfers
                Uint8Array.from([1]),
                concatUint8Arrays([hexToUint8Array("00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"), encodeFloat64(0.2020)]),
                // Nb of NFT transfers
                Uint8Array.from([1]),
                concatUint8Arrays([hexToUint8Array("00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88"), hexToUint8Array("00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"), encodeFloat64(100)]),
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
                .addAuthorizedKey("00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", "00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88")
                .build("seed", 0)

            assert.deepStrictEqual(tx.address, hexToUint8Array("00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"))
            assert.deepStrictEqual(tx.previousPublicKey, hexToUint8Array("00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88"))

            assert.strictEqual(Crypto.verify(tx.previousSignature, tx.previousSignaturePayload(), tx.previousPublicKey), true)
        })
    })

    describe("originSignaturePayload", () => {
        it ("should generate binary encoding of the transaction before signing", () => {
            const tx = new TransactionBuilder("transfer")
                .addAuthorizedKey("00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", "00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88")
                .setSecret("mysecret")
                .addUCOTransfer("00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", 0.2020)
                .addNFTTransfer("00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", 100, "00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88")
                .setCode(`
                    condition inherit: next_transaction.uco_transfered == 0.020
                    actions triggered by: transaction do
                        set_type transfer
                        add_uco_ledger to: "0056E763190B28B4CF9AAF3324CF379F27DE9EF7850209FB59AA002D71BA09788A", amount: 0.020
                    end
                `)
                .setContent("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec sit amet leo egestas, lobortis lectus a, dignissim orci.")
                .addRecipient("00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88")
                .build("seed", 0)

            const transactionKeyPair = Crypto.deriveKeyPair("seed", 0)
            const previousSig = Crypto.sign(tx.previousSignaturePayload(), transactionKeyPair.privateKey)

            const payload = tx.originSignaturePayload()
            const expected_binary = concatUint8Arrays([
                tx.address,
                Uint8Array.from([2]),
                encodeInt64(tx.timestamp),
                //Code size
                encodeInt32(347),
                new TextEncoder().encode(`
                    condition inherit: next_transaction.uco_transfered == 0.020
                    actions triggered by: transaction do
                        set_type transfer
                        add_uco_ledger to: "0056E763190B28B4CF9AAF3324CF379F27DE9EF7850209FB59AA002D71BA09788A", amount: 0.020
                    end
                `),
                //Content size
                encodeInt32(119),
                new TextEncoder().encode("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec sit amet leo egestas, lobortis lectus a, dignissim orci."),
                //Secret size
                encodeInt32(8),
                new TextEncoder().encode("mysecret"),
                // Nb of authorized keys
                Uint8Array.from([1]),
                // Authorized keys encoding
                concatUint8Arrays([hexToUint8Array("00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"), hexToUint8Array("00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88")]),
                // Nb of uco transfers
                Uint8Array.from([1]),
                concatUint8Arrays([hexToUint8Array("00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"), encodeFloat64(0.2020)]),
                // Nb of NFT transfers
                Uint8Array.from([1]),
                concatUint8Arrays([hexToUint8Array("00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88"), hexToUint8Array("00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"), encodeFloat64(100)]),
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
            const nextTransactionKeyPair = Crypto.deriveKeyPair("seed", 1)

            const tx = new TransactionBuilder("transfer")
                .addAuthorizedKey("00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", "00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88")
                .addUCOTransfer("00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", 0.2193)
                .build("seed", 0)
                .originSign(originKeypair.privateKey)

            const parsedTx = JSON.parse(tx.toJSON())

            const previousSig = Crypto.sign(tx.previousSignaturePayload(), transactionKeyPair.privateKey)
            const originSig = Crypto.sign(tx.originSignaturePayload(), originKeypair.privateKey)

            assert.strictEqual(parsedTx.address, uint8ArrayToHex(Crypto.hash(nextTransactionKeyPair.publicKey)))
            assert.strictEqual(parsedTx.type, "transfer")
            assert.strictEqual(parsedTx.previousPublicKey, uint8ArrayToHex(transactionKeyPair.publicKey))
            assert.strictEqual(parsedTx.previousSignature, uint8ArrayToHex(previousSig))
            assert.strictEqual(parsedTx.originSignature, uint8ArrayToHex(originSig))
            assert.strictEqual(parsedTx.data.keys.authorizedKeys["00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"], "00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88")
            assert.deepStrictEqual(parsedTx.data.ledger.uco.transfers[0], { to: "00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", amount:  0.2193})
        })
    })
})
