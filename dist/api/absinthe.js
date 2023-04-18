import { Socket } from "phoenix";
import TransportWebSocket from "isomorphic-ws";
import { create, send, observe, cancel } from "@absinthe/socket";
export default {
    create: absintheCreate,
    send: absintheSend,
    observe: absintheObserve,
    cancel: absintheCancel
};
function absintheCreate(uri) {
    const webSocket = new Socket(uri, {
        transport: TransportWebSocket,
    });
    return create(webSocket);
}
function absintheSend(absintheSocket, operation) {
    return send(absintheSocket, { operation });
}
function absintheObserve(absintheSocket, notifier, onResultCallback) {
    return new Promise((resolve, reject) => {
        observe(absintheSocket, notifier, {
            onStart: function () {
                resolve(notifier);
            },
            onError: function (err) {
                cancel(absintheSocket, notifier);
                reject(err);
            },
            onResult: function (result) {
                onResultCallback(result);
            },
        });
    });
}
function absintheCancel(absintheSocket, notifier) {
    cancel(absintheSocket, notifier);
}
//# sourceMappingURL=absinthe.js.map