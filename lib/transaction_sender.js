const fetch = require('cross-fetch')
const { uint8ArrayToHex } = require('./utils')

const withAbsintheSocket = require("@absinthe/socket")
const { Socket } = require("phoenix")
const WebSocket = require("isomorphic-ws")

const senderContext = 'SENDER'

module.exports = class TransactionSender {
  constructor() {
    this.onSent = []
    this.onConfirmation = []
    this.onFullConfirmation = []
    this.onRequiredConfirmation = []
    this.onError = []
    this.onTimeout = []

    this.confirmationNotifier = undefined
    this.errorNotifier = undefined
    this.absintheSocket = undefined

    this.timeout = undefined
    this.nbConfirmationReceived = 0

    return this
  }

  /**
   * Add listener on specific event
   * @param {String} event Event to subscribe
   * @param {Function} func Function to call when event triggered
   */
  on(event, func) {
    if (typeof (event) !== "string") {
      throw "'event' must be a string"
    }

    if (typeof (func) !== "function") {
      throw "'func' must be a function"
    }

    switch (event) {
      case 'sent':
        this.onSent.push(func)
        break

      case 'confirmation':
        this.onConfirmation.push(func)
        break

      case 'requiredConfirmation':
        this.onRequiredConfirmation.push(func)
        break

      case 'fullConfirmation':
        this.onFullConfirmation.push(func)
        break

      case 'error':
        this.onError.push(func)
        break

      case 'timeout':
        this.onTimeout.push(func)
        break

      default:
        throw 'Event ' + event + ' is not supported'
    }

    return this
  }

  async send(tx, endpoint, confirmationThreshold = 100, timeout = 60) {
    if (typeof (tx) !== "object") {
      throw "'tx' must be an instance of TransactionBuilder"
    }

    if (typeof (endpoint) !== 'string') {
      throw "'endpoint' must be a string"
    }

    if (typeof (confirmationThreshold) !== 'number' ||
      (confirmationThreshold < 0 && confirmationThreshold > 100)) {
      throw "'confirmationThreshold' must be an integer between 0 and 100"
    }

    if (typeof (timeout) !== 'number' || timeout <= 0) {
      throw "'timeout' must be an integer greater than 0"
    }
    
    const txAddress = uint8ArrayToHex(tx.address)

    // Create web socket
    const { host, protocol } = new URL(endpoint)
    const ws_protocol = protocol == "https:" ? "wss" : "ws"

    const webSocket = new Socket(`${ws_protocol}://${host}/socket`, {
      transport: WebSocket
    })

    this.absintheSocket = withAbsintheSocket.create(webSocket)

    try {
      this.confirmationNotifier = await waitConfirmations(
        txAddress, this.absintheSocket, (nbConf, maxConf) => handleConfirmation.call(this, confirmationThreshold, nbConf, maxConf)
      )
      this.errorNotifier = await waitError(txAddress, this.absintheSocket, handleError.bind(this))
    } catch (err) {
      this.onError.forEach(func => func(senderContext, err.message))
      return this
    }

    // Send transaction
    fetch(endpoint + "/api/transaction", {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: tx.toJSON()
    })
      .then((response) => handleSend.call(this, timeout, response))
      .catch(err => this.onError.forEach(func => func(senderContext, err)))

    return this
  }

  unsubscribe(event = undefined) {
    if (event) {
      switch (event) {
        case 'sent':
          this.onSent = []
          break

        case 'confirmation':
          this.onConfirmation = []
          withAbsintheSocket.cancel(this.absintheSocket, this.confirmationNotifier)
          break

        case 'requiredConfirmation':
          this.onRequiredConfirmation = []
          withAbsintheSocket.cancel(this.absintheSocket, this.confirmationNotifier)
          break

        case 'fullConfirmation':
          this.onFullConfirmation = []
          withAbsintheSocket.cancel(this.absintheSocket, this.confirmationNotifier)
          break

        case 'error':
          this.onError = []
          withAbsintheSocket.cancel(this.absintheSocket, this.errorNotifier)
          break

        case 'timeout':
          this.onTimeout = []
          break

        default:
          throw 'Event ' + event + ' is not supported'
      }
    } else {
      withAbsintheSocket.cancel(this.absintheSocket, this.confirmationNotifier)
      withAbsintheSocket.cancel(this.absintheSocket, this.errorNotifier)
      this.onConfirmation = []
      this.onFullConfirmation = []
      this.onRequiredConfirmation = []
      this.onError = []
      this.onTimeout = []
      this.onSent = []
    }
  }
}

