import * as API from "./api.js";
import Archethic from "./index.js";
import {Balance, OracleData, Token} from "./types.js";

export default class Network {
    private core: Archethic;
    constructor(core: Archethic) {
        this.core = core;
    }

    async getStorageNoncePublicKey() : Promise<string> {
        return this.core.requestNode((endpoint) =>
            API.getStorageNoncePublicKey(endpoint)
        );
    }

    // TODO : find response type
    async addOriginKey(originKey: string, certificate: string) : Promise<any> {
        return this.core.requestNode((endpoint) =>
            API.addOriginKey(originKey, certificate, endpoint)
        );
    }

    async getOracleData(timestamp : number | undefined = undefined) : Promise<OracleData> {
        return this.core.requestNode((endpoint) => API.getOracleData(endpoint, timestamp));
    }

    async subscribeToOracleUpdates(callback: Function) : Promise<any> {
        return this.core.requestNode((endpoint) =>
            API.subscribeToOracleUpdates(endpoint, callback)
        );
    }

    async getToken(tokenAddress:  string) : Promise<Token | {}> {
        return this.core.requestNode((endpoint) =>
            API.getToken(tokenAddress, endpoint)
        );
    }

    async getBalance(address: string) : Promise<Balance> {
        return this.core.requestNode((endpoint) =>
            API.getBalance(address, endpoint)
        );
    }

    async rawGraphQLQuery(query: string) : Promise<any> {
        return this.core.requestNode((endpoint) =>
            API.rawGraphQLQuery(query, endpoint)
        );
    }
}