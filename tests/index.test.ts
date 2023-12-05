import Archethic from "../src/index";
import * as API from "../src/api";
import { Endpoint } from "../src/endpoint";
const nock = require("nock");

describe("Archethic", () => {
  it("constructor should instanciate a new instance and set the endpoint", () => {
    const archethic = new Archethic("http://localhost:4000");

    // converts asserts to jest
    expect(archethic.endpoint).toStrictEqual(Endpoint.build("http://localhost:4000"));
    expect(archethic.network).not.toBeUndefined();
    expect(archethic.account).not.toBeUndefined();
    expect(archethic.transaction).not.toBeUndefined();
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
                }`
        })
        .reply(200, {
          data: {
            nearestEndpoints: [
              { ip: "localhost", port: 4000 },
              { ip: "30.193.101.100", port: 40000 }
            ]
          }
        });

      const archethic = new Archethic("http://localhost:4000");
      await archethic.connect();

      expect(archethic.nearestEndpoints).toStrictEqual(
        new Set(["http://localhost:4000", "http://30.193.101.100:40000"])
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
                }`
        })
        .reply(200, {
          data: {
            nearestEndpoints: [
              { ip: "localhost", port: 4000 },
              { ip: "30.193.101.100", port: 40000 }
            ]
          }
        });
      const archethic = new Archethic("http://localhost:4000");
      await archethic.connect();

      nock("http://localhost:4000", {})
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

      const publicKey = await archethic.requestNode((endpoint) => {
        return API.getStorageNoncePublicKey(endpoint);
      });

      expect(publicKey).toBe("publicKey");
    });

    it("should request the next nearest node when the first failed", async () => {
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
            nearestEndpoints: [
              { ip: "localhost", port: 4000 },
              { ip: "30.193.101.100", port: 40000 }
            ]
          }
        });
      const archethic = new Archethic("http://localhost:4000");
      await archethic.connect();

      nock("http://localhost:4000", {})
        .post("/api", {
          query: `query {
                    sharedSecrets {
                        storageNoncePublicKey
                    }
                }`
        })
        .reply(500, "Internal Server Error");

      nock("http://30.193.101.100:40000", {})
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

      const publicKey = await archethic.requestNode((endpoint) => {
        return API.getStorageNoncePublicKey(endpoint);
      });

      expect(publicKey).toBe("publicKey");
    });
  });
});
