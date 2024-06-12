import { intToUint8Array, concatUint8Arrays, nextUint8, uint8ArrayToBigInt, getBigNumber } from "./utils.js";

export default {
  serialize,
  deserialize
};

function serialize(int: number | bigint): Uint8Array {
  const buff = intToUint8Array(getBigNumber(int));
  return concatUint8Arrays(Uint8Array.from([buff.length]), buff);
}

function deserialize(iter: IterableIterator<[number, number]>): bigint {
  const length = nextUint8(iter);

  let bytes = [];
  for (let i = 0; i < length; i++) {
    bytes.push(nextUint8(iter));
  }

  return uint8ArrayToBigInt(Uint8Array.from(bytes));
}
