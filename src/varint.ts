import { toByteArray, concatUint8Arrays, nextUint8, fromByteArray } from "./utils"

export default {
    serialize,
    deserialize
}

function serialize(int: number): Uint8Array {
    const buff = toByteArray(int)

    return concatUint8Arrays(
        Uint8Array.from([buff.length]),
        buff
    )
}

function deserialize(iter: IterableIterator<[number, number]>): number {
    const length = nextUint8(iter)

    let bytes = []
    for (let i = 0; i < length; i++) {
        bytes.push(nextUint8(iter))
    }

    return fromByteArray(Uint8Array.from(bytes))
}