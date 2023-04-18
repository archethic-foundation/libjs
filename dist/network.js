import * as API from "./api.js";
export default class Network {
    core;
    constructor(core) {
        this.core = core;
    }
    async getStorageNoncePublicKey() {
        return this.core.requestNode((endpoint) => API.getStorageNoncePublicKey(endpoint));
    }
    async addOriginKey(originKey, certificate) {
        return this.core.requestNode((endpoint) => API.addOriginKey(originKey, certificate, endpoint));
    }
    async getOracleData(timestamp = undefined) {
        return this.core.requestNode((endpoint) => API.getOracleData(endpoint, timestamp));
    }
    async subscribeToOracleUpdates(callback) {
        return this.core.requestNode((endpoint) => API.subscribeToOracleUpdates(endpoint, callback));
    }
    async getToken(tokenAddress) {
        return this.core.requestNode((endpoint) => API.getToken(tokenAddress, endpoint));
    }
    async getBalance(address) {
        return this.core.requestNode((endpoint) => API.getBalance(address, endpoint));
    }
    async rawGraphQLQuery(query) {
        return this.core.requestNode((endpoint) => API.rawGraphQLQuery(query, endpoint));
    }
}
//# sourceMappingURL=network.js.map