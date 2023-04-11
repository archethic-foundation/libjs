export class Service {
    /**
     * @param {String} name
     * @param {String} derivationPath
     * @param {String} curve
     * @param {String} hashAlgo
     */
    constructor(name,derivationPath, curve, hashAlgo) {
        this.name = name || ""
        this.derivationPath = derivationPath
        this.curve = Curve
        this.hashAlgo = hashAlgo
    }
}
