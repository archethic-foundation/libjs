import Keychain from "../lib/keychain.js";
import Account from "../lib/account.js";
import Archethic from "../index.js";
import { hexToUint8Array } from "../lib/utils.js";
import { deriveKeyPair, deriveAddress, randomSecretKey } from "../lib/crypto.js";

import assert from "assert";
import nock from "nock";

describe("Account", () => {
  it("should create a new keychain transaction", () => {
    const archethic = new Archethic("http://localhost:4000");
    const account = new Account(archethic);

    const expectedKeychain = new Keychain("myseed").addService(
      "uco",
      "m/650'/0/0"
    );
    const authorizedPublicKeys = [
      "000161d6cd8da68207bd01198909c139c130a3df3a8bd20f4bacb123c46354ccd52c",
    ];
    const tx = account.newKeychainTransaction("myseed", authorizedPublicKeys);
    assert.equal("keychain", tx.type);
    assert.deepEqual(
      new TextDecoder().decode(tx.data.content),
      JSON.stringify(expectedKeychain.toDID())
    );

    assert.equal(1, tx.data.ownerships.length);
    assert.equal(1, tx.data.ownerships[0].authorizedKeys.length);
    assert.deepEqual(
      hexToUint8Array(authorizedPublicKeys[0]),
      tx.data.ownerships[0].authorizedKeys[0].publicKey
    );
  });

  it("should create a new access keychain transaction", () => {
    const archethic = new Archethic("http://localhost:4000");
    const account = new Account(archethic);
    const keychainAddress =
      "000161d6cd8da68207bd01198909c139c130a3df3a8bd20f4bacb123c46354ccd52c";

    const { publicKey } = deriveKeyPair("seed", 0);

    const tx = account.newAccessTransaction("seed", keychainAddress);
    assert.equal("keychain_access", tx.type);
    assert.equal(1, tx.data.ownerships.length);
    assert.equal(1, tx.data.ownerships[0].authorizedKeys.length);
    assert.deepEqual(
      publicKey,
      tx.data.ownerships[0].authorizedKeys[0].publicKey
    );
  });

  it("should get keychain", async () => {
    nock("http://localhost:4000", {})
      .post("/api", {
        query: `query {
                    nearestEndpoints {
                        ip,
                        port
                    }
                }`,
      })
      .reply(200, {
        data: {
          nearestEndpoints: [{ ip: "localhost", port: 4000 }],
        },
      });

    const archethic = new Archethic("http://localhost:4000");
    await archethic.connect();

    const account = new Account(archethic);
    const { publicKey } = deriveKeyPair("seed", 0);

    const keychainTx = JSON.parse(
      account.newKeychainTransaction("myseed", [publicKey]).toJSON()
    );
    const accessTx = JSON.parse(
      account.newAccessTransaction("seed", keychainTx.address).toJSON()
    );

    nock("http://localhost:4000")
      .post("/api", {
        query: `query {
                    transaction(address: "${accessTx.address}") {
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
                }`,
      })
      .reply(200, {
        data: {
          transaction: {
            data: {
              ownerships: [
                {
                  secret: accessTx.data.ownerships[0].secret,
                  authorizedPublicKeys:
                    accessTx.data.ownerships[0].authorizedKeys,
                },
              ],
            },
          },
        },
      });

    nock("http://localhost:4000")
      .post("/api", {
        query: `query {
                    lastTransaction(address: "${keychainTx.address}") {
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
                }`,
      })
      .reply(200, {
        data: {
          lastTransaction: {
            data: {
              ownerships: [
                {
                  secret: keychainTx.data.ownerships[0].secret,
                  authorizedPublicKeys:
                    keychainTx.data.ownerships[0].authorizedKeys,
                },
              ],
            },
          },
        },
      });

    const keychain = await account.getKeychain("seed");
    assert.equal(1, Object.keys(keychain.services).length);
    assert.equal("m/650'/0/0", keychain.services.uco.derivationPath);
  });
});
