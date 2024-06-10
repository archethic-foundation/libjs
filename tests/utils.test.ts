import fc from "fast-check";
import {
  isHex,
  hexToUint8Array,
  uint8ArrayToHex,
  concatUint8Arrays,
  intToUint8Array,
  bigIntToUint8Array,
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

  describe("intToUint8Array", () => {
    it("should encode an integer into a Uint8Array", () => {
      expect(intToUint8Array(0)).toStrictEqual(new Uint8Array([0]));
      expect(intToUint8Array(2 ** 8 - 1)).toStrictEqual(new Uint8Array([255]));
      expect(intToUint8Array(2 ** 8)).toStrictEqual(new Uint8Array([1, 0]));
      expect(intToUint8Array(2 ** 16 - 1)).toStrictEqual(new Uint8Array([255, 255]));
      expect(intToUint8Array(2 ** 16)).toStrictEqual(new Uint8Array([1, 0, 0]));
      expect(intToUint8Array(2 ** 24 - 1)).toStrictEqual(new Uint8Array([255, 255, 255]));
      expect(intToUint8Array(2 ** 24)).toStrictEqual(new Uint8Array([1, 0, 0, 0]));
      expect(intToUint8Array(2 ** 32 - 1)).toStrictEqual(new Uint8Array([255, 255, 255, 255]));
      expect(intToUint8Array(2 ** 32)).toStrictEqual(new Uint8Array([1, 0, 0, 0, 0]));
      expect(intToUint8Array(2 ** 40 - 1)).toStrictEqual(new Uint8Array([255, 255, 255, 255, 255]));
      expect(intToUint8Array(2 ** 40)).toStrictEqual(new Uint8Array([1, 0, 0, 0, 0, 0]));
      expect(intToUint8Array(2n ** 255n)).toStrictEqual(
        new Uint8Array([
          128, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
        ])
      );
    });
  });

  describe("uint8ArrayToInt", () => {
    it("should decode an integer from a Uint8Array", () => {
      expect(uint8ArrayToInt(new Uint8Array([0]))).toStrictEqual(BigInt(0));
      expect(uint8ArrayToInt(new Uint8Array([255]))).toStrictEqual(BigInt(2 ** 8 - 1));
      expect(uint8ArrayToInt(new Uint8Array([1, 0]))).toStrictEqual(BigInt(2 ** 8));
      expect(uint8ArrayToInt(new Uint8Array([255, 255]))).toStrictEqual(BigInt(2 ** 16 - 1));
      expect(uint8ArrayToInt(new Uint8Array([1, 0, 0]))).toStrictEqual(BigInt(2 ** 16));
      expect(uint8ArrayToInt(new Uint8Array([255, 255, 255]))).toStrictEqual(BigInt(2 ** 24 - 1));
      expect(uint8ArrayToInt(new Uint8Array([1, 0, 0, 0]))).toStrictEqual(BigInt(2 ** 24));
      expect(uint8ArrayToInt(new Uint8Array([255, 255, 255, 255]))).toStrictEqual(BigInt(2 ** 32 - 1));
      expect(uint8ArrayToInt(new Uint8Array([1, 0, 0, 0, 0]))).toStrictEqual(BigInt(2 ** 32));
      expect(uint8ArrayToInt(new Uint8Array([255, 255, 255, 255, 255]))).toStrictEqual(BigInt(2 ** 40 - 1));
      expect(uint8ArrayToInt(new Uint8Array([1, 0, 0, 0, 0, 0]))).toStrictEqual(BigInt(2 ** 40));
      expect(
        uint8ArrayToInt(
          new Uint8Array([
            128, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
          ])
        )
      ).toStrictEqual(2n ** 255n);
    });
  });

  describe("toBigInt", () => {
    it("should return Big Int of an 4 decimal digit with 8 decimals by default", () => {
      expect(toBigInt("12.5345")).toStrictEqual(BigInt(1_253_450_000));
    });

    it("should return Big Int of an 4 decimal digit with 6 decimals passed in param", () => {
      expect(toBigInt("12.5345", 6)).toStrictEqual(BigInt(12_534_500));
    });

    it("should return a Big Int of an 8 decimal digit with 7 decimal in param without rounding", () => {
      expect(toBigInt("120139.69456927", 7)).toStrictEqual(BigInt(1_201_396_945_692));
    });

    it("should return a Big Int of an 14 decimal digit with 8 decimal in param without rounding", () => {
      expect(toBigInt("94.03999999999999", 8)).toStrictEqual(BigInt(9_403_999_999));
    });

    it("should return Big Int of an interger with 8 decimals passed in param", () => {
      expect(toBigInt("125345", 8)).toStrictEqual(BigInt(12_534_500_000_000));
    });
    //
  });

  describe("fromBigInt", () => {
    it("should return 8 decimals number by default", () => {
      expect(fromBigInt(BigInt(1_253_450_000))).toStrictEqual("12.5345");
    });

    it("should return decimals number with decimals passed in param", () => {
      expect(fromBigInt(BigInt(12_534_500), 6)).toStrictEqual("12.5345");
    });
  });

  describe("toBigInt(fromBigInt())", () => {
    it("return the same value", () => {
      fc.assert(
        fc.property(fc.tuple(fc.integer({ min: 0 }), fc.integer({ min: 0, max: 99999999 })), (v) => {
          const strV = removeTrailingZerosExceptOne(`${v[0]}.${v[1]}`);

          const bv = toBigInt(strV);
          const r = fromBigInt(bv);
          expect(r).toStrictEqual(strV);
        })
      );
    });
  });

  function removeTrailingZerosExceptOne(numStr: string): string {
    if (!numStr.includes(".")) {
      return numStr + ".0"; // Add trailing zero if no decimal point
    }
    numStr = numStr.replace(/(\.\d*?[1-9])?0+$/, "$1"); // Remove trailing zeros, keep at least one non-zero digit before
    if (numStr === "0" || numStr === "0.") return "0.0"; // Handle special case for zero
    return numStr.endsWith(".") ? numStr + "0" : numStr; // Add ".0" if it ends with a dot after removing zeros
  }

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
