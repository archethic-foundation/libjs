import logo from "./logo.svg";
import "./App.css";
import Archethic from "@archethicjs/sdk";
import { useState } from "react";
function App() {
  const [connected, setConnected] = useState(false);
  const [logs, setLogs] = useState([{}]);
  const archethic = new Archethic("ws://localhost:12345");
  async function connectWallet() {
    archethic
      .connect()
      .then(async () => {
        console.log("Connected to Archethic node");
        setConnected(true);
        archethic.rpcWallet.getEndpoint().then((endpoint) => {
          setLogs([...logs, { message: "Connected to Archethic node on endpoint: " + endpoint.endpointUrl, type: "" }]);
        });

        setConnected(true);
      })
      .catch((error) => {
        setLogs([...logs, { message: "Error while connecting to Archethic node" + error, type: "error" }]);
      });
  }

  async function getCurrentAccount() {
    const currentAccount = await archethic.rpcWallet.getCurrentAccount();
    setLogs([...logs, { message: "Current account: " + JSON.stringify(currentAccount), type: "success" }]);
  }

  async function getAccounts() {
    const accounts = await archethic.rpcWallet.getAccounts();
    setLogs([...logs, { message: "Accounts: " + JSON.stringify(accounts), type: "success" }]);
  }
  return (
    <div className="App">
      <header className="App-header">
        <p>
          Write awesome <strong>Dapps</strong> on <strong>Archethic!</strong>
        </p>
        <div className="buttons">
          <button className="connectButton" disabled={!connected} onClick={getAccounts}>
            Get All Accounts
          </button>
          <button className="connectButton" onClick={connectWallet}>
            Connect Wallet
          </button>
          <button className="connectButton" disabled={!connected} onClick={getCurrentAccount}>
            Get Current Account
          </button>
        </div>

        <div className="console-output">
          {logs.map((log, index) => {
            return (
              <p key={index} className={log.type}>
                {log.message}
              </p>
            );
          })}
        </div>
      </header>
    </div>
  );
}

export default App;
