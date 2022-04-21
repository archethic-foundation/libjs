const { generateDeterministicKeyPair, deriveAddress }= require("./crypto")
const { uint8ArrayToHex} = require("./utils")
const { createHmac, createHash } = require("crypto")

module.exports.newKeychain = function (seed) {
  return {
      seed: seed,
      services: {
        uco: {
          derivationPath: "m/650'/0'/0'"
        }  
      }
    }
}

module.exports.toDID = function (keychain) {
  const { seed, services} = keychain
  
  const address = deriveAddress(seed, 0)
  address_hex = uint8ArrayToHex(address)

  let servicesMetadata = []
  
  for (service in services) {
    
    const { derivationPath }  = services[service]
    
    const purpose = derivationPath
      .split("/")
      .map(v => v.replace("'", ""))
      .at(1)
    
    //Only support of archethic derivation scheme for now
    if (purpose == "650") {
      const { publicKey } = deriveArchethicKeypair(seed, derivationPath, 0)
      
      servicesMetadata.push({
        "id": `did:archethic:${address_hex}#key${servicesMetadata.length}`,
        "type": "JsonWebKey2020",
        "publicKeyJwk": keyToJWK(publicKey)
      })
    }
    else {
      throw "Purpose '" + purpose + "' is not yet supported"
    }
  }
  
  return {
    "@context": [
      "https://www.w3.org/ns/did/v1",
    ],
    "id": `did:archethic:${address_hex}`,
    "authentication": servicesMetadata,
    "verificationMethod": servicesMetadata
  }
}

function deriveArchethicKeypair(seed, derivationPath, index, curve = "ed25519") {
  
  //Hash the derivation path
  const hashedPath = createHash("sha256")
   .update(replaceDerivationPathIndex(derivationPath, index))
   .digest()
  
  const extendedSeed = createHmac("sha512", seed)
    .update(hashedPath)
    .digest()
    .slice(0, 32)
  
  return generateDeterministicKeyPair(extendedSeed, curve)
}

module.exports.deriveArchethicKeyPair = deriveArchethicKeypair

function replaceDerivationPathIndex(path, index) {
  return path
    .split("/")
    .slice(0, -1)
    .concat(`${index}'`)
    .join("/")
}

function keyToJWK(publicKey) {
  curveID = publicKey[0]
  key = publicKey.slice(2, publicKey.length)
  
  switch (curveID) {
    case 0: 
      return {
        "kty": "OKP",
        "crv": "Ed25519",
        "x": base64url(key)
      }
    case 1: 
      
      x = key.subarray(16)
      y = key.subarray(-16)
    
      return {
        "kty": "EC",
        "crv": "P-256",
        "x": base64url(x),
        "y": base64url(y)
      }
    case 2: 
      x = key.subarray(16)
      y = key.subarray(-16)

      return {
        "kty": "EC",
        "crv": "secp256k1",
        "x": base64url(x),
        "y": base64url(y)
      }
  }
}

module.exports.keyToJWK = keyToJWK

function base64url(data) {
    return btoa(
      data
        .map(val => String.fromCharCode(val))
        .join("")
    )
    .replace(/\+/g, '_')
    .replace(/\//g, '-')
    .replace(/=+$/g, '');
}
