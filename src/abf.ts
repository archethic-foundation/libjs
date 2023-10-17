// ABF stands for Archethic Binary Format

import {
    concatUint8Arrays,
    toBigInt,
    fromBigInt,
    sortObjectKeysASC,
    deserializeString,
    serializeString,
    nextUint8
} from "./utils"

import VarInt from "./varint"

export default {
    serialize,
    deserialize
}

/**
 * Serialize any data
 * @param data
 * @returns the data encoded
 */
function serialize(data: any): Uint8Array {
    // we need to order object keys ASC because that's what elixir does
    data = sortObjectKeysASC(data)

    return concatUint8Arrays(
        // abf version 1
        Uint8Array.from([1]),
        do_serialize_v1(data)
    )
}
/**
 * Deserialize an encoded data
 * @param encoded_data
 * @returns the data decoded
 */
function deserialize(encoded_data: Uint8Array): any {
    const iter = encoded_data.entries()
    const version = nextUint8(iter)

    switch (version) {
        case 1:
            return do_deserialize_v1(iter)
    }
}


const TYPE_INT = 0
const TYPE_FLOAT = 1
const TYPE_STR = 2
const TYPE_LIST = 3
const TYPE_MAP = 4
const TYPE_BOOL = 5
const TYPE_NIL = 6


function do_serialize_v1(data: any): Uint8Array {
    if (data === null) {
        return Uint8Array.from([TYPE_NIL])
    } else if (data === true) {
        return Uint8Array.from([TYPE_BOOL, 1])
    } else if (data === false) {
        return Uint8Array.from([TYPE_BOOL, 0])
    } else if (Number(data) === data) {
        const sign = data >= 0

        if (Number.isInteger(data)) {
            return concatUint8Arrays(
                Uint8Array.from([TYPE_INT]),
                Uint8Array.from([sign ? 1 : 0]),
                VarInt.serialize(Math.abs(data))
            )
        } else {
            return concatUint8Arrays(
                Uint8Array.from([TYPE_FLOAT]),
                Uint8Array.from([sign ? 1 : 0]),
                VarInt.serialize(toBigInt(Math.abs(data)))
            )
        }
    } else if (typeof data === 'string') {
        return concatUint8Arrays(
            Uint8Array.from([TYPE_STR]),
            VarInt.serialize(data.length),
            serializeString(data)
        )
    } else if (Array.isArray(data)) {
        const serializedItems = data.map((item) => do_serialize_v1(item))
        return concatUint8Arrays(
            Uint8Array.from([TYPE_LIST]),
            VarInt.serialize(data.length),
            ...serializedItems
        )
    } else if (data instanceof Map) {
        const serializedKeyValues = []

        for (let [key, value] of data.entries()) {
            serializedKeyValues.push(do_serialize_v1(key))
            serializedKeyValues.push(do_serialize_v1(value))
        }

        return concatUint8Arrays(
            Uint8Array.from([TYPE_MAP]),
            VarInt.serialize(data.size),
            ...serializedKeyValues
        )
    } else if (typeof data == "object") {
        const serializedKeyValues =
            Object.keys(data)
                .reduce(function (acc: Uint8Array[], key: any) {
                    acc.push(do_serialize_v1(key))
                    acc.push(do_serialize_v1(data[key]))
                    return acc
                }, []);

        return concatUint8Arrays(
            Uint8Array.from([TYPE_MAP]),
            VarInt.serialize(Object.keys(data).length),
            ...serializedKeyValues
        )
    } else {
        throw new Error("Unhandled data type")
    }
}

function do_deserialize_v1(iter: IterableIterator<[number, number]>): any {
    switch (nextUint8(iter)) {
        case TYPE_NIL:
            return null

        case TYPE_BOOL:
            return nextUint8(iter) == 1

        case TYPE_INT:
            return nextUint8(iter) == 1
                ? VarInt.deserialize(iter)
                : VarInt.deserialize(iter) * -1

        case TYPE_FLOAT:
            return nextUint8(iter) == 1
                ? fromBigInt(VarInt.deserialize(iter))
                : fromBigInt(VarInt.deserialize(iter) * -1)


        case TYPE_STR:
            const strLen = VarInt.deserialize(iter)

            let bytes = []
            for (let i = 0; i < strLen; i++) {
                bytes.push(nextUint8(iter))
            }

            return deserializeString(Uint8Array.from(bytes))

        case TYPE_LIST:
            const listLen = VarInt.deserialize(iter)

            let list = []
            for (let i = 0; i < listLen; i++) {
                list.push(do_deserialize_v1(iter))
            }

            return list

        case TYPE_MAP:
            const keysLen = VarInt.deserialize(iter)

            // we use a map here because keys can be of any type
            let map = new Map()
            for (let i = 0; i < keysLen; i++) {
                map.set(do_deserialize_v1(iter), do_deserialize_v1(iter))
            }

            // then, if all keys are strings, convert it to object
            //
            // it's not ideal because we might have a different value from before the serialization
            // but I doubt we can do anything about it without modifying the serialization in Elixir
            if (Array.from(map.keys()).every(k => typeof k == "string")) {
                return Object.fromEntries(map.entries())
            }

            return map
    }
}
