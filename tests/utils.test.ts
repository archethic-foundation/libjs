import {
  isHex,
  hexToUint8Array,
  uint8ArrayToHex,
  concatUint8Arrays,
  intToUint8Array,
  bigIntToUint8Array,
  toByteArray,
  toBigInt,
  fromBigInt,
  sortObjectKeysASC,
  uint8ArrayToInt
} from "../src/utils.js";

describe("Utils", () => {
  describe("isHex", () => {
    it("should return true when the string is an hexadecimal", () => {
      expect(isHex("0f2cb1a")).toBe(true);
    });

    it("should return false when the string is not an hexadecimal", () => {
      expect(isHex("13z9=!ç")).toBe(false);
    });
  });

  describe("hexToUint8Array", () => {
    it("should convert an hexadecimal to Uint8Array", () => {
      expect(hexToUint8Array("025381ef")).toStrictEqual(new Uint8Array([2, 83, 129, 239]));
    });
  });

  describe("uint8ArrayToHex", () => {
    it("should convert a Uint8Array to hex", () => {
      expect(uint8ArrayToHex(new Uint8Array([2, 83, 129, 239]))).toBe("025381ef");
    });
  });

  describe("concatUint8Arrays", () => {
    it("should concat small Uint8 arrays", () => {
      const a = new Uint8Array([1, 2, 3]);
      const b = new Uint8Array([4, 5, 6]);

      expect(concatUint8Arrays(a, b)).toStrictEqual(new Uint8Array([1, 2, 3, 4, 5, 6]));
    });

    it("should concat big Uint8 arrays", () => {
      const a = new Uint8Array(20000);
      const b = new Uint8Array([1, 2, 3, 4]);

      const newArray = concatUint8Arrays(a, b);
      expect(newArray.byteLength).toBe(20004);
    });
  });

  describe("encodeInt32", () => {
    it("should encode an integer", () => {
      expect(intToUint8Array(212323839823)).toStrictEqual(new Uint8Array([111, 124, 175, 79]));
    });
  });

  describe("encodeInt64", () => {
    it("should encode an integer into a big integer on 8 bytes", () => {
      expect(bigIntToUint8Array(212323839821021)).toStrictEqual(new Uint8Array([0, 0, 193, 27, 127, 12, 196, 221]));
    });
  });

  describe("toByteArray", () => {
    it("should encode an integer into a UnInt8Array", () => {
      expect(toByteArray(0)).toStrictEqual(new Uint8Array([0]));
      expect(toByteArray(2 ** 8 - 1)).toStrictEqual(new Uint8Array([255]));
      expect(toByteArray(2 ** 8)).toStrictEqual(new Uint8Array([1, 0]));
      expect(toByteArray(2 ** 16 - 1)).toStrictEqual(new Uint8Array([255, 255]));
      expect(toByteArray(2 ** 16)).toStrictEqual(new Uint8Array([1, 0, 0]));
      expect(toByteArray(2 ** 24 - 1)).toStrictEqual(new Uint8Array([255, 255, 255]));
      expect(toByteArray(2 ** 24)).toStrictEqual(new Uint8Array([1, 0, 0, 0]));
      expect(toByteArray(2 ** 32 - 1)).toStrictEqual(new Uint8Array([255, 255, 255, 255]));
      expect(toByteArray(2 ** 32)).toStrictEqual(new Uint8Array([1, 0, 0, 0, 0]));
      expect(toByteArray(2 ** 40 - 1)).toStrictEqual(new Uint8Array([255, 255, 255, 255, 255]));
      expect(toByteArray(2 ** 40)).toStrictEqual(new Uint8Array([1, 0, 0, 0, 0, 0]));
    });
  });

  describe("uint8ArrayToInt / fromByteArray", () => {
    it("should decode an integer from a UnInt8Array", () => {
      expect(uint8ArrayToInt(new Uint8Array([0]))).toStrictEqual(0);
      expect(uint8ArrayToInt(new Uint8Array([255]))).toStrictEqual(2 ** 8 - 1);
      expect(uint8ArrayToInt(new Uint8Array([1, 0]))).toStrictEqual(2 ** 8);
      expect(uint8ArrayToInt(new Uint8Array([255, 255]))).toStrictEqual(2 ** 16 - 1);
      expect(uint8ArrayToInt(new Uint8Array([1, 0, 0]))).toStrictEqual(2 ** 16);
      expect(uint8ArrayToInt(new Uint8Array([255, 255, 255]))).toStrictEqual(2 ** 24 - 1);
      expect(uint8ArrayToInt(new Uint8Array([1, 0, 0, 0]))).toStrictEqual(2 ** 24);
      expect(uint8ArrayToInt(new Uint8Array([255, 255, 255, 255]))).toStrictEqual(2 ** 32 - 1);
      expect(uint8ArrayToInt(new Uint8Array([1, 0, 0, 0, 0]))).toStrictEqual(2 ** 32);
      expect(uint8ArrayToInt(new Uint8Array([255, 255, 255, 255, 255]))).toStrictEqual(2 ** 40 - 1);
      expect(uint8ArrayToInt(new Uint8Array([1, 0, 0, 0, 0, 0]))).toStrictEqual(2 ** 40);
    });
  });

  describe("toBigInt", () => {
    it("should return Big Int with 8 decimals by default", () => {
      expect(toBigInt(12.5345)).toBe(1_253_450_000);
    });

    it("should return Big Int with decimals passed in param", () => {
      expect(toBigInt(12.5345, 6)).toBe(12_534_500);
    });
  });

  describe("fromBigInt", () => {
    it("should return 8 decimals number by default", () => {
      expect(fromBigInt(1_253_450_000)).toBe(12.5345);
    });

    it("should return decimals number with decimals passed in param", () => {
      expect(fromBigInt(12_534_500, 6)).toBe(12.5345);
    });
  });

  describe("sortObjectKeysASC", () => {
    it("should return the same value if not an object", () => {
      expect(sortObjectKeysASC(1234)).toStrictEqual(1234);
      expect(sortObjectKeysASC([])).toStrictEqual([]);
      expect(sortObjectKeysASC([1, 2])).toStrictEqual([1, 2]);
      expect(sortObjectKeysASC("")).toStrictEqual("");
      expect(sortObjectKeysASC("abradacadabra")).toStrictEqual("abradacadabra");
    });

    it("should not change anything if already ordered", () => {
      const a = sortObjectKeysASC({
        a: "hello",
        b: "world"
      });
      expect(Object.keys(a)).toStrictEqual(["a", "b"]);
    });

    it("should reorder the keys of root level", () => {
      const a = sortObjectKeysASC({
        b: "world",
        a: "hello"
      });
      expect(Object.keys(a)).toStrictEqual(["a", "b"]);
    });

    it("should reorder the keys even nested", () => {
      const obj = sortObjectKeysASC({
        b: "world",
        a: {
          b: [
            {
              a: 1,
              c: 2,
              b: {
                c: "some",
                a: "thing",
                b: "here"
              }
            }
          ],
          a: "bar",
          c: {
            b: "loulou",
            a: "riri",
            c: "fifi"
          }
        },
        c: "hello"
      });
      expect(Object.keys(obj)).toStrictEqual(["a", "b", "c"]);
      expect(Object.keys(obj.a)).toStrictEqual(["a", "b", "c"]);
      expect(Object.keys(obj.a.c)).toStrictEqual(["a", "b", "c"]);
      expect(Object.keys(obj.a.b[0])).toStrictEqual(["a", "b", "c"]);
      expect(Object.keys(obj.a.b[0].b)).toStrictEqual(["a", "b", "c"]);
    });
  });
});
