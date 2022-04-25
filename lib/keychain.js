const { generateDeterministicKeyPair, deriveAddress, hash }= require("./crypto")
const { uint8ArrayToHex, concatUint8Arrays} = require("./utils")
const { createHmac, createHash } = require("crypto")

module.exports.newKeychain = newKeychain
module.exports.decodeKeychain = decodeKeychain
module.exports.keyToJWK = keyToJWK

class Keychain {
  constructor(seed, version = 1) {
    if (!(seed instanceof Uint8Array)) {
      seed = new TextEncoder().encode(seed)
    }
    
    this.version = version
    this.seed = seed
    this.services = {}
  }

  addService(name, derivationPath) {
    this.services[name] = {
      derivationPath: derivationPath
    }
  }
  
  encode() {
   
    let servicesBuffer = []
    for (let service in this.services) {
      const { derivationPath } = this.services[service] 
      servicesBuffer.push(concatUint8Arrays([
        Uint8Array.from([service.length]),
        new TextEncoder().encode(service),
        Uint8Array.from([derivationPath.length]),
        new TextEncoder().encode(derivationPath)
      ]))
    }


    return concatUint8Arrays([
      Uint8Array.from([this.version]),
      Uint8Array.from([this.seed.length]),
      this.seed,
      Uint8Array.from([Object.keys(this.services).length]),
      concatUint8Arrays(servicesBuffer)
    ])
  }

  deriveKeypair(service, index = 0) {
    if (!this.services[service]) {
      throw "Service doesn't exist in the keychain"
    }

    const { derivationPath } = this.services[service]
    return deriveArchethicKeypair(this.seed, derivationPath, index)
  }

  deriveAddress(service, index = 0) {
    if (!this.services[service]) {
      throw "Service doesn't exist in the keychain"
    }
    const { derivationPath } = this.services[service]
    const { publicKey } = deriveArchethicKeypair(this.seed, derivationPath, index)
    const { byte: curveID } = readByte(publicKey, 0, 1)    
    
    const hashedPublicKey = hash(publicKey)
  
    return concatUint8Arrays([
       Uint8Array.from([curveID]),
       Uint8Array.from(hashedPublicKey)
    ])
  }

  toDID() {
    
    const address = deriveAddress(this.seed, 0)
    const address_hex = uint8ArrayToHex(address)

    let servicesMetadata = []
    
    for (let service in this.services) {
      
      const { derivationPath } = this.services[service]
      
      const purpose = derivationPath
        .split("/")
        .map(v => v.replace("'", ""))
        .at(1)
      
      //Only support of archethic derivation scheme for now
      if (purpose == "650") {
        const { publicKey } = deriveArchethicKeypair(this.seed, derivationPath, 0)
        
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
}

function newKeychain(seed) {
  let keychain = new Keychain(seed)
  keychain.addService("uco", "m/650'/0'/0'")

  return keychain
}

function decodeKeychain(binary) {
  var pos = 0

  var { byte: version, pos: pos} = readByte(binary, pos, 1)
  var { byte: seedSize, pos: pos} = readByte(binary, pos, 1)
  var { bytes: seed, pos: pos } = readBytes(binary, pos, seedSize)
  var { byte: nbServices, pos: pos} = readByte(binary, pos, 1)
  
  let keychain = new Keychain(seed, version)

  for (let i = 0; i < nbServices; i++) {
    var { byte: serviceNameLength, pos: pos} = readByte(binary, pos, 1)
    var { bytes: serviceName, pos: pos} = readBytes(binary, pos, serviceNameLength)
    var { byte: derivationPathLength, pos: pos} = readByte(binary, pos, 1)
    var { bytes: derivationPath, pos: pos} = readBytes(binary, pos, derivationPathLength)

    serviceName = new TextDecoder().decode(serviceName)
    derivationPath = new TextDecoder().decode(derivationPath)

    keychain.addService(serviceName, derivationPath)
  }

  return keychain
}

function readByte(binary, pos, size) {
  return {
    byte: binary.slice(pos, pos + size)[0],
    pos: pos + size
  }
}

function readBytes(binary, pos, size) {
  return {
    bytes: binary.slice(pos, pos + size),
    pos: pos + size
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
