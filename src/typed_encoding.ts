import {
  concatUint8Arrays,
  parseBigInt,
  formatBigInt,
  sortObjectKeysASC,
  deserializeString,
  serializeString,
  nextUint8
} from "./utils.js";

import VarInt from "./varint.js";

export default {
  serialize,
  deserialize
};

/**
 * Serialize any data
 * @param data
 * @returns the data encoded
 */
function serialize(data: any, version: number = 1): Uint8Array {
  // we need to order object keys ASC because that's what elixir does
  data = sortObjectKeysASC(data);

  switch (version) {
    default:
      return do_serialize_v1(data);
  }
}
/**
 * Deserialize an encoded data
 * @param encoded_data
 * @returns the data decoded
 */
function deserialize(encoded_data: Uint8Array, version: number = 1): any {
  const iter = encoded_data.entries();

  switch (version) {
    default:
      return do_deserialize_v1(iter);
  }
}

const TYPE_INT = 0;
const TYPE_FLOAT = 1;
const TYPE_STR = 2;
const TYPE_LIST = 3;
const TYPE_MAP = 4;
const TYPE_BOOL = 5;
const TYPE_NIL = 6;

function do_serialize_v1(data: any): Uint8Array {
  if (data === null) {
    return Uint8Array.from([TYPE_NIL]);
  } else if (data === true) {
    return Uint8Array.from([TYPE_BOOL, 1]);
  } else if (data === false) {
    return Uint8Array.from([TYPE_BOOL, 0]);
  } else if (Number(data) === data) {
    const sign = data >= 0;

    if (Number.isInteger(data)) {
      return concatUint8Arrays(
        Uint8Array.from([TYPE_INT]),
        Uint8Array.from([sign ? 1 : 0]),
        VarInt.serialize(BigInt(Math.abs(data)))
      );
    } else {
      return concatUint8Arrays(
        Uint8Array.from([TYPE_FLOAT]),
        Uint8Array.from([sign ? 1 : 0]),
        VarInt.serialize(parseBigInt(Math.abs(data).toString()))
      );
    }
  } else if (typeof data === "string") {
    return concatUint8Arrays(Uint8Array.from([TYPE_STR]), VarInt.serialize(byte_size(data)), serializeString(data));
  } else if (Array.isArray(data)) {
    const serializedItems = data.map((item) => do_serialize_v1(item));
    return concatUint8Arrays(Uint8Array.from([TYPE_LIST]), VarInt.serialize(data.length), ...serializedItems);
  } else if (typeof data == "object") {
    const serializedKeyValues = Object.keys(data).reduce(function (acc: Uint8Array[], key: any) {
      acc.push(do_serialize_v1(key));
      acc.push(do_serialize_v1(data[key]));
      return acc;
    }, []);

    return concatUint8Arrays(
      Uint8Array.from([TYPE_MAP]),
      VarInt.serialize(Object.keys(data).length),
      ...serializedKeyValues
    );
  } else {
    throw new Error("Unhandled data type");
  }
}

function do_deserialize_v1(iter: IterableIterator<[number, number]>): any {
  switch (nextUint8(iter)) {
    case TYPE_NIL:
      return null;

    case TYPE_BOOL:
      return nextUint8(iter) == 1;

    case TYPE_INT:
      return nextUint8(iter) == 1 ? VarInt.deserialize(iter) : VarInt.deserialize(iter) * -1n;

    case TYPE_FLOAT:
      return nextUint8(iter) == 1
        ? formatBigInt(VarInt.deserialize(iter))
        : formatBigInt(VarInt.deserialize(iter) * -1n);

    case TYPE_STR: {
      const strLen = VarInt.deserialize(iter);
      let bytes = [];
      for (let i = 0; i < strLen; i++) {
        bytes.push(nextUint8(iter));
      }
      return deserializeString(Uint8Array.from(bytes));
    }

    case TYPE_LIST: {
      const listLen = VarInt.deserialize(iter);
      let list = [];
      for (let i = 0; i < listLen; i++) {
        list.push(do_deserialize_v1(iter));
      }
      return list;
    }

    case TYPE_MAP: {
      const keysLen = VarInt.deserialize(iter);
      let map = new Map(); // we use a map here because keys can be of any type
      for (let i = 0; i < keysLen; i++) {
        map.set(do_deserialize_v1(iter), do_deserialize_v1(iter));
      }
      return Object.fromEntries(map.entries());
    }
  }
}

function byte_size(str: string) {
  return new TextEncoder().encode(str).length;
}
