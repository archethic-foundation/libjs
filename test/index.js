import Archethic from "../index.js";
import * as API from "../lib/api.js";

import assert from "assert";
import nock from "nock";

describe("Archethic", () => {
  it("constructor should instanciate a new instance and set the endpoint", () => {
    const archethic = new Archethic("http://localhost:4000");
    assert.deepStrictEqual(
      archethic.endpoint,
      new URL("http://localhost:4000")
    );

    assert.notEqual(archethic.network, undefined);
    assert.notEqual(archethic.account, undefined);
    assert.notEqual(archethic.transaction, undefined);
  });

  describe("connect", () => {
    it("should request endpoint to get list of nearest nodes", async () => {
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
            nearestEndpoints: [
              { ip: "localhost", port: 4000 },
              { ip: "30.193.101.100", port: 40000 },
            ],
          },
        });

      const archethic = new Archethic("http://localhost:4000");
      await archethic.connect();

      assert.deepEqual(
        ["http://localhost:4000", "http://30.193.101.100:40000"],
        archethic.nearestEndpoints
      );
    });
  });

  describe("requestNode", () => {
    it("should request the first nearest node", async () => {
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
            nearestEndpoints: [
              { ip: "localhost", port: 4000 },
              { ip: "30.193.101.100", port: 40000 },
            ],
          },
        });
      const archethic = new Archethic("http://localhost:4000");
      await archethic.connect();

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

      const publicKey = await archethic.requestNode((endpoint) => {
        return API.getStorageNoncePublicKey(endpoint);
      });

      assert.equal("publicKey", publicKey);
    });

    it("should request the next nearest node when the first failed", async () => {
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
            nearestEndpoints: [
              { ip: "localhost", port: 4000 },
              { ip: "30.193.101.100", port: 40000 },
            ],
          },
        });
      const archethic = new Archethic("http://localhost:4000");
      await archethic.connect();

      nock("http://localhost:4000", {})
        .post("/api", {
          query: `query {
                    sharedSecrets {
                        storageNoncePublicKey
                    }
                }`,
        })
        .reply(500, "Internal Server Error");

      nock("http://30.193.101.100:40000", {})
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

      const publicKey = await archethic.requestNode((endpoint) => {
        return API.getStorageNoncePublicKey(endpoint);
      });

      assert.equal("publicKey", publicKey);
    });
  });
});
