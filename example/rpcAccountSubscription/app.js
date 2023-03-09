import Archethic, { Utils } from 'archethic';
import { ArchethicRPCClient, ConnectionState, RpcRequestOrigin } from '../../lib/api/wallet_rpc';

const { toBigInt } = Utils;

let file_content = "";

let ucoTransfers = [];
let tokenTransfers = [];
let recipients = [];
let ownerships = [];

let accountChangesSubscription;

ArchethicRPCClient.instance.setOrigin(new RpcRequestOrigin(
  'Wallet RPC example application',
))

/** @type {Archethic | undefined} */
let archethic = undefined

window.onload = function () {
  const endpoint = document.querySelector("#endpoint").value;
  console.log(`Endpoint : ${endpoint}`)
  const localArchethic = new Archethic(endpoint);
  localArchethic.rpcWallet.onconnectionstatechange((state) => {
    document
      .querySelector("#rpcConnectionStatus")
      .textContent = state

    if (state === ConnectionState.Open) {
      loadAccounts()
    }
  })
  localArchethic.connect();
  archethic = localArchethic
}

window.loadAccounts = function () {
  console.log('Loading accounts')
  archethic.rpcWallet.getAccounts().then(
    (accounts) => {
      const select = document.querySelector("select#account")
      select.children = []
      accounts.forEach(account => {
        console.log(`\t ${JSON.stringify(account)}`)
        const option = document.createElement("option");
        option.text = `${account.name} : ${account.genesisAddress}`;
        option.value = account.name;
        select.appendChild(option);
      })
    }
  )
}



window.subscribe_account = async () => {
  const selectedAccount = document.querySelector("select#account").value

  archethic.rpcWallet.onAccountChange(
    selectedAccount,
    (account) => {
      const notifications = document.querySelector("#notifications")

      const option = document.createElement("p");
      option.setAttribute("class", "box");
      option.innerHTML = `<b>${new Date().toLocaleString()}</b> :<br/> ${JSON.stringify(account, null, 2)}`;
      notifications.appendChild(option);
    }
  ).then((subscription) => {
    accountChangesSubscription = subscription
    _updateSubscribeAccount(true)
  }).catch((e) => {
    _updateSubscribeAccount(false)
  })
}

window.unsubscribe_account = async () => {
  archethic.rpcWallet.unsubscribe(accountChangesSubscription)

  _updateSubscribeAccount(false)
}

function _updateSubscribeAccount(listening) {
  const button = document.querySelector("#account_sub_button")

  if (listening === true) {
    button.textContent = "Listening to account changes"
    button.setAttribute('onclick', "unsubscribe_account()")
    button.setAttribute('class', "button")
    return
  }

  button.textContent = "Listen to account changes"
  button.setAttribute('onclick', "subscribe_account()")
  button.setAttribute('class', "button is-warning")
}
