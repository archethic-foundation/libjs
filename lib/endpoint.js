import { ArchethicRPCClient } from "./api/wallet_rpc.js";



export class Endpoint {
    /**
     * @param {String} endpoint 
     * @return {DirectEndpoint | WalletRPCEndpoint}
     */
    static build(endpoint) {
        const url = new URL(endpoint);

        console.log(`endpoint : ${endpoint.protocol}`)

        if (url.protocol === 'ws:') {
            return new WalletRPCEndpoint(endpoint);
        }

        if (url.protocol === 'http:' || url.protocol === 'https:') {
            return new DirectEndpoint(endpoint);
        }
    }
}

export class DirectEndpoint {
    /**
     * @return {Boolean}
     */
    get isRpcAvailable() { return false }

    /**
     * @param {String} endpoint 
     */
    constructor(endpoint) {
        /** @type {String} */
        this.origin = endpoint

        /** @type {URL} */
        this.nodeEndpoint = new URL(endpoint)
    }
}

export class WalletRPCEndpoint {
    /**
     * @return {Boolean}
     */
    get isRpcAvailable() { return true }

    /**
     * @param {String} endpoint 
     */
    constructor(endpoint) {
        /** @type {ArchethicRPCClient} */
        this.rpcClient = ArchethicRPCClient.instance

        /** @type {String} */
        this.origin = endpoint

        /** @type {URL} */
        this.rpcEndpoint = new URL(endpoint)
    }

    async resolve() {
        await this.rpcClient.connect(this.rpcEndpoint.hostname, this.rpcEndpoint.port);

        await this.rpcClient.getEndpoint().then((response) => {
            this.nodeEndpoint = response['endpointUrl']
        });
    }
}
