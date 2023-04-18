import * as Crypto from "./crypto.js";
import * as Utils from "./utils.js";
import * as Api from "./api.js";
import { Endpoint, WalletRPCEndpoint } from "./endpoint.js";
import { ArchethicRPCClient } from "./api/wallet_rpc.js";
import Network from "./network.js";
import Transaction from "./transaction.js";
import Account from "./account.js";
export { Utils, Crypto };
export default class Archethic {
    endpoint;
    rpcWallet;
    transaction;
    nearestEndpoints;
    account;
    network;
    constructor(endpoint) {
        this.endpoint = Endpoint.build(endpoint);
        if (this.endpoint instanceof WalletRPCEndpoint) {
            this.rpcWallet = ArchethicRPCClient.instance;
        }
        this.account = new Account(this);
        this.network = new Network(this);
        this.nearestEndpoints = new Set();
        this.transaction = new Transaction(this);
    }
    async connect() {
        if (this.endpoint instanceof WalletRPCEndpoint) {
            await this.endpoint.resolve();
        }
        const nodes = await Api.getNearestEndpoints(this.endpoint.nodeEndpoint.toString());
        let nearestEndpoints = nodes.map(({ ip, port }) => {
            return `http://${ip}:${port}`;
        });
        nearestEndpoints.push(this.endpoint.origin.toString());
        this.nearestEndpoints = new Set(nearestEndpoints);
        return this;
    }
    async requestNode(call) {
        const node = this.nearestEndpoints.values().next().value;
        try {
            return await call(node);
        }
        catch (err) {
            console.error(err);
            this.nearestEndpoints.delete(node);
            if (this.nearestEndpoints.size == 0) {
                throw "Cannot reach Archethic node";
            }
            return this.requestNode(call);
        }
    }
}
//# sourceMappingURL=index.js.map