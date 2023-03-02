const { Socket } = require("phoenix");
const WebSocket = require("isomorphic-ws");

//Use ES5 require, as ES6 import causes `Cannot instantiate an arrow function` error
const withAbsintheSocket = require("@absinthe/socket");

module.exports = {
    create: absintheCreate,
    send: absintheSend,
    observe: absintheObserve,
    cancel: absintheCancel
}

function absintheCreate(uri) {
  const webSocket = new Socket(uri, {
    transport: WebSocket,
  });

  return withAbsintheSocket.create(webSocket);
}

function absintheSend(absintheSocket, operation) {
  return withAbsintheSocket.send(absintheSocket, { operation });
}

function absintheObserve(absintheSocket, notifier, onResultCallback) {

    return new Promise((resolve, reject) => {
      withAbsintheSocket.observe(absintheSocket, notifier, {
      onStart: function () {
        resolve(notifier);
      },
      onError: function (err) {
        withAbsintheSocket.cancel(absintheSocket, notifier);
        reject(err);
      },

      onResult: function (result) {
        onResultCallback(result)
      },
    });
    })
}

function absintheCancel(absintheSocket, notifier) {
          withAbsintheSocket.cancel(
            absintheSocket,
            notifier
          );
}
