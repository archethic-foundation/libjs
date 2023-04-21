import * as Crypto from "./crypto.js";
import * as Utils from "./utils.js";
import { DirectEndpoint, WalletRPCEndpoint } from "./endpoint.js";
import { ArchethicRPCClient } from "./api/wallet_rpc.js";
import Network from "./network.js";
import Transaction from "./transaction.js";
import Account from "./account.js";
export { Utils, Crypto };
export default class Archethic {
    endpoint: DirectEndpoint | WalletRPCEndpoint;
    rpcWallet: ArchethicRPCClient | undefined;
    transaction: Transaction;
    nearestEndpoints: Set<string>;
    account: Account;
    network: Network;
    constructor(endpoint: string);
    connect(): Promise<this>;
    requestNode(call: (endpoint: string) => Promise<any>): Promise<any>;
}
