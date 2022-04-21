const assert = require('assert')

const { toDID, deriveArchethicKeyPair, keyToJWK } = require("../lib/keychain")
const { uint8ArrayToHex } =  require("../lib/utils")
const { deriveAddress } = require("../lib/crypto")


describe("keychain to DID", () => {
  it("should encode the key material metadata", () => {
    seed = "abcdefghijklmnopqrstuvwxyz"
    
    const keychain = {
      seed: seed,
      services: {
        uco: {
          derivationPath: "m/650'/0'/0'"
        }
      }
    }
    
    const {publicKey} = deriveArchethicKeyPair(seed, "m/650'/0'/0'", 0)
    
    const address = deriveAddress(seed, 0)
    const address_hex = uint8ArrayToHex(address)
    
    const { id, verificationMethod }  = toDID(keychain)    
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
