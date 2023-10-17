import TE from "../src/typed_encoding"

describe("TE", () => {
    it("should serialize/deserialize a null", () => {
        expect(TE.deserialize(TE.serialize(null))).toBeNull()
    })
    it("should serialize/deserialize a bool", () => {
        expect(TE.deserialize(TE.serialize(true))).toBe(true)
        expect(TE.deserialize(TE.serialize(false))).toBe(false)
    })
    it("should serialize/deserialize an integer", () => {
        expect(TE.deserialize(TE.serialize(0))).toBe(0)
        expect(TE.deserialize(TE.serialize(1))).toBe(1)
        expect(TE.deserialize(TE.serialize(2 ** 40))).toBe(2 ** 40)
    })
    it("should serialize/deserialize a float", () => {
        expect(TE.deserialize(TE.serialize(1.00000001))).toBe(1.00000001)
        expect(TE.deserialize(TE.serialize(1.99999999))).toBe(1.99999999)
    })
    it("should serialize/deserialize a str", () => {
        expect(TE.deserialize(TE.serialize("hello"))).toBe("hello")
        expect(TE.deserialize(TE.serialize("world"))).toBe("world")
        expect(TE.deserialize(TE.serialize("un été à l'ombre"))).toBe("un été à l'ombre")
    })
    it("should serialize/deserialize a list", () => {
        expect(TE.deserialize(TE.serialize([]))).toStrictEqual([])
        expect(TE.deserialize(TE.serialize([1, 2, 3]))).toStrictEqual([1, 2, 3])
        expect(TE.deserialize(TE.serialize(["1", true, 14]))).toStrictEqual(["1", true, 14])
    })
    it("should serialize/deserialize an object", () => {
        expect(TE.deserialize(TE.serialize({}))).toStrictEqual({})
        expect(TE.deserialize(TE.serialize({ a: 1, foo: "bar" }))).toStrictEqual({ a: 1, foo: "bar" })
    })
})
