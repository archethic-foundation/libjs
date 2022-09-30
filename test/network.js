import assert from "assert";
import nock from "nock";

import Archethic from "../index.js";
import Network from "../lib/network.js";

let archethic;

describe("Network", () => {
  before(async () => {
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

    archethic = new Archethic("http://localhost:4000");
    await archethic.connect();
  });

  it("should list the storage nonce public key", async () => {
    nock("http://localhost:4000", {})
      .post("/api", {
        query: `query {
                    sharedSecrets {
                        storageNoncePublicKey
                    }
                }`,
      })
      .reply(200, {
        data: {
          sharedSecrets: {
            storageNoncePublicKey: "publicKey",
          },
        },
      });

    const network = new Network(archethic);
    const publicKey = await network.getStorageNoncePublicKey();
    assert.equal(publicKey, "publicKey");
  });

  it("should add an origin key", async () => {
    nock("http://localhost:4000", {})
      .post("/api/origin_key", {
        origin_public_key: "01103109",
        certificate: "mycertificate",
      })
      .reply(201, { transactionAddress: "addr", status: "pending" });

    const network = new Network(archethic);
    await network.addOriginKey("01103109", "mycertificate");
  });

  it("should get last oracle data", async () => {
    nock("http://localhost:4000", {})
      .post("/api", {
        query: `query {
                    oracleData {
                        timestamp,
                        services {
                          uco {
                            eur,
                            usd
                          }
                        }
                    }
                }`,
      })
      .reply(200, {
        data: {
          oracleData: {
            timestamp: 1002910102,
            services: {
              uco: {
                eur: 0.2,
                usd: 0.2,
              },
            },
          },
        },
      });

    const network = new Network(archethic);
    const {
      services: {
        uco: { eur: eurPrice },
      },
    } = await network.getOracleData();

    assert.equal(eurPrice, 0.2);
  });

  it("should get oracle data at time", async () => {
    nock("http://localhost:4000", {})
      .post("/api", {
        query: `query {
                    oracleData(timestamp: 102910921) {
                        services {
                          uco {
                            eur,
                            usd
                          }
                        }
                    }
                }`,
      })
      .reply(200, {
        data: {
          oracleData: {
            services: {
              uco: {
                eur: 0.2,
                usd: 0.2,
              },
            },
          },
        },
      });

    const network = new Network(archethic);
    const {
      services: {
        uco: { eur: eurPrice },
      },
    } = await network.getOracleData(102910921);

    assert.equal(eurPrice, 0.2);
  });

  it("should get token description", async () => {
    const expectedToken = {
      collection: [],
      decimals: 8,
      genesis: '0000D6979F125A91465E29A12F66AE40FA454A2AD6CE3BB40099DBDDFFAF586E195A',
      id: '9DC6196F274B979E5AB9E3D7A0B03FEE3E4C62C7299AD46C8ECF332A2C5B6574',
      name: 'Mining UCO rewards',
      properties: {},
      supply: 3340000000000000,
      symbol: 'MUCO',
      type: 'fungible'
    }

    nock("http://localhost:4000", {})
      .post("/api", {
        query: `query {
                    token(address: "1234") {
                      genesis, name, symbol, supply, type
                      properties, collection, id, decimals
                    }
              }`,
      })
      .reply(200, {
        data: {
          token: expectedToken
        },
      });

    const network = new Network(archethic);
    const token = await network.getToken('1234');

    assert.deepEqual(token, expectedToken);
  });
});
