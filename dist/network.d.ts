import Archethic from "./index.js";
import { Balance, OracleData, Token } from "./types.js";
export default class Network {
    private core;
    constructor(core: Archethic);
    getStorageNoncePublicKey(): Promise<string>;
    addOriginKey(originKey: string, certificate: string): Promise<any>;
    getOracleData(timestamp?: number | undefined): Promise<OracleData>;
    subscribeToOracleUpdates(callback: Function): Promise<any>;
    getToken(tokenAddress: string): Promise<Token | {}>;
    getBalance(address: string): Promise<Balance>;
    rawGraphQLQuery(query: string): Promise<any>;
}
