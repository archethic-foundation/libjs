import { deriveKeyPair, ecDecrypt, ecEncrypt, encryptSecret, hash, sign, verify } from "../src/crypto";
import { uint8ArrayToHex } from "../src/utils";
import { Curve, HashAlgorithm } from "../src/types";

describe("crypto", () => {
  describe("hash", () => {
    it("should generate a sha256 hash with an algo id at the begining", () => {
      const hashValue = uint8ArrayToHex(hash("myfakedata"));
      expect(hashValue).toBe("004e89e81096eb09c74a29bdf66e41fc118b6d17ac547223ca6629a71724e69f23");
    });

    it("should generate a sha512 hash with an algo id at the begining", () => {
      const hashValue = uint8ArrayToHex(hash("myfakedata", HashAlgorithm.sha512));
      expect(hashValue).toBe(
        "01c09b378f954c39f8e3c2cc4ed9108937c6e6dbfa9f754a344bd395d2ba55aba9f071987a2c014f9c54d47931b243088aa2dd6c6d90ec92a67f8a9dfdd83eba58"
      );
    });

    it("should generate a sha3-256 hash with an algo id at the begining", () => {
      const hashValue = uint8ArrayToHex(hash("myfakedata", HashAlgorithm.sha3_256));
      expect(hashValue).toBe("029ddb36eabafb047ad869b9e4d35e2c5e6893b6bd2d1cdbdaec13425779f0f9da");
    });

    it("should generate a sha3-512 hash with an algo id at the begining", () => {
      const hashValue = uint8ArrayToHex(hash("myfakedata", HashAlgorithm.sha3_512));
      expect(hashValue).toBe(
        "03f64fe5d472619d235212f843c1ed8ae43598c3a5973eead66d70f88f147a0aaabcbcdc6aed160b0ae5cdf5d48871602827b242c479f999647c377698cb8b7d4f"
      );
    });

    it("should generate a blake2b hash with an algo id at the begining", () => {
      const hashValue = uint8ArrayToHex(hash("myfakedata", HashAlgorithm.blake2b));
      expect(hashValue).toBe(
        "04f4101890104371a4d673ed717e824c80634edf3cb39e3eeff555049c0a025e5f13a6aa938c7501a98471cad9c13870c13e8691e97229e4a4b4e1930221c02ab8"
      );
    });
  });

  describe("deriveKeyPair", () => {
    it("should generate an EC keypair using Ed25519 curve", () => {
      const keypair = deriveKeyPair("seed", 0, Curve.ed25519);
      expect(uint8ArrayToHex(keypair.publicKey)).toBe(
        "000161d6cd8da68207bd01198909c139c130a3df3a8bd20f4bacb123c46354ccd52c"
      );
    });

    it("should generate an EC keypair using P256 curve", () => {
      const keypair = deriveKeyPair("seed", 0, Curve.P256);
      expect(uint8ArrayToHex(keypair.publicKey)).toBe(
        "0101044d91a0a1a7cf06a2902d3842f82d2791bcbf3ee6f6dc8de0f90e53e9991c3cb33684b7b9e66f26e7c9f5302f73c69897be5f301de9a63521a08ac4ef34c18728"
      );
    });

    it("should generate an EC keypair using secp256k1 curve", () => {
      const keypair = deriveKeyPair("seed", 0, Curve.secp256k1);
      expect(uint8ArrayToHex(keypair.publicKey)).toBe(
        "0201044d02d071e7e24348fc24951bded20c08409b075c7956348fef89e118370f382cf99c064b17ad950aaeb1ae04971afdc6a44d68e731b8d0a01a8f56eade92875a"
      );
    });

    it("should produce different key by changing the index", () => {
      const keypair1 = deriveKeyPair("seed", 0);
      const keypair2 = deriveKeyPair("seed", 1);
      expect(keypair1).not.toBe(keypair2);
    });
  });

  describe("sign/verify", () => {
    it("should sign a message with an ed25519 key and create valid signature", () => {
      const keypair = deriveKeyPair("seed", 0, Curve.ed25519);
      const sig = sign("hello", keypair.privateKey);
      expect(verify(sig, "hello", keypair.publicKey)).toBe(true);
    });

    it("should sign a message with an P256 key", () => {
      const keypair = deriveKeyPair("seed", 0, Curve.P256);
      const sig = sign("hello", keypair.privateKey);
      expect(verify(sig, "hello", keypair.publicKey)).toBe(true);
    });

    it("should sign a message with an secp256k1 key", () => {
      const keypair = deriveKeyPair("seed", 0, Curve.secp256k1);
      const sig = sign("hello", keypair.privateKey);
      expect(verify(sig, "hello", keypair.publicKey)).toBe(true);
    });
  });

  describe("ecEncrypt", () => {
    it("should encrypt a data using a ed25519 public key", () => {
      const keypair = deriveKeyPair("seed", 0, Curve.ed25519);
      const ciphertext = ecEncrypt("hello", keypair.publicKey);

      expect(ecDecrypt(ciphertext, keypair.privateKey)).toStrictEqual(new TextEncoder().encode("hello"));
    });

    it("should encrypt a data using a P256 public key", () => {
      const keypair = deriveKeyPair("seed", 0, Curve.P256);
      const ciphertext = ecEncrypt("hello", keypair.publicKey);

      expect(ecDecrypt(ciphertext, keypair.privateKey)).toStrictEqual(new TextEncoder().encode("hello"));
    });

    it("should encrypt a data using a secp256k1 public key", () => {
      const keypair = deriveKeyPair("seed", 0, Curve.secp256k1);
      const ciphertext = ecEncrypt("hello", keypair.publicKey);

      expect(ecDecrypt(ciphertext, keypair.privateKey)).toStrictEqual(new TextEncoder().encode("hello"));
    });

    it("should encrypt blob", () => {
      const blob = Uint8Array.from([1, 2, 3, 4, 5]);

      const keypair = deriveKeyPair("seed", 0, Curve.secp256k1);
      const ciphertext = ecEncrypt(blob, keypair.publicKey);
      expect(ecDecrypt(ciphertext, keypair.privateKey)).toStrictEqual(blob);
    });
  });

  describe("encryptSecret", () => {
    it("should encrypt a secret using a public key", () => {
      const keypair = deriveKeyPair("seed", 0);
      const secret = "mySecret";
      const publicKey = uint8ArrayToHex(keypair.publicKey);
      const result = encryptSecret(secret, publicKey);

      expect(result).toStrictEqual({
        encryptedSecret: result.encryptedSecret,
        authorizedKeys: [
          {
            publicKey: result.authorizedKeys[0].publicKey,
            encryptedSecretKey: result.authorizedKeys[0].encryptedSecretKey
          }
        ]
      });
    });

    it("should return an object with encryptedSecret and authorizedKeys", () => {
      const keypair = deriveKeyPair("seed", 0);
      const secret = "mySecret";
      const publicKey = uint8ArrayToHex(keypair.publicKey);
      const result = encryptSecret(secret, publicKey);

      expect(result).toHaveProperty("encryptedSecret");
      expect(result).toHaveProperty("authorizedKeys");
      expect(result.authorizedKeys[0]).toHaveProperty("encryptedSecretKey");
      expect(result.authorizedKeys[0]).toHaveProperty("publicKey");
    });

    it("should return different results for different secrets", () => {
      const keypair = deriveKeyPair("seed", 0);
      const secret1 = "mySecret1";
      const secret2 = "mySecret2";
      const publicKey = uint8ArrayToHex(keypair.publicKey);
      const result1 = encryptSecret(secret1, publicKey);
      const result2 = encryptSecret(secret2, publicKey);

      expect(result1.encryptedSecret).not.toEqual(result2.encryptedSecret);
    });

    it("should return different results for different public keys", () => {
      const keypair1 = deriveKeyPair("seed", 0);
      const keypair2 = deriveKeyPair("seed2", 0);
      const secret = "mySecret";
      const publicKey1 = uint8ArrayToHex(keypair1.publicKey);
      const publicKey2 = uint8ArrayToHex(keypair2.publicKey);
      const result1 = encryptSecret(secret, publicKey1);
      const result2 = encryptSecret(secret, publicKey2);

      expect(result1.authorizedKeys[0].encryptedSecretKey).not.toEqual(result2.authorizedKeys[0].encryptedSecretKey);
    });

    it("should return the diferent result with different curve", () => {
      const keypair1 = deriveKeyPair("seed", 0, Curve.ed25519);
      const keypair2 = deriveKeyPair("seed", 0, Curve.P256);
      const secret = "mySecret";
      const publicKey1 = uint8ArrayToHex(keypair1.publicKey);
      const publicKey2 = uint8ArrayToHex(keypair2.publicKey);
      const result1 = encryptSecret(secret, publicKey1);
      const result2 = encryptSecret(secret, publicKey2);

      expect(result1.authorizedKeys[0].encryptedSecretKey).not.toEqual(result2.authorizedKeys[0].encryptedSecretKey);
    });
  });
});
