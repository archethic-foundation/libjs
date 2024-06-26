import Keychain, { keyToJWK } from "../src/keychain";
import { uint8ArrayToHex, concatUint8Arrays, wordArrayToUint8Array, parseBigInt } from "../src/utils";
import { deriveAddress, deriveKeyPair, ecDecrypt, aesDecrypt, verify } from "../src/crypto";
import TransactionBuilder from "../src/transaction_builder";
// @ts-ignore
import CryptoJS from "crypto-js";
//import TransactionBuilder from "../lib/transaction_builder.js"

describe("Keychain", () => {
  describe("DID", () => {
    it("should encode the key material metadata", () => {
      const seed = new TextEncoder().encode("abcdefghijklmnopqrstuvwxyz");

      const keychain = new Keychain(seed);
      keychain
        .addService("uco", "m/650'/0/0")
        .addService("nft1", "m/650'/1/0")
        .addService("nft2", "m/650'/2/0")
        .removeService("nft2");

      const { publicKey: publicKeyUco } = keychain.deriveKeypair("uco");
      const { publicKey: publicKeyNft1 } = keychain.deriveKeypair("nft1");

      const address = deriveAddress(seed, 0);
      const address_hex = uint8ArrayToHex(address);

      const { id, verificationMethod } = keychain.toDID();
      expect(id).toEqual(`did:archethic:${address_hex}`);

      const expected = [
        {
          id: `did:archethic:${address_hex}#uco`,
          type: "JsonWebKey2020",
          publicKeyJwk: keyToJWK(publicKeyUco, "uco"),
          controller: `did:archethic:${address_hex}`
        },
        {
          id: `did:archethic:${address_hex}#nft1`,
          type: "JsonWebKey2020",
          publicKeyJwk: keyToJWK(publicKeyNft1, "nft1"),
          controller: `did:archethic:${address_hex}`
        }
      ];
      expect(verificationMethod).toEqual(expected);
    });
  });

  describe("derivation", () => {
    it("should derive keys for a given service with suffix", () => {
      const seed = new TextEncoder().encode("abcdefghijklmnopqrstuvwxyz");
      const keychain = new Keychain(seed);
      keychain.addService("uco", "m/650'/0/0");

      const { publicKey: publicKeyUco } = keychain.deriveKeypair("uco");
      const { publicKey: extendedPublicKeyUco } = keychain.deriveKeypair("uco", 0, "extended");

      expect(publicKeyUco).not.toEqual(extendedPublicKeyUco);
    });

    it("should derive key with derivation path without index", () => {
      const seed = new TextEncoder().encode("abcdefghijklmnopqrstuvwxyz");
      const keychain = new Keychain(seed);

      keychain.addService("uco", "m/650'/0/0");
      const { publicKey: publicKeyWithIndex } = keychain.deriveKeypair("uco");

      keychain.addService("uco", "m/650'/0");
      const { publicKey: publicKeyWithoutIndex } = keychain.deriveKeypair("uco");

      expect(publicKeyWithIndex).not.toEqual(publicKeyWithoutIndex);

      const keychainSeed = CryptoJS.lib.WordArray.create(keychain.seed);
      const hashedPath = CryptoJS.SHA256("m/650'/0");
      const serviceSeed = wordArrayToUint8Array(CryptoJS.HmacSHA512(hashedPath, keychainSeed)).subarray(0, 32);
      const { publicKey: normalDerivationPubKey } = deriveKeyPair(serviceSeed, 0);

      expect(publicKeyWithoutIndex).toStrictEqual(normalDerivationPubKey);
    });
  });

  describe("ecEncryptServiceSeed", () => {
    it("should encrypt service seed", () => {
      const keychain = new Keychain("myseed");
      keychain.addService("uco", "m/650'/0");

      const { publicKey: expectedPublicKey, privateKey: expectedPrivateKey } = keychain.deriveKeypair("uco", 0);

      const { publicKey: pub1, privateKey: priv1 } = deriveKeyPair("seed1", 0);
      const { publicKey: pub2, privateKey: priv2 } = deriveKeyPair("seed2", 0);

      const { secret, authorizedPublicKeys } = keychain.ecEncryptServiceSeed("uco", [pub1, pub2]);

      expect(authorizedPublicKeys.length).toStrictEqual(2);

      authorizedPublicKeys.forEach(({ publicKey, encryptedSecretKey }) => {
        const priv = publicKey == pub1 ? priv1 : priv2;
        const aesKey = ecDecrypt(encryptedSecretKey, priv);
        const serviceSeed = aesDecrypt(secret, aesKey);
        const { publicKey: servicePub, privateKey: servicePriv } = deriveKeyPair(serviceSeed, 0);
        expect(servicePub).toStrictEqual(expectedPublicKey);
        expect(servicePriv).toStrictEqual(expectedPrivateKey);
      });
    });

    it("should throw an error if derivation path contains index", () => {
      const keychain = new Keychain("myseed");
      keychain.addService("uco", "m/650'/0/0");

      const { publicKey: pub1 } = deriveKeyPair("seed1", 0);

      expect(() => {
        keychain.ecEncryptServiceSeed("uco", [pub1]);
      }).toThrow('Service should have a derivation path without index (removing the last "/0")');
    });
  });

  describe("encoding", () => {
    it("should encode the keychain into a binary", () => {
      const keychain = new Keychain("myseed");
      keychain.addService("uco", "m/650'/0/0");

      const expectedBinary = concatUint8Arrays(
        Uint8Array.from([0, 0, 0, 1]), //Version
        Uint8Array.from([6]), //Seed size
        new TextEncoder().encode("myseed"),
        Uint8Array.from([1]), //Nb of services
        Uint8Array.from([3]), //Service name length: "UCO",
        new TextEncoder().encode("uco"),
        Uint8Array.from([10]), //Derivation path length,
        new TextEncoder().encode("m/650'/0/0"),
        Uint8Array.from([0]), //Ed25519 curve
        Uint8Array.from([0]) //SHA256 hash algo
      );

      // convert to expect
      expect(keychain.encode()).toEqual(expectedBinary);
    });

    it("should decode keychain from a binary", () => {
      const binary = concatUint8Arrays(
        Uint8Array.from([0, 0, 0, 1]), //Version
        Uint8Array.from([6]), //Seed size
        new TextEncoder().encode("myseed"),
        Uint8Array.from([1]), //Nb of services
        Uint8Array.from([3]), //Service name length: "UCO",
        new TextEncoder().encode("uco"),
        Uint8Array.from([10]), //Derivation path length,
        new TextEncoder().encode("m/650'/0/0"),
        Uint8Array.from([0]), //Ed25519 curve
        Uint8Array.from([0]) //SHA256 hash algo
      );

      const { seed, services } = Keychain.decode(binary);

      expect(new TextEncoder().encode("myseed")).toEqual(seed);
      expect(services).toEqual({
        uco: {
          derivationPath: "m/650'/0/0",
          curve: "ed25519",
          hashAlgo: "sha256"
        }
      });
    });

    it("should encode/decode multiple services", () => {
      const keychain = new Keychain("myseed");
      keychain.addService("uco", "m/650'/0/0");
      keychain.addService("nft1", "m/650'/1/0");

      const keychain2 = Keychain.decode(keychain.encode());

      expect(keychain2).toEqual(keychain);
    });
  });

  describe("buildTransaction", () => {
    it("should build the transaction and the related signature", () => {
      const keychain = new Keychain("seed");
      keychain.addService("uco", "m/650'/0/0");

      const tx = new TransactionBuilder()
        .setType("transfer")
        .addUCOTransfer("0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", parseBigInt("10.0"));

      keychain.buildTransaction(tx, "uco", 0);

      const { publicKey } = keychain.deriveKeypair("uco");
      const address = keychain.deriveAddress("uco", 1);

      expect(tx.address).toStrictEqual(address);
      expect(tx.previousPublicKey).toStrictEqual(publicKey);

      expect(verify(tx.previousSignature, tx.previousSignaturePayload(), tx.previousPublicKey)).toStrictEqual(true);
    });
  });

  describe("toJSON", () => {
    it("should return the JSON representation of the keychain", () => {
      const seed = "abcdef";
      const { publicKey } = deriveKeyPair(seed, 0);
      const keychain = new Keychain(seed, 2).addService("uco", "m/650'/0/0").addAuthorizedPublicKey(publicKey);

      const expectedJSON = JSON.stringify({
        seed: seed,
        version: 2,
        services: {
          uco: {
            derivationPath: "m/650'/0/0",
            curve: "ed25519",
            hashAlgo: "sha256"
          }
        },
        authorizedPublicKeys: [uint8ArrayToHex(publicKey)]
      });

      expect(keychain.toJSON()).toEqual(expectedJSON);
    });
  });
});
