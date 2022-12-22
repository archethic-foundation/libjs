import Archethic from "./index.js"

const a = new Archethic("https://mainnet.archethic.net")

a.connect()
  .then(console.log)
  .catch(e => {
    console.log(e)
    process.exit(1)
  })
