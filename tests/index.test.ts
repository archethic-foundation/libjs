import * as API from "../src/api";
import { EndpointFactory } from "../src/endpoint";
import Archethic from "../src/index";
const nock = require("nock");

describe("Archethic", () => {
  it("constructor should instanciate a new instance and set the endpoint", () => {
    const archethic = new Archethic("http://localhost:4000");

    // converts asserts to jest
    expect(archethic.endpoint).toStrictEqual(new EndpointFactory().build("http://localhost:4000"));
    expect(archethic.network).not.toBeUndefined();
    expect(archethic.account).not.toBeUndefined();
    expect(archethic.transaction).not.toBeUndefined();
  });

});
