const uniris = require('../index')
const assert = require('assert')

describe ("derivateAddress", () => {
    it("should derivate a address by using a seed and index", () => {
        assert.equal(uniris.derivateAddress("mysuperseed", 0), "006263c4a701fd46494abd72dd81235e7a8b53c9cc20e367cd4a016207e248b655")
    })
})

describe ("derivatePublicKey", () => {
    it("should derivate a address by using a seed and index", () => {
        assert.equal(uniris.derivatePublicKey("mysuperseed", 0), "0068a1f2b00f0e2a174020ca7b66d9685b182a40ce33fec0fe779c6047facb485a")
    })
})