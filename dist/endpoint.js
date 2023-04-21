import { ArchethicRPCClient } from "./api/wallet_rpc.js";
export class Endpoint {
    static build(endpoint) {
        const url = new URL(endpoint);
        if (url.protocol === 'ws:') {
            return new WalletRPCEndpoint(endpoint);
        }
        if (url.protocol === 'http:' || url.protocol === 'https:') {
            return new DirectEndpoint(endpoint);
        }
        throw new Error(`Invalid endpoint protocol: ${url.protocol}`);
    }
}
export class DirectEndpoint {
    origin;
    nodeEndpoint;
    get isRpcAvailable() { return false; }
    constructor(endpoint) {
        this.origin = endpoint;
        this.nodeEndpoint = new URL(endpoint);
    }
}
export class WalletRPCEndpoint {
    rpcClient;
    origin;
    rpcEndpoint;
    nodeEndpoint;
    get isRpcAvailable() { return true; }
    constructor(endpoint) {
        this.rpcClient = ArchethicRPCClient.instance;
        this.origin = endpoint;
        this.rpcEndpoint = new URL(endpoint);
        this.nodeEndpoint = '';
    }
    async resolve() {
        await this.rpcClient.connect(this.rpcEndpoint.hostname, parseInt(this.rpcEndpoint.port));
        await this.rpcClient.getEndpoint().then((response) => {
            this.nodeEndpoint = new URL(response['endpointUrl']);
        });
    }
}
//# sourceMappingURL=endpoint.js.map