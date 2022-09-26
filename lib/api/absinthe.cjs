const { Socket } = require("phoenix");
const WebSocket = require("isomorphic-ws");

//Use ES5 require, as ES6 import causes `Cannot instantiate an arrow function` error
const withAbsintheSocket = require("@absinthe/socket");

module.exports.absintheCreate = function (uri) {
  const webSocket = new Socket(uri, {
    transport: WebSocket,
  });

  return withAbsintheSocket.create(webSocket);
}

module.exports.absintheSend = function (absintheSocket, operation) {
  return withAbsintheSocket.send(absintheSocket, { operation });
}

module.exports.absintheObserve = function (absintheSocket, notifier, onResultCallback) {

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

module.exports.absintheCancel = function (absintheSocket, notifier) {

          withAbsintheSocket.cancel(
            absintheSocket,
            notifier
          );
}
