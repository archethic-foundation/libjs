import { Socket } from "phoenix";
import TransportWebSocket from "isomorphic-ws";
//Use ES5 require, as ES6 import causes `Cannot instantiate an arrow function` error
import { create, send, observe, AbsintheSocket, cancel, Notifier } from "@absinthe/socket";

export default {
    create: absintheCreate,
    send: absintheSend,
    observe: absintheObserve,
    cancel: absintheCancel
}

function absintheCreate(uri: string): AbsintheSocket {
    const webSocket = new Socket(uri, {
        transport: TransportWebSocket,
    });

    return create(webSocket);
}

function absintheSend(absintheSocket: AbsintheSocket, operation: string) {
    return send(absintheSocket, { operation });
}

function absintheObserve(absintheSocket: AbsintheSocket, notifier: Notifier, onResultCallback: Function) {

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
                onResultCallback(result)
            },
        });
    })
}

function absintheCancel(absintheSocket: AbsintheSocket, notifier: Notifier) {
    cancel(
        absintheSocket,
        notifier
    );
}
