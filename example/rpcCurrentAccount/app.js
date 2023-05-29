import Archethic from 'archethic';
import { ArchethicRPCClient } from '../../dist/api/wallet_rpc';

let accountChangesSubscription;

ArchethicRPCClient.instance.setOrigin(
    {name: 'Wallet RPC example application'},
)

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
  })
  localArchethic.connect();
  archethic = localArchethic
}

window.get_current_account = async () => {

  const currentAccount = await archethic.rpcWallet.getCurrentAccount()

  const currentAccountDataElement = document.querySelector("#get_account_data")
  currentAccountDataElement.innerHTML = JSON.stringify(currentAccount)
}

window.subscribe_current_account = async () => {
  archethic.rpcWallet.onCurrentAccountChange(
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

window.unsubscribe_current_account = async () => {
  archethic.rpcWallet.unsubscribe(accountChangesSubscription)

  _updateSubscribeAccount(false)
}

function _updateSubscribeAccount(listening) {
  const button = document.querySelector("#current_account_sub_button")

  if (listening === true) {
    button.textContent = "Listening to account changes"
    button.setAttribute('onclick', "unsubscribe_current_account()")
    button.setAttribute('class', "button")
    return
  }

  button.textContent = "Listen to account changes"
  button.setAttribute('onclick', "subscribe_current_account()")
  button.setAttribute('class', "button is-warning")
}
