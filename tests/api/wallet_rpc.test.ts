import Keychain from "../../src/keychain";
import Account from "../../src/account";
import Archethic, { ArchethicWalletClient, AWCStreamChannel, AWCStreamChannelState, ConnectionState } from "../../src/index";
import { deriveKeyPair, randomSecretKey } from "../../src/crypto";
import { uint8ArrayToHex } from "../../src/utils";
const nock = require("nock");


class AWCStreamChannelMock<T> implements AWCStreamChannel<T> {
    _state = AWCStreamChannelState.CLOSED;
    onReceive: ((data: T) => Promise<void>) | null;
    onReady: (() => Promise<void>) | null;
    onClose: ((reason: string) => Promise<void>) | null;

    constructor(
        onReceive?: ((data: T) => Promise<void>),
        onReady?: (() => Promise<void>),
        onClose?: ((reason: string) => Promise<void>),
    ) {
        this.onReceive = onReceive ?? null;
        this.onReady = onReady ?? null;
        this.onClose = onClose ?? null;
    }

    get state(): AWCStreamChannelState {
        return this._state;
    }

    _simulateQuickOperation(): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, 200));
    }

    _connectStateResult = AWCStreamChannelState.OPEN
    set testUtilSetConnectResult(state: AWCStreamChannelState) {
        this._connectStateResult = state;
    }
    async connect(): Promise<void> {
        this._state = AWCStreamChannelState.CONNECTING;
        await this._simulateQuickOperation();
        this._state = this._connectStateResult;
        this.onReady?.();
    }
    async close(): Promise<void> {
        this._state = AWCStreamChannelState.CLOSING;
        await this._simulateQuickOperation();
        this._state = AWCStreamChannelState.CLOSED;
        this.onClose?.('');
    }

    async send(data: T): Promise<void> {
        await this._simulateQuickOperation();
    }

}


describe("WalletRPC", () => {
    it("should expose correct states while connecting", async () => {
        const awc = new ArchethicWalletClient(new AWCStreamChannelMock<string>());

        expect(awc.connectionState).toBe(ConnectionState.Closed);

        const connectPromise = awc.connect();
        expect(awc.connectionState).toBe(ConnectionState.Connecting);

        await connectPromise;
        expect(awc.connectionState).toBe(ConnectionState.Open);
    });

    it("should dispatch correct states while connecting", async () => {
        const awc = new ArchethicWalletClient(new AWCStreamChannelMock<string>());

        const connectionStates = new Array<ConnectionState>();
        awc.onconnectionstatechange((state) => {
            connectionStates.push(state)
        })

        await awc.connect();

        expect(connectionStates).toStrictEqual([ConnectionState.Connecting, ConnectionState.Open])
    });

    it("should expose correct states while disconnecting", async () => {
        const awc = new ArchethicWalletClient(new AWCStreamChannelMock<string>());
        await awc.connect();


        expect(awc.connectionState).toBe(ConnectionState.Open);
        const disconnectPromise = awc.close();
        expect(awc.connectionState).toBe(ConnectionState.Closing);

        await disconnectPromise;
        expect(awc.connectionState).toBe(ConnectionState.Closed);
    });

    it("should dispatch correct states while disconnecting", async () => {
        const awc = new ArchethicWalletClient(new AWCStreamChannelMock<string>());
        await awc.connect();

        const connectionStates = new Array<ConnectionState>();
        awc.onconnectionstatechange((state) => {
            connectionStates.push(state)
        })

        await awc.close();
        expect(connectionStates).toStrictEqual([ConnectionState.Closing, ConnectionState.Closed]);
    });
});
