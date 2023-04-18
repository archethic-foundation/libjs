import { AuthorizedKeyUserInput, TransactionData, UserTypeTransaction } from "./types.js";
export default class TransactionBuilder {
    version: number;
    type: UserTypeTransaction;
    address: Uint8Array;
    data: TransactionData;
    previousPublicKey: Uint8Array;
    previousSignature: Uint8Array;
    originSignature: Uint8Array;
    constructor(type?: UserTypeTransaction | string);
    setType(type: UserTypeTransaction | string): this;
    setCode(code: string): this;
    setContent(content: string | Uint8Array): this;
    addOwnership(secret: string | Uint8Array, authorizedKeys: AuthorizedKeyUserInput[]): this;
    addUCOTransfer(to: string | Uint8Array, amount: number): this;
    addTokenTransfer(to: string | Uint8Array, amount: number, tokenAddress: string | Uint8Array, tokenId?: number): this;
    addRecipient(to: string | Uint8Array): this;
    setPreviousSignatureAndPreviousPublicKey(prevSign: string | Uint8Array, prevPubKey: string | Uint8Array): this;
    setAddress(addr: string | Uint8Array): this;
    build(seed: string | Uint8Array, index: number, curve?: string, hashAlgo?: string): this;
    originSign(privateKey: string | Uint8Array): this;
    setOriginSign(signature: string | Uint8Array): this;
    originSignaturePayload(): Uint8Array;
    previousSignaturePayload(): Uint8Array;
    toJSON(): string;
}
