export var ConnectionState;
(function (ConnectionState) {
    ConnectionState["Closed"] = "WalletRPCConnection_closed";
    ConnectionState["Closing"] = "WalletRPCConnection_closing";
    ConnectionState["Connecting"] = "WalletRPCConnection_connecting";
    ConnectionState["Open"] = "WalletRPCConnection_open";
})(ConnectionState || (ConnectionState = {}));
export var RpcErrorCode;
(function (RpcErrorCode) {
    RpcErrorCode[RpcErrorCode["UnsupportedMethod"] = -32601] = "UnsupportedMethod";
    RpcErrorCode[RpcErrorCode["Timeout"] = 5001] = "Timeout";
    RpcErrorCode[RpcErrorCode["Connectivity"] = 4901] = "Connectivity";
    RpcErrorCode[RpcErrorCode["ConsensusNotReached"] = 5002] = "ConsensusNotReached";
    RpcErrorCode[RpcErrorCode["InvalidParams"] = -32602] = "InvalidParams";
    RpcErrorCode[RpcErrorCode["InvalidTransaction"] = 5003] = "InvalidTransaction";
    RpcErrorCode[RpcErrorCode["InvalidConfirmation"] = 5006] = "InvalidConfirmation";
    RpcErrorCode[RpcErrorCode["InsufficientFunds"] = 5004] = "InsufficientFunds";
    RpcErrorCode[RpcErrorCode["ServiceNotFound"] = 5007] = "ServiceNotFound";
    RpcErrorCode[RpcErrorCode["UserRejected"] = 4001] = "UserRejected";
    RpcErrorCode[RpcErrorCode["UnknownAccount"] = 5005] = "UnknownAccount";
    RpcErrorCode[RpcErrorCode["Other"] = 5000] = "Other";
})(RpcErrorCode || (RpcErrorCode = {}));
//# sourceMappingURL=types.js.map