export var Curve;
(function (Curve) {
    Curve["ed25519"] = "ed25519";
    Curve["P256"] = "P256";
    Curve["secp256k1"] = "secp256k1";
})(Curve || (Curve = {}));
export var HashAlgorithm;
(function (HashAlgorithm) {
    HashAlgorithm["sha256"] = "sha256";
    HashAlgorithm["sha512"] = "sha512";
    HashAlgorithm["sha3_256"] = "sha3-256";
    HashAlgorithm["sha3_512"] = "sha3-512";
    HashAlgorithm["blake2b"] = "blake2b";
})(HashAlgorithm || (HashAlgorithm = {}));
export var UserTypeTransaction;
(function (UserTypeTransaction) {
    UserTypeTransaction["keychain"] = "keychain";
    UserTypeTransaction["keychain_access"] = "keychain_access";
    UserTypeTransaction["transfer"] = "transfer";
    UserTypeTransaction["hosting"] = "hosting";
    UserTypeTransaction["token"] = "token";
    UserTypeTransaction["data"] = "data";
    UserTypeTransaction["contract"] = "contract";
    UserTypeTransaction["code_proposal"] = "code_proposal";
    UserTypeTransaction["code_approval"] = "code_approval";
})(UserTypeTransaction || (UserTypeTransaction = {}));
var NetworkTypeTransaction;
(function (NetworkTypeTransaction) {
    NetworkTypeTransaction["node"] = "node";
    NetworkTypeTransaction["node_shared_secrets"] = "node_shared_secrets";
    NetworkTypeTransaction["origin_shared_secrets"] = "origin_shared_secrets";
    NetworkTypeTransaction["beacon"] = "beacon";
    NetworkTypeTransaction["beacon_summary"] = "beacon_summary";
    NetworkTypeTransaction["oracle"] = "oracle";
    NetworkTypeTransaction["oracle_summary"] = "oracle_summary";
    NetworkTypeTransaction["code_proposal"] = "code_proposal";
    NetworkTypeTransaction["code_approval"] = "code_approval";
    NetworkTypeTransaction["node_rewards"] = "node_rewards";
})(NetworkTypeTransaction || (NetworkTypeTransaction = {}));
//# sourceMappingURL=types.js.map