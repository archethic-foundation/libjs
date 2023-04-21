import { AbsintheSocket, Notifier } from "@absinthe/socket";
declare const _default: {
    create: typeof absintheCreate;
    send: typeof absintheSend;
    observe: typeof absintheObserve;
    cancel: typeof absintheCancel;
};
export default _default;
declare function absintheCreate(uri: string): AbsintheSocket;
declare function absintheSend(absintheSocket: AbsintheSocket, operation: string): Notifier<{}, {}>;
declare function absintheObserve(absintheSocket: AbsintheSocket, notifier: Notifier, onResultCallback: Function): Promise<unknown>;
declare function absintheCancel(absintheSocket: AbsintheSocket, notifier: Notifier): void;
