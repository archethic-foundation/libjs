import nock from "nock";
import Archethic from "../src/index";
import Network from "../src/network";

let archethic: Archethic;

describe("Network", () => {
  beforeEach(async () => {
    nock("http://127.0.0.1:4000", {})
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
          nearestEndpoints: [{ ip: "127.0.0.1", port: 4000 }]
        }
      });

    archethic = new Archethic("http://127.0.0.1:4000");

    await archethic.connect();
  });

  it("should list the storage nonce public key", async () => {
    nock("http://127.0.0.1:4000", {})
      .post("/api", {
        query: `query {
                    sharedSecrets {
                        storageNoncePublicKey
                    }
                }`
      })
      .reply(200, {
        data: {
          sharedSecrets: {
            storageNoncePublicKey: "publicKey"
          }
        }
      });

    const publicKey = await archethic.network.getStorageNoncePublicKey();
    expect(publicKey).toBe("publicKey");
  });

  it("should add an origin key", async () => {
    nock("http://127.0.0.1:4000", {
      reqheaders: {
        "content-type": "application/json"
      }
    })
      .post("/api/rpc", {
        jsonrpc: "2.0",
        id: 1,
        method: "add_origin_key",
        params: { certificate: "mycertificate", origin_public_key: "01103109" }
      })

      .reply(200, {
        id: 1,
        jsonrpc: "2.0",
        result: { transaction_address: "transaction_address", status: "pending" }
      });
    await archethic.network.addOriginKey("01103109", "mycertificate").then((response) => {
      expect(response.transaction_address).toBe("transaction_address");
      expect(response.status).toBe("pending");
    });
  });

  it("should return type errors", async () => {
    //@ts-ignore
    expect(archethic.network.addOriginKey(1, "mycertificate")).rejects.toThrow(Error);
  });

  it("should call a contract function", async () => {
    nock("http://127.0.0.1:4000", {
      reqheaders: {
        "content-type": "application/json"
      }
    })
      .post("/api/rpc", {
        jsonrpc: "2.0",
        id: 1,
        method: "contract_fun",
        params: { contract: "c", function: "fun", args: ["1", "2"] }
      })

      .reply(200, {
        id: 1,
        jsonrpc: "2.0",
        result: 5
      });
    await archethic.rpcNode?.callFunction("c", "fun", ["1", "2"]).then((response) => {
      expect(response).toBe(5);
    });
  });

  it("estimate transaction fee", async () => {
    const tx = archethic.transaction.new();
    tx.setType("data");
    tx.setContent("content");
    tx.addRecipient("0000EE9DDC5229EBFFE197277058F11A41E22252D86A904C8CBCF38C1EFC42AB5065");

    nock("http://127.0.0.1:4000", {
      reqheaders: {
        "content-type": "application/json"
      }
    })
      // @ts-ignore
      .post("/api/rpc", {
        jsonrpc: "2.0",
        id: 1,
        method: "estimate_transaction_fee",
        params: {
          transaction: tx.toNodeRPC()
        }
      })
      // @ts-ignore
      .reply(200, {
        id: 1,
        jsonrpc: "2.0",
        result: {
          fee: 0.555,
          rates: {
            eur: 500000000,
            usd: 600000000
          }
        }
      });
    await archethic.rpcNode?.getTransactionFee(tx).then((result) => {
      expect(result.fee).toBe(0.555);
      expect(result.rates.eur).toBe(500000000);
      expect(result.rates.usd).toBe(600000000);
    });
  });

  it("send transaction", async () => {
    const tx = archethic.transaction.new();
    tx.setType("data");
    tx.setContent("content");
    tx.addRecipient("0000EE9DDC5229EBFFE197277058F11A41E22252D86A904C8CBCF38C1EFC42AB5065");

    nock("http://127.0.0.1:4000", {
      reqheaders: {
        "content-type": "application/json"
      }
    })
      // @ts-ignore
      .post("/api/rpc", {
        jsonrpc: "2.0",
        id: 1,
        method: "send_transaction",
        params: {
          transaction: tx.toNodeRPC()
        }
      })
      // @ts-ignore
      .reply(200, {
        id: 1,
        jsonrpc: "2.0",
        result: {
          transaction_address: "0000EE9DDC5229EBFFE197277058F11A41E22252D86A904C8CBCF38C1EFC42AB5064",
          status: "pending"
        }
      });
    await archethic.rpcNode?.sendTransaction(tx).then((result) => {
      expect(result.transaction_address).toBe("0000EE9DDC5229EBFFE197277058F11A41E22252D86A904C8CBCF38C1EFC42AB5064");
      expect(result.status).toBe("pending");
    });
  });

  it("simulate contract execution", async () => {
    const tx = archethic.transaction.new();
    tx.setType("data");
    tx.setContent("content");
    tx.addRecipient("0000EE9DDC5229EBFFE197277058F11A41E22252D86A904C8CBCF38C1EFC42AB5065");
    tx.addRecipient("0000EE9DDC5229EBFFE197277058F11A41E22252D86A904C8CBCF38C1EFC42AB5064");

    nock("http://127.0.0.1:4000", {
      reqheaders: {
        "content-type": "application/json"
      }
    })
      // @ts-ignore
      .post("/api/rpc", {
        jsonrpc: "2.0",
        id: 1,
        method: "simulate_contract_execution",
        params: {
          transaction: tx.toNodeRPC()
        }
      })
      // @ts-ignore
      .reply(200, {
        id: 1,
        jsonrpc: "2.0",
        result: [
          { recipient_address: "0000EE9DDC5229EBFFE197277058F11A41E22252D86A904C8CBCF38C1EFC42AB5065", valid: true },
          {
            recipient_address: "0000EE9DDC5229EBFFE197277058F11A41E22252D86A904C8CBCF38C1EFC42AB5064",
            valid: false,
            error: "this is an error"
          }
        ]
      });
    await archethic.rpcNode?.simulateContractExecution(tx).then((result) => {
      expect(result[0].recipient_address).toBe("0000EE9DDC5229EBFFE197277058F11A41E22252D86A904C8CBCF38C1EFC42AB5065");
      expect(result[0].valid).toBe(true);
      expect(result[1].recipient_address).toBe("0000EE9DDC5229EBFFE197277058F11A41E22252D86A904C8CBCF38C1EFC42AB5064");
      expect(result[1].valid).toBe(false);
      expect(result[1].error).toBe("this is an error");
    });
  });

  it("should get last oracle data", async () => {
    nock("http://127.0.0.1:4000", {})
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
                }`
      })
      .reply(200, {
        data: {
          oracleData: {
            timestamp: 1002910102,
            services: {
              uco: {
                eur: 0.2,
                usd: 0.2
              }
            }
          }
        }
      });

    const network = new Network(archethic);
    const {
      services: {
        uco: { eur: eurPrice }
      }
    } = await network.getOracleData();

    expect(eurPrice).toBe(0.2);
  });

  it("should get oracle data at time", async () => {
    nock("http://127.0.0.1:4000", {})
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
                }`
      })
      .reply(200, {
        data: {
          oracleData: {
            services: {
              uco: {
                eur: 0.2,
                usd: 0.2
              }
            }
          }
        }
      });

    const network = new Network(archethic);
    const {
      services: {
        uco: { eur: eurPrice }
      }
    } = await network.getOracleData(102910921);

    expect(eurPrice).toBe(0.2);
  });

  it("should get token description", async () => {
    const expectedToken = {
      collection: [],
      decimals: 8,
      genesis: "0000D6979F125A91465E29A12F66AE40FA454A2AD6CE3BB40099DBDDFFAF586E195A",
      id: "9DC6196F274B979E5AB9E3D7A0B03FEE3E4C62C7299AD46C8ECF332A2C5B6574",
      name: "Mining UCO rewards",
      properties: {},
      supply: 3340000000000000,
      symbol: "MUCO",
      type: "fungible"
    };

    nock("http://127.0.0.1:4000", {})
      .post("/api", {
        query: `query {
                    token(address: "1234") {
                      genesis, name, symbol, supply, type
                      properties, collection, id, decimals
                    }
              }`
      })
      .reply(200, {
        data: {
          token: expectedToken
        }
      });

    const network = new Network(archethic);
    const token = await network.getToken("1234");

    expect(token).toEqual(expectedToken);
  });
});
