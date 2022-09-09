import * as API from "./api";

export default class Network {
  constructor(core) {
    this.core = core;
  }

  getStorageNoncePublicKey() {
    return this.core.requestNode((endpoint) =>
      API.getStorageNoncePublicKey(endpoint)
    );
  }

  addOriginKey(originKey, certificate) {
    return this.core.requestNode((endpoint) =>
      API.addOriginKey(originKey, certificate, endpoint)
    );
  }

  getLastOracleData() {
    return this.core.requestNode((endpoint) => API.getLastOracleData(endpoint));
  }

  getOracleDataAt(time) {
    return this.core.requestNode((endpoint) =>
      API.getOracleDataAt(time, endpoint)
    );
  }

  subscribeToOracleUpdates(callback, transport) {
    return this.core.requestNode((endpoint) =>
      API.subscribeToOracleUpdates(endpoint, callback, transport)
    );
  }
};
