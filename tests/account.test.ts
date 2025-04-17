import Keychain from "../src/keychain";
import Account from "../src/account";
import Archethic from "../src/index";
import { deriveKeyPair, randomSecretKey } from "../src/crypto";
import { uint8ArrayToHex } from "../src/utils";
const nock = require("nock");

describe("Account", () => {
  it("should create a new keychain transaction", () => {
    const archethic = new Archethic("http://localhost:4000");
    const account = new Account(archethic);

    const { publicKey } = deriveKeyPair("accessSeed", 0);
    const authorizedPublicKeys = [publicKey];

    const expectedKeychain = new Keychain(randomSecretKey())
      .addService("uco", "m/650'/0/0")
      .addAuthorizedPublicKey(authorizedPublicKeys[0]);

    const tx = account.newKeychainTransaction(expectedKeychain, 0);
    expect(tx.type).toBe("keychain");

    expect(tx.data.content).toBe(JSON.stringify(expectedKeychain.toDID()));

    expect(tx.data.ownerships.length).toBe(1);

    expect(tx.data.ownerships[0].authorizedPublicKeys.length).toBe(1);

    expect(tx.data.ownerships[0].authorizedPublicKeys[0].publicKey).toEqual(authorizedPublicKeys[0]);
  });

  it("should create a new access keychain transaction", () => {
    const archethic = new Archethic("http://localhost:4000");
    const account = new Account(archethic);
    const keychainAddress = "000161d6cd8da68207bd01198909c139c130a3df3a8bd20f4bacb123c46354ccd52c";

    const { publicKey } = deriveKeyPair("seed", 0);

    const tx = account.newAccessTransaction("seed", keychainAddress);

    expect(tx.type).toBe("keychain_access");

    expect(tx.data.ownerships.length).toBe(1);

    expect(tx.data.ownerships[0].authorizedPublicKeys.length).toBe(1);

    expect(tx.data.ownerships[0].authorizedPublicKeys[0].publicKey).toEqual(publicKey);
  });

  it("should get keychain", async () => {
    nock("http://localhost:4000", {})
      .post("/api", {
        query: `query {
                    nearestEndpoints {
                        ip,
                        port
                    }
                }`
      })
      .reply(200, {
        data: {
          nearestEndpoints: [{ ip: "localhost", port: 4000 }]
        }
      });

    const archethic = new Archethic("http://localhost:4000");
    await archethic.connect();

    const account = new Account(archethic);
    const { publicKey } = deriveKeyPair("seed", 0);

    const expectedKeychain = new Keychain(randomSecretKey())
      .addService("uco", "m/650'/0/0")
      .addAuthorizedPublicKey(publicKey);

    const keychainTx = account.newKeychainTransaction(expectedKeychain, 0);
    const accessTx = account.newAccessTransaction("seed", keychainTx.address);

    nock("http://localhost:4000")
      .post("/api", {
        query: `query {
                    transaction(address: "${uint8ArrayToHex(accessTx.address)}") {
                      data {
                        ownerships {
                          secret,
                          authorizedPublicKeys {
                            encryptedSecretKey,
                            publicKey
                          }
                        }
                      }
                    }
                }`
      })
      .reply(200, {
        data: {
          transaction: {
            data: {
              ownerships: [
                {
                  secret: uint8ArrayToHex(accessTx.data.ownerships[0].secret),
                  authorizedPublicKeys: accessTx.data.ownerships[0].authorizedPublicKeys.map(
                    ({ publicKey, encryptedSecretKey }) => {
                      return {
                        publicKey: uint8ArrayToHex(publicKey),
                        encryptedSecretKey: uint8ArrayToHex(encryptedSecretKey)
                      };
                    }
                  )
                }
              ]
            }
          }
        }
      });

    nock("http://localhost:4000")
      .post("/api", {
        query: `query {
                    lastTransaction(address: "${uint8ArrayToHex(keychainTx.address)}") {
                      data {
                        ownerships {
                          secret,
                          authorizedPublicKeys {
                            encryptedSecretKey,
                            publicKey
                          }
                        }
                      }
                    }
                }`
      })
      .reply(200, {
        data: {
          lastTransaction: {
            data: {
              ownerships: [
                {
                  secret: uint8ArrayToHex(keychainTx.data.ownerships[0].secret),
                  authorizedPublicKeys: keychainTx.data.ownerships[0].authorizedPublicKeys.map(
                    ({ publicKey, encryptedSecretKey }) => {
                      return {
                        publicKey: uint8ArrayToHex(publicKey),
                        encryptedSecretKey: uint8ArrayToHex(encryptedSecretKey)
                      };
                    }
                  )
                }
              ]
            }
          }
        }
      });

    const keychain = await account.getKeychain("seed");
    expect(Object.keys(keychain.services).length).toBe(1);
    expect(keychain.services.uco.derivationPath).toBe("m/650'/0/0");
  });
});
