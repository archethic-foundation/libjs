import { ArchethicRPCClient } from "./api/wallet_rpc.js";



export default class Endpoint {
    constructor({ rpcClient, nodeEndpoint }) {
        /** @type {ArchethicRPCClient | undefined} */
        this.rpcClient = rpcClient

        /** @type {String} */
        this.origin = nodeEndpoint

        /** @type {URL} */
        this.nodeEndpoint = new URL(nodeEndpoint)
    }

    /**
     * @return {Boolean}
     */
    get isRpcAvailable() { }


    /**
     * @param {String} endpoint 
     * @return {Endpoint}
     */
    static build(endpoint) {
        const url = new URL(endpoint);

        if (url.protocol === 'ws:') {
            return new WalletRPCEndpoint(endpoint);
        }

        if (url.protocol === 'http:' || url.protocol === 'https:') {
            return new DirectEndpoint(endpoint);
        }
    }
}

class DirectEndpoint extends Endpoint {
    /**
     * @return {Boolean}
     */
    get isRpcAvailable() { return false }

    /**
     * @param {String} endpoint 
     */
    constructor(endpoint) {
        super({ nodeEndpoint: endpoint })
    }
}

class WalletRPCEndpoint extends Endpoint {
    /**
     * @return {Boolean}
     */
    get isRpcAvailable() { return true }

    /**
     * @param {String} endpoint 
     */
    constructor(endpoint) {
        super({
            rpcClient: new ArchethicRPCClient(),
            nodeEndpoint: endpoint,
        })
    }

    async resolve() {
        await this.rpcClient.connect(this.rpcEndpoint.host, this.rpcEndpoint.port);

        await this.rpcClient.getEndpoint().then((response) => {
            this.nodeEndpoint = response['endpointUrl']
        });
    }
}
