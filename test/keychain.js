const assert = require('assert')

const { keyToJWK, decodeKeychain, newKeychain } = require("../lib/keychain")
const { uint8ArrayToHex, concatUint8Arrays } =  require("../lib/utils")
const { deriveAddress } = require("../lib/crypto")


describe("keychain to DID", () => {
  it("should encode the key material metadata", () => {
    seed = new TextEncoder().encode("abcdefghijklmnopqrstuvwxyz")

    const keychain = newKeychain(seed)

    const {publicKey} = keychain.deriveKeypair("uco")
    
    const address = deriveAddress(seed, 0)
    const address_hex = uint8ArrayToHex(address)
    
    const { id, verificationMethod }= keychain.toDID()    
    assert.equal(id, `did:archethic:${address_hex}`)
    
    const expected = [
      {
        id: `did:archethic:${address_hex}#key0`,
        type: "JsonWebKey2020",
        publicKeyJwk: keyToJWK(publicKey)
      }
    ]
    
    assert.deepStrictEqual(expected, verificationMethod)
  })    
})

describe("keychain encode", () => {
  it ("should encode the keychain into a binary", () => {
    const keychain = newKeychain("myseed")

    const expectedBinary = concatUint8Arrays([
      Uint8Array.from([0, 0, 0, 1]), //Version
      Uint8Array.from([6]), //Seed size
      new TextEncoder().encode("myseed"),
      Uint8Array.from([1]), //Nb of services
      Uint8Array.from([3]),  //Service name length: "UCO",
      new TextEncoder().encode("uco"),
      Uint8Array.from([12]), //Derivation path length,
      new TextEncoder().encode("m/650'/0'/0'"),
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
      Uint8Array.from([12]), //Derivation path length,
      new TextEncoder().encode("m/650'/0'/0'"),
      Uint8Array.from([0]), //Ed25519 curve
      Uint8Array.from([0])  //SHA256 hash algo
    ])

    const { seed, services } = decodeKeychain(binary)
  
    assert.deepStrictEqual(new TextEncoder().encode("myseed"), seed)
    assert.deepStrictEqual({
      uco: {
        derivationPath: "m/650'/0'/0'",
        curve: "ed25519",
        hashAlgo: "sha256"
      } 
    }, services)
  })
})