function waitConfirmations(address, absintheSocket, handler) {
  const operation = `
    subscription {
      transactionConfirmed(address: "${address}") {
        nbConfirmations,
        maxConfirmations
      }
    }
    `
  const notifier = withAbsintheSocket.send(absintheSocket, { operation })

  return new Promise((resolve, reject) => {
    withAbsintheSocket.observe(absintheSocket, notifier, {
      onStart: function () {
        resolve(notifier)
      },
      onError: function (err) {
        withAbsintheSocket.cancel(absintheSocket, notifier)
        reject(err)
      },

      onResult: function (result) {
        if (result.data.transactionConfirmed) {
          const {
            nbConfirmations: nbConfirmations,
            maxConfirmations: maxConfirmations
          } = result.data.transactionConfirmed

          handler(nbConfirmations, maxConfirmations)
        }
      }
    })
  })
}

function waitError(address, absintheSocket, handler) {
  const operation = `
    subscription {
      transactionError(address: "${address}") {
        context,
        reason
      }
    }
    `
  const notifier = withAbsintheSocket.send(absintheSocket, { operation })

  return new Promise((resolve, reject) => {
    withAbsintheSocket.observe(absintheSocket, notifier, {
      onStart: function () {
        resolve(notifier)
      },
      onError: function (err) {
        withAbsintheSocket.cancel(absintheSocket, notifier)
        reject(err)
      },

      onResult: function (result) {
        if (result.data.transactionError) {
          const {
            context: context,
            reason: reason
          } = result.data.transactionError

          handler(context, reason)
        }
      }
    })
  })
}

function handleConfirmation(confirmationThreshold, nbConfirmations, maxConfirmations) {
  // Update nb confirmation received for timeout
  this.nbConfirmationReceived = nbConfirmations

  // Unsubscribe to error on first confirmation
  if (nbConfirmations == 1) withAbsintheSocket.cancel(this.absintheSocket, this.errorNotifier)

  this.onConfirmation.forEach(func => func(nbConfirmations, maxConfirmations))

  if ((maxConfirmations * (confirmationThreshold / 100)) <= nbConfirmations
    && this.onRequiredConfirmation.length > 0) {
    this.onRequiredConfirmation.forEach(func => func(nbConfirmations))
    this.onRequiredConfirmation = []
    clearTimeout(this.timeout)
  }

  if (nbConfirmations == maxConfirmations) {
    clearTimeout(this.timeout)

    withAbsintheSocket.cancel(this.absintheSocket, this.confirmationNotifier)

    this.onFullConfirmation.forEach(func => func(maxConfirmations))
  }
}

function handleError(context, reason) {
  clearTimeout(this.timeout)

  // Unsubscribe to all subscriptions
  withAbsintheSocket.cancel(this.absintheSocket, this.confirmationNotifier)
  withAbsintheSocket.cancel(this.absintheSocket, this.errorNotifier)

  this.onError.forEach(func => func(context, reason))
}

function handleSend(timeout, response) {
  if (response.status >= 200 && response.status <= 299) {
    this.onSent.forEach(func => func())
    // Setup 1 minute timeout
    this.timeout = setTimeout(() => {
      withAbsintheSocket.cancel(this.absintheSocket, this.confirmationNotifier)
      withAbsintheSocket.cancel(this.absintheSocket, this.errorNotifier)

      this.onTimeout.forEach(func => func(this.nbConfirmationReceived))
    }, timeout * 1_000)
  } else {
    withAbsintheSocket.cancel(this.absintheSocket, this.confirmationNotifier)
    withAbsintheSocket.cancel(this.absintheSocket, this.errorNotifier)

    response.json().then(err => this.onError.forEach(func => func(senderContext, err.status)))
  }
}