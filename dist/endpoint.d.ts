import { ArchethicRPCClient } from "./api/wallet_rpc.js";
export declare class Endpoint {
    static build(endpoint: string): DirectEndpoint | WalletRPCEndpoint;
}
export declare class DirectEndpoint {
    origin: string;
    nodeEndpoint: URL;
    get isRpcAvailable(): boolean;
    constructor(endpoint: string);
}
export declare class WalletRPCEndpoint {
    rpcClient: ArchethicRPCClient;
    origin: string;
    private rpcEndpoint;
    nodeEndpoint: URL | string;
    get isRpcAvailable(): boolean;
    constructor(endpoint: string);
    resolve(): Promise<void>;
}
