import {
  isHex,
  hexToUint8Array,
  uint8ArrayToHex,
  concatUint8Arrays,
  encodeInt32,
  encodeInt64,
  toByteArray,
  toBigInt,
  fromBigInt
} from "../lib/utils.js"
import assert from 'assert'

describe("Utils", () => {
  describe("isHex", () => {
    it("should return true when the string is an hexadecimal", () => {
      assert.strictEqual(isHex("0f2cb1a"), true)
    })

    it("should return false when the string is not an hexadecimal", () => {
      assert.strictEqual(isHex("13z9=!ç"), false)
    })
  })

  describe("hexToUint8Array", () => {
    it ("should convert an hexadecimal to Uint8Array", () => {
      assert.deepStrictEqual(hexToUint8Array("025381ef"), new Uint8Array([2, 83, 129, 239]))
    })
  })

  describe("uint8ArrayToHex", () => {
    it ("should convert a Uint8Array to hex", () => {
      assert.deepStrictEqual(uint8ArrayToHex(new Uint8Array([2, 83, 129, 239])), "025381ef")
    })
  })

  describe("concatUint8Arrays", () => {
    it ("should concat small Uint8 arrays", () => {
      const a = new Uint8Array([1, 2, 3])
      const b = new Uint8Array([4, 5, 6])

      assert.deepStrictEqual(concatUint8Arrays([a, b]).byteLength, 6)
    })

    it ("should concat big Uint8 arrays", () => {
      const a = new Uint8Array(20000)
      const b = new Uint8Array([1, 2, 3, 4])

      const newArray = concatUint8Arrays([a, b])
      assert.equal(newArray.byteLength, 20004)
    })
  })


  describe("encodeInt32", () => {
    it ("should encode an integer", () => {
      assert.deepStrictEqual(encodeInt32(212323839823), new Uint8Array([111, 124, 175, 79]))
    })
  })

  describe("encodeInt64", () => {
    it ("should encode an integer into a big integer on 8 bytes", () => {
      assert.deepStrictEqual(encodeInt64(212323839821021), new Uint8Array([0, 0, 193, 27, 127, 12, 196, 221]))
    })
  })

  describe("toByteArray", () => {
    it ("should encode an integer into a UnInt8Array", () => {
      assert.deepStrictEqual(toByteArray(0), [0])
      assert.deepStrictEqual(toByteArray(123), [123])
      assert.deepStrictEqual(toByteArray(258), [1, 2])
      assert.deepStrictEqual(toByteArray(65535), [255, 255])
      assert.deepStrictEqual(toByteArray(65536), [1, 0, 0])
    })
  })

  describe("toBigInt", () => {
    it ("should return Big Int with 8 decimals by default", () => {
      assert.deepStrictEqual(toBigInt(12.5345), 1_253_450_000)
    })

    it ("should return Big Int with decimals passed in param", () => {
      assert.deepStrictEqual(toBigInt(12.5345, 6), 12_534_500)
    })
  })

  describe("fromBigInt", () => {
    it ("should return 8 decimals number by default", () => {
      assert.deepStrictEqual(fromBigInt(1_253_450_000), 12.5345)
    })

    it ("should return decimals number with decimals passed in param", () => {
      assert.deepStrictEqual(fromBigInt(12_534_500, 6), 12.5345)
    })
  })
})
