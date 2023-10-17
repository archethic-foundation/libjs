import ABF from "../src/abf"

describe("ABF", () => {
    it("should serialize/deserialize a null", () => {
        expect(ABF.deserialize(ABF.serialize(null))).toBeNull()
    })
    it("should serialize/deserialize a bool", () => {
        expect(ABF.deserialize(ABF.serialize(true))).toBe(true)
        expect(ABF.deserialize(ABF.serialize(false))).toBe(false)
    })
    it("should serialize/deserialize an integer", () => {
        expect(ABF.deserialize(ABF.serialize(0))).toBe(0)
        expect(ABF.deserialize(ABF.serialize(1))).toBe(1)
        expect(ABF.deserialize(ABF.serialize(2 ** 40))).toBe(2 ** 40)
    })
    it("should serialize/deserialize a float", () => {
        expect(ABF.deserialize(ABF.serialize(1.00000001))).toBe(1.00000001)
        expect(ABF.deserialize(ABF.serialize(1.99999999))).toBe(1.99999999)
    })
    it("should serialize/deserialize a str", () => {
        expect(ABF.deserialize(ABF.serialize("hello"))).toBe("hello")
        expect(ABF.deserialize(ABF.serialize("world"))).toBe("world")
    })

    it("should serialize/deserialize a list", () => {
        expect(ABF.deserialize(ABF.serialize([]))).toStrictEqual([])
        expect(ABF.deserialize(ABF.serialize([1, 2, 3]))).toStrictEqual([1, 2, 3])
        expect(ABF.deserialize(ABF.serialize(["1", true, 14]))).toStrictEqual(["1", true, 14])
    })
})

describe("VarInt", () => {
    it("should serialize/deserialize", () => {
        expect(ABF.deserializeVarInt(ABF.serializeVarInt(0).entries())).toBe(0)
        expect(ABF.deserializeVarInt(ABF.serializeVarInt(2 ** 8 - 1).entries())).toBe(2 ** 8 - 1)
        expect(ABF.deserializeVarInt(ABF.serializeVarInt(2 ** 8).entries())).toBe(2 ** 8)
        expect(ABF.deserializeVarInt(ABF.serializeVarInt(2 ** 16 - 1).entries())).toBe(2 ** 16 - 1)
        expect(ABF.deserializeVarInt(ABF.serializeVarInt(2 ** 16).entries())).toBe(2 ** 16)
        expect(ABF.deserializeVarInt(ABF.serializeVarInt(2 ** 24 - 1).entries())).toBe(2 ** 24 - 1)
        expect(ABF.deserializeVarInt(ABF.serializeVarInt(2 ** 24).entries())).toBe(2 ** 24)
        expect(ABF.deserializeVarInt(ABF.serializeVarInt(2 ** 32 - 1).entries())).toBe(2 ** 32 - 1)
        expect(ABF.deserializeVarInt(ABF.serializeVarInt(2 ** 32).entries())).toBe(2 ** 32)
        expect(ABF.deserializeVarInt(ABF.serializeVarInt(2 ** 40 - 1).entries())).toBe(2 ** 40 - 1)
        expect(ABF.deserializeVarInt(ABF.serializeVarInt(2 ** 40).entries())).toBe(2 ** 40)
    })
})