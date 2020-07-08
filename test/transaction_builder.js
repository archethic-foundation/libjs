const TransactionBuilder = require("../lib/transaction_builder")
const UnirisCrypto = require("../lib/crypto")
const assert = require("assert")

describe("Transaction builder", () => {

    it ("should assign type when create a new transaction instance", () => {
        tx = new TransactionBuilder("transfer")
        assert.equal(tx.type, "transfer")
    })

    describe("set_code", () => {
        it("should insert the code into the transaction data", () => {
            tx = new TransactionBuilder("transfer")
                .setCode("my smart contract code")

            assert.equal(tx.data.code, "my smart contract code")
        })
    })

    describe("setContent", () => {
        it("should insert the content into the transaction data", () => {
            tx = new TransactionBuilder("transfer")
                .setContent("my super content")

            assert.equal(tx.data.content, "my super content")
        })
    })

    describe("setSecret", () => {
        it("should insert the secret into the transaction data", () => {
            tx = new TransactionBuilder("transfer")
                .setSecret("00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88")

            assert.deepEqual(tx.data.keys.secret, Buffer.from("00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88", 'hex'))
        })
    })

    describe("addAuthorizedKey", () => {
        it("should add an authorized key to the transaction data", () => {

            publicKey = "00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"
            encryptedKey = "00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88"

            tx = new TransactionBuilder("transfer")
                .addAuthorizedKey(publicKey, encryptedKey)

            assert.deepEqual(tx.data.keys.authorizedKeys[Buffer.from(publicKey, 'hex')], Buffer.from(encryptedKey, 'hex'))
        })
    })

    describe("addUCOTransfer", () => {
        it("should add an uco transfer to the transaction data", () => {
            tx = new TransactionBuilder("transfer")
                .addUCOTransfer("00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", 10.03)

            assert.equal(tx.data.ledger.uco.transfers.length, 1)
            assert.deepEqual(tx.data.ledger.uco.transfers[0].to, Buffer.from("00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", "hex"))
            assert.equal(tx.data.ledger.uco.transfers[0].amount, 10.03)
        })
    })

    describe("build", () => {
        it("should build the transaction and the related signature", () => {
            
            const originKeypair = UnirisCrypto.derivateKeyPair("origin_seed", 0)

            tx = new TransactionBuilder("transfer")
                .build("seed", 0, originKeypair.privateKey)

            assert.equal(tx.address.toString('hex'), "00b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646")
            assert.equal(tx.previousPublicKey.toString('hex'), "00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88")
        })
    })

})