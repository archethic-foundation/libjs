export class SignedTransaction {
    /**
     * @param {String} address
     * @param {String} previousPublicKey
     * @param {String} previousSignature
     * @param {String} originSignature
     */
    constructor(address,previousPublicKey, previousSignature, originSignature) {
        this.address = address
        this.previousPublicKey = previousPublicKey
        this.previousSignature = previousSignature
        this.originSignature = originSignature
    }
}
