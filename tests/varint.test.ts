import VarInt from "../src/varint"

describe("VarInt", () => {
    it("should serialize/deserialize", () => {
        expect(VarInt.deserialize(VarInt.serialize(0).entries())).toBe(0)
        expect(VarInt.deserialize(VarInt.serialize(2 ** 8 - 1).entries())).toBe(2 ** 8 - 1)
        expect(VarInt.deserialize(VarInt.serialize(2 ** 8).entries())).toBe(2 ** 8)
        expect(VarInt.deserialize(VarInt.serialize(2 ** 16 - 1).entries())).toBe(2 ** 16 - 1)
        expect(VarInt.deserialize(VarInt.serialize(2 ** 16).entries())).toBe(2 ** 16)
        expect(VarInt.deserialize(VarInt.serialize(2 ** 24 - 1).entries())).toBe(2 ** 24 - 1)
        expect(VarInt.deserialize(VarInt.serialize(2 ** 24).entries())).toBe(2 ** 24)
        expect(VarInt.deserialize(VarInt.serialize(2 ** 32 - 1).entries())).toBe(2 ** 32 - 1)
        expect(VarInt.deserialize(VarInt.serialize(2 ** 32).entries())).toBe(2 ** 32)
        expect(VarInt.deserialize(VarInt.serialize(2 ** 40 - 1).entries())).toBe(2 ** 40 - 1)
        expect(VarInt.deserialize(VarInt.serialize(2 ** 40).entries())).toBe(2 ** 40)
    })
})