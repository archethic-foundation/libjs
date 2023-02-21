import * as API from "./api.js";

export default class Network {
  constructor(core) {
    this.core = core;
  }

  async getStorageNoncePublicKey() {
    return this.core.requestNode((endpoint) =>
      API.getStorageNoncePublicKey(endpoint)
    );
  }

  async addOriginKey(originKey, certificate) {
    return this.core.requestNode((endpoint) =>
      API.addOriginKey(originKey, certificate, endpoint)
    );
  }

  async getOracleData(timestamp = undefined) {
    return this.core.requestNode((endpoint) => API.getOracleData(endpoint, timestamp));
  }

  async subscribeToOracleUpdates(callback, transport) {
    return this.core.requestNode((endpoint) =>
      API.subscribeToOracleUpdates(endpoint, callback, transport)
    );
  }

  async getToken(tokenAddress) {
    return this.core.requestNode((endpoint) => 
      API.getToken(tokenAddress, endpoint)
    );
  }

  async getBalance(addressq) {
    return this.core.requestNode((endpoint) => 
      API.getBalance(address, endpoint)
    );
  }
};
