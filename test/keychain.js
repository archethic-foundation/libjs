import assert from 'assert'

import Keychain, { keyToJWK } from "../lib/keychain.js"
import { uint8ArrayToHex, concatUint8Arrays } from "../lib/utils.js"
import { deriveAddress, verify } from "../lib/crypto.js"
import TransactionBuilder from "../lib/transaction_builder.js"


describe("keychain to DID", () => {
  it("should encode the key material metadata", () => {
    const seed = new TextEncoder().encode("abcdefghijklmnopqrstuvwxyz")

    const keychain = new Keychain(seed)
    keychain.addService("uco", "m/650'/0/0")

    const {publicKey} = keychain.deriveKeypair("uco")
 
    const address = deriveAddress(seed, 0)
    const address_hex = uint8ArrayToHex(address)

    const { id, verificationMethod }= keychain.toDID()    
    assert.equal(id, `did:archethic:${address_hex}`)

    const expected = [
      {
        id: `did:archethic:${address_hex}#uco`,
        type: "JsonWebKey2020",
        publicKeyJwk: keyToJWK(publicKey, "uco"),
        controller: `did:archethic:${address_hex}`
      }
    ]

    assert.deepStrictEqual(expected, verificationMethod)
  })
})

describe("keychain encode", () => {
  it ("should encode the keychain into a binary", () => {
    const keychain = new Keychain("myseed")
    keychain.addService("uco", "m/650'/0/0")

    const expectedBinary = concatUint8Arrays([
      Uint8Array.from([0, 0, 0, 1]), //Version
      Uint8Array.from([6]), //Seed size
      new TextEncoder().encode("myseed"),
      Uint8Array.from([1]), //Nb of services
      Uint8Array.from([3]),  //Service name length: "UCO",
      new TextEncoder().encode("uco"),
      Uint8Array.from([10]), //Derivation path length,
      new TextEncoder().encode("m/650'/0/0"),
      Uint8Array.from([0]), //Ed25519 curve
      Uint8Array.from([0])  //SHA256 hash algo
    ])

    assert.deepStrictEqual(keychain.encode(), expectedBinary)
  })

  it("should decode keychain from a binary", () => {
    const binary = concatUint8Arrays([
      Uint8Array.from([0, 0, 0, 1]), //Version
      Uint8Array.from([6]), //Seed size
      new TextEncoder().encode("myseed"),
      Uint8Array.from([1]), //Nb of services
      Uint8Array.from([3]),  //Service name length: "UCO",
      new TextEncoder().encode("uco"),
      Uint8Array.from([10]), //Derivation path length,
      new TextEncoder().encode("m/650'/0/0"),
      Uint8Array.from([0]), //Ed25519 curve
      Uint8Array.from([0])  //SHA256 hash algo
    ])

    const { seed, services } = Keychain.decode(binary)

    assert.deepStrictEqual(new TextEncoder().encode("myseed"), seed)
    assert.deepStrictEqual({
      uco: {
        derivationPath: "m/650'/0/0",
        curve: "ed25519",
        hashAlgo: "sha256"
      }
    }, services)
  })
})

describe("buildTransaction", () => {
  it("should build the transaction and the related signature", () => {
    const keychain = new Keychain("seed")
    keychain.addService("uco", "m/650'/0/0")

    const tx = new TransactionBuilder()
      .setType("transfer")
      .addUCOTransfer("0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", 10.0)

    keychain.buildTransaction(tx, "uco", 0)

    const {publicKey} = keychain.deriveKeypair("uco")
    const address = keychain.deriveAddress("uco", 1)

    assert.deepStrictEqual(tx.address, address)
    assert.deepStrictEqual(tx.previousPublicKey, publicKey)

    assert.strictEqual(verify(tx.previousSignature, tx.previousSignaturePayload(), tx.previousPublicKey), true)
  })
})
