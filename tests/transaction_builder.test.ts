import TransactionBuilder from "../src/transaction_builder";
import { deriveAddress, deriveKeyPair, sign, verify } from "../src/crypto";
import { concatUint8Arrays, hexToUint8Array, intToUint32Array, intToUint64Array, parseBigInt } from "../src/utils";
import TE from "../src/typed_encoding";

const VERSION = 3;

// all assert should be transformed to jest expect
describe("Transaction builder", () => {
  describe("setType", () => {
    it("should assign type transfer", () => {
      const tx = new TransactionBuilder().setType("transfer");
      expect(tx.type).toBe("transfer");
    });
    it("should assign type contract", () => {
      const tx = new TransactionBuilder().setType("contract");
      expect(tx.type).toBe("contract");
    });
    it("should assign type data", () => {
      const tx = new TransactionBuilder().setType("data");
      expect(tx.type).toBe("data");
    });
    it("should assign type token", () => {
      const tx = new TransactionBuilder().setType("token");
      expect(tx.type).toBe("token");
    });
    it("should assign type hosting", () => {
      const tx = new TransactionBuilder().setType("hosting");
      expect(tx.type).toBe("hosting");
    });

    it("should assign type code proposal", () => {
      const tx = new TransactionBuilder().setType("code_proposal");
      expect(tx.type).toBe("code_proposal");
    });

    it("should assign type code approval", () => {
      const tx = new TransactionBuilder().setType("code_approval");
      expect(tx.type).toBe("code_approval");
    });
  });

  describe("setCode", () => {
    it("should insert the code into the transaction data", () => {
      const tx = new TransactionBuilder("transfer").setCode("my smart contract code");
      expect(new TextDecoder().decode(tx.data.code)).toBe("my smart contract code");
    });
  });

  describe("setContent", () => {
    it("should insert the content into the transaction data", () => {
      const tx = new TransactionBuilder("transfer").setContent("my super content");
      expect(tx.data.content).toStrictEqual(new TextEncoder().encode("my super content"));
    });
  });

  describe("addOwnership", () => {
    it("should add an ownership with a secret and its authorized keys into the transaction data", () => {
      const tx = new TransactionBuilder("transfer").addOwnership(
        "00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88",
        [
          {
            publicKey: "0001b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646",
            encryptedSecretKey: "00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88"
          },
          {
            publicKey: "0001b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646",
            encryptedSecretKey: "00601fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88"
          }
        ]
      );

      expect(tx.data.ownerships[0].secret).toStrictEqual(
        hexToUint8Array("00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88")
      );
      expect(tx.data.ownerships[0].authorizedPublicKeys).toStrictEqual([
        {
          publicKey: hexToUint8Array("0001b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"),
          encryptedSecretKey: hexToUint8Array("00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88")
        }
      ]);
    });
  });

  describe("addUCOTransfer", () => {
    it("should add an uco transfer to the transaction data", () => {
      const tx = new TransactionBuilder("transfer").addUCOTransfer(
        "0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646",
        parseBigInt("10.03")
      );

      expect(tx.data.ledger.uco.transfers.length).toBe(1);
      expect(tx.data.ledger.uco.transfers[0].to).toStrictEqual(
        hexToUint8Array("0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646")
      );
      expect(tx.data.ledger.uco.transfers[0].amount).toStrictEqual(parseBigInt("10.03"));
    });
  });

  describe("addTokenTransfer", () => {
    it("should add an token transfer to the transaction data", () => {
      const tx = new TransactionBuilder("transfer").addTokenTransfer(
        "0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646",
        parseBigInt("10.03"),
        "0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"
      );

      expect(tx.data.ledger.token.transfers.length).toBe(1);
      expect(tx.data.ledger.token.transfers[0].to).toStrictEqual(
        hexToUint8Array("0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646")
      );
      expect(tx.data.ledger.token.transfers[0].amount).toStrictEqual(parseBigInt("10.03"));
      expect(tx.data.ledger.token.transfers[0].tokenAddress).toStrictEqual(
        hexToUint8Array("0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646")
      );
    });
  });

  describe("addRecipient", () => {
    it("should add a recipient for named action", () => {
      const tx = new TransactionBuilder("transfer").addRecipient(
        "0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646",
        "vote",
        ["Miles"]
      );

      expect(tx.data.recipients.length).toBe(1);
      expect(tx.data.recipients[0].action).toBe("vote");
      expect(tx.data.recipients[0].args!.length).toBe(1);
      expect(tx.data.recipients[0].args![0]).toBe("Miles");
    });

    it("should throw if types are incorrect", () => {
      const tx = new TransactionBuilder("transfer");

      expect(() => {
        // @ts-ignore
        tx.addRecipient("0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", 1, 2);
      }).toThrow();
    });
  });

  describe("previousSignaturePayload", () => {
    it("should generate binary encoding of the transaction before signing", () => {
      const code = `
              condition inherit: [
                uco_transferred: 0.020
              ]

              actions triggered by: transaction do
                  set_type transfer
                  add_uco_ledger to: "000056E763190B28B4CF9AAF3324CF379F27DE9EF7850209FB59AA002D71BA09788A", amount: 0.020
              end
            `;

      const content =
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec sit amet leo egestas, lobortis lectus a, dignissim orci.";

      const secret = "mysecret";

      const tx = new TransactionBuilder("transfer")
        .addOwnership(secret, [
          {
            publicKey: "0001b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646",
            encryptedSecretKey: "00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88"
          }
        ])
        .addUCOTransfer("0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", parseBigInt("0.202"))
        .addTokenTransfer(
          "0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646",
          parseBigInt("100"),
          "0000501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88"
        )
        .setCode(code)
        .setContent(content)
        .addRecipient("0000501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88");

      const keypair = deriveKeyPair("seed", 0);

      tx.address = deriveAddress("seed", 1);
      tx.previousPublicKey = keypair.publicKey;

      const payload = tx.previousSignaturePayload();

      const expected_binary = concatUint8Arrays(
        //Version
        intToUint32Array(VERSION),
        tx.address,
        Uint8Array.from([253]),
        //Code size
        intToUint32Array(code.length),
        new TextEncoder().encode(code),
        //Content size
        intToUint32Array(content.length),
        new TextEncoder().encode(content),
        // Nb of byte to encode nb of ownerships
        Uint8Array.from([1]),
        //Nb of ownerships
        Uint8Array.from([1]),
        //Secret size
        intToUint32Array(secret.length),
        new TextEncoder().encode(secret),
        // Nb of byte to encode nb of authorized keys
        Uint8Array.from([1]),
        // Nb of authorized keys
        Uint8Array.from([1]),
        // Authorized keys encoding
        concatUint8Arrays(
          hexToUint8Array("0001b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"),
          hexToUint8Array("00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88")
        ),
        // Nb of byte to encode nb of uco transfers
        Uint8Array.from([1]),
        // Nb of uco transfers
        Uint8Array.from([1]),
        concatUint8Arrays(
          hexToUint8Array("0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"),
          intToUint64Array(parseBigInt("0.202"))
        ),
        // Nb of byte to encode nb of Token transfers
        Uint8Array.from([1]),
        // Nb of Token transfers
        Uint8Array.from([1]),
        concatUint8Arrays(
          hexToUint8Array("0000501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88"),
          hexToUint8Array("0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"),
          intToUint64Array(parseBigInt("100")),
          Uint8Array.from([1]),
          Uint8Array.from([0])
        ),
        // Nb of byte to encode nb of recipients
        Uint8Array.from([1]),
        // Nb of recipients
        Uint8Array.from([1]),
        // 0 = unnamed recipient
        Uint8Array.from([0]),
        hexToUint8Array("0000501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88")
      );
      expect(payload).toEqual(expected_binary);
    });

    // it("should generate binary encoding of the transaction before signing with named action", () => {
    //   const code = `
    //           condition inherit: [
    //             uco_transferred: 0.020
    //           ]

    //           actions triggered by: transaction do
    //               set_type transfer
    //               add_uco_ledger to: "000056E763190B28B4CF9AAF3324CF379F27DE9EF7850209FB59AA002D71BA09788A", amount: 0.020
    //           end
    //         `;

    //   const content =
    //     "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec sit amet leo egestas, lobortis lectus a, dignissim orci.";

    //   const secret = "mysecret";

    //   const tx = new TransactionBuilder("transfer")
    //     .addOwnership(secret, [
    //       {
    //         publicKey: "0001b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646",
    //         encryptedSecretKey: "00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88"
    //       }
    //     ])
    //     .addUCOTransfer("0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", parseBigInt("0.202"))
    //     .addTokenTransfer(
    //       "0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646",
    //       parseBigInt("100"),
    //       "0000501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88"
    //     )
    //     .setCode(code)
    //     .setContent(content)
    //     .addRecipient("0000501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88", "vote_for_mayor", [
    //       "Ms. Smith"
    //     ]);

    //   const keypair = deriveKeyPair("seed", 0);

    //   tx.address = deriveAddress("seed", 1);
    //   tx.previousPublicKey = keypair.publicKey;

    //   const payload = tx.previousSignaturePayload();

    //   const expected_binary = concatUint8Arrays(
    //     //Version
    //     intToUint32Array(VERSION),
    //     tx.address,
    //     Uint8Array.from([253]),
    //     //Code size
    //     intToUint32Array(code.length),
    //     new TextEncoder().encode(code),
    //     //Content size
    //     intToUint32Array(content.length),
    //     new TextEncoder().encode(content),
    //     // Nb of byte to encode nb of ownerships
    //     Uint8Array.from([1]),
    //     //Nb of ownerships
    //     Uint8Array.from([1]),
    //     //Secret size
    //     intToUint32Array(secret.length),
    //     new TextEncoder().encode(secret),
    //     // Nb of byte to encode nb of authorized keys
    //     Uint8Array.from([1]),
    //     // Nb of authorized keys
    //     Uint8Array.from([1]),
    //     // Authorized keys encoding
    //     concatUint8Arrays(
    //       hexToUint8Array("0001b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"),
    //       hexToUint8Array("00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88")
    //     ),
    //     // Nb of byte to encode nb of uco transfers
    //     Uint8Array.from([1]),
    //     // Nb of uco transfers
    //     Uint8Array.from([1]),
    //     concatUint8Arrays(
    //       hexToUint8Array("0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"),
    //       intToUint8Array(parseBigInt("0.202"))
    //     ),
    //     // Nb of byte to encode nb of Token transfers
    //     Uint8Array.from([1]),
    //     // Nb of Token transfers
    //     Uint8Array.from([1]),
    //     concatUint8Arrays(
    //       hexToUint8Array("0000501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88"),
    //       hexToUint8Array("0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"),
    //       intToUint8Array(parseBigInt("100")),
    //       Uint8Array.from([1]),
    //       Uint8Array.from([0])
    //     ),
    //     // Nb of byte to encode nb of recipients
    //     Uint8Array.from([1]),
    //     // Nb of recipients
    //     Uint8Array.from([1]),
    //     // 1 = named recipient
    //     Uint8Array.from([1]),
    //     hexToUint8Array("0000501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88"),
    //     // action
    //     // action size on 1 byte
    //     Uint8Array.from([14]),
    //     // action value
    //     new TextEncoder().encode("vote_for_mayor"),
    //     // args size
    //     Uint8Array.from([1]),
    //     // args value
    //     TE.serialize("Ms. Smith")
    //   );
    //   expect(payload).toEqual(expected_binary);
    // });

    it("should order the keys or named action args in the generated binary", () => {
      const tx = new TransactionBuilder("transfer").addRecipient(
        "0000501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88",
        "set_geopos",
        [{ lng: 2, lat: 1 }]
      );

      const keypair = deriveKeyPair("seed", 0);

      tx.address = deriveAddress("seed", 1);
      tx.previousPublicKey = keypair.publicKey;

      const payload = tx.previousSignaturePayload();

      const expected_binary = concatUint8Arrays(
        //Version
        intToUint32Array(VERSION),
        tx.address,
        Uint8Array.from([253]),
        //Code size
        intToUint32Array(0),
        //Content size
        intToUint32Array(0),
        // Nb of byte to encode nb of ownerships
        Uint8Array.from([1]),
        //Nb of ownerships
        Uint8Array.from([0]),
        // Nb of byte to encode nb of uco transfers
        Uint8Array.from([1]),
        // Nb of uco transfers
        Uint8Array.from([0]),
        // Nb of byte to encode nb of Token transfers
        Uint8Array.from([1]),
        // Nb of Token transfers
        Uint8Array.from([0]),
        // Nb of byte to encode nb of recipients
        Uint8Array.from([1]),
        // Nb of recipients
        Uint8Array.from([1]),
        // 1 = named recipient
        Uint8Array.from([1]),
        hexToUint8Array("0000501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88"),
        // action
        // action size on 1 byte
        Uint8Array.from([10]),
        // action value
        new TextEncoder().encode("set_geopos"),
        // args size
        Uint8Array.from([1]),
        // args value
        TE.serialize({ lng: 2, lat: 1 })
      );
      expect(payload).toEqual(expected_binary);
    });
  });

  describe("setPreviousSignatureAndPreviousPublicKey", () => {
    it("should set previous signature and previous public key in transaction builder", () => {
      const examplePublicKey =
        "0101044d91a0a1a7cf06a2902d3842f82d2791bcbf3ee6f6dc8de0f90e53e9991c3cb33684b7b9e66f26e7c9f5302f73c69897be5f301de9a63521a08ac4ef34c18728";
      const exampleSignature =
        "3044022009ed5124c35feb3449f4287eb5a885dec06f10491146bf73d44684f5a2ced8d7022049e1fb29fcd6e622a8cd2e120931ab038987edbdc44e7a9ec12e5a290599a97e";

      const tx = new TransactionBuilder("transfer").setPreviousSignatureAndPreviousPublicKey(
        exampleSignature,
        examplePublicKey
      );

      expect(Buffer.from(tx.previousPublicKey).toString("hex")).toEqual(examplePublicKey);
      expect(Buffer.from(tx.previousSignature).toString("hex")).toEqual(exampleSignature);
    });
  });

  describe("setAddress", () => {
    it("should set this.address in transaction builder", () => {
      const exampleAddress = "0000501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88";

      const tx = new TransactionBuilder("transfer").setAddress(exampleAddress);

      expect(tx.address).toEqual(hexToUint8Array(exampleAddress));
    });
  });

  describe("setGenerateEncryptedSeedSC", () => {
    it("should set this.generateEncryptedSeedSC in transaction builder", () => {
      const generateEncryptedSeedSC = true;
      const tx = new TransactionBuilder("transfer").setGenerateEncryptedSeedSC(generateEncryptedSeedSC);

      expect(tx.generateEncryptedSeedSC).toEqual(generateEncryptedSeedSC);
    });
    it("should affect the WalletTransactionRPC", () => {
      const generateEncryptedSeedSC = true;
      const tx = new TransactionBuilder("transfer").setGenerateEncryptedSeedSC(generateEncryptedSeedSC);
      const txRPC = tx.toWalletRPC();

      expect(txRPC).toHaveProperty("generateEncryptedSeedSC", true);
    });
    it("should not affect the NodeTransactionRPC", async () => {
      const generateEncryptedSeedSC = true;
      const tx = new TransactionBuilder("transfer").setGenerateEncryptedSeedSC(generateEncryptedSeedSC);
      const txRPC = await tx.toNodeRPC();

      expect(txRPC).not.toHaveProperty("generateEncryptedSeedSC", true);
    });
  });

  describe("build", () => {
    it("should build the transaction and the related signature", () => {
      const tx = new TransactionBuilder("transfer")
        .addUCOTransfer("0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", parseBigInt("10.0"))
        .build("seed", 0, "ed25519", "sha256");

      expect(tx.address).toEqual(
        hexToUint8Array("00001ff1733caa91336976ee7cef5aff6bb26c7682213b8e6770ab82272f966dac35")
      );
      expect(tx.previousPublicKey).toEqual(
        hexToUint8Array("000161d6cd8da68207bd01198909c139c130a3df3a8bd20f4bacb123c46354ccd52c")
      );
      expect(verify(tx.previousSignature, tx.previousSignaturePayload(), tx.previousPublicKey)).toBeTruthy();
    });
  });

  // describe("originSignaturePayload", () => {
  //   it("should generate binary encoding of the transaction before signing", () => {
  //     const secret = "mysecret";
  //     const content =
  //       "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec sit amet leo egestas, lobortis lectus a, dignissim orci.";
  //     const code = `condition inherit: [
  //                           uco_transferred: 0.020
  //                         ]

  //                         actions triggered by: transaction do
  //                             set_type transfer
  //                             add_uco_ledger to: "000056E763190B28B4CF9AAF3324CF379F27DE9EF7850209FB59AA002D71BA09788A", amount: 0.020
  //                         end
  //     `;

  //     const tx = new TransactionBuilder("transfer")
  //       .addOwnership(secret, [
  //         {
  //           publicKey: "0001b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646",
  //           encryptedSecretKey: "00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88"
  //         },
  //         {
  //           publicKey: "0001a1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646",
  //           encryptedSecretKey: "00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88"
  //         }
  //       ])
  //       .addUCOTransfer("0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", parseBigInt("0.202"))
  //       .addTokenTransfer(
  //         "0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646",
  //         parseBigInt("100"),
  //         "0000501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88"
  //       )
  //       .setCode(code)
  //       .setContent(content)
  //       .addRecipient("0000501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88")
  //       .build("seed", 0, "P256");

  //     const transactionKeyPair = deriveKeyPair("seed", 0, Curve.P256);
  //     const previousSig = sign(tx.previousSignaturePayload(), transactionKeyPair.privateKey);

  //     const payload = tx.originSignaturePayload();
  //     const expected_binary = concatUint8Arrays(
  //       //Version
  //       intToUint32Array(VERSION),
  //       tx.address,
  //       Uint8Array.from([253]),
  //       //Code size
  //       intToUint32Array(code.length),
  //       new TextEncoder().encode(code),
  //       //Content size
  //       intToUint32Array(content.length),
  //       new TextEncoder().encode(content),
  //       // Nb of byte to encode nb of ownerships
  //       Uint8Array.from([1]),
  //       //Nb ownerships
  //       Uint8Array.from([1]),
  //       //Secret size
  //       intToUint32Array(secret.length),
  //       new TextEncoder().encode(secret),
  //       // Nb of byte to encode nb of authorized key
  //       Uint8Array.from([1]),
  //       // Nb of authorized keys
  //       Uint8Array.from([2]),
  //       // Authorized keys encoding
  //       concatUint8Arrays(
  //         hexToUint8Array("0001a1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"),
  //         hexToUint8Array("00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88"),
  //         hexToUint8Array("0001b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"),
  //         hexToUint8Array("00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88")
  //       ),
  //       // Nb of byte to encode nb of uco transfers
  //       Uint8Array.from([1]),
  //       // Nb of uco transfers
  //       Uint8Array.from([1]),
  //       concatUint8Arrays(
  //         hexToUint8Array("0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"),
  //         intToUint8Array(parseBigInt("0.202"))
  //       ),
  //       // Nb of byte to encode nb of Token transfers
  //       Uint8Array.from([1]),
  //       // Nb of Token transfers
  //       Uint8Array.from([1]),
  //       concatUint8Arrays(
  //         hexToUint8Array("0000501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88"),
  //         hexToUint8Array("0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"),
  //         intToUint8Array(parseBigInt("100")),
  //         Uint8Array.from([1]),
  //         Uint8Array.from([0])
  //       ),
  //       // Nb of byte to encode nb of recipients
  //       Uint8Array.from([1]),
  //       // Nb of recipients
  //       Uint8Array.from([1]),
  //       // 0 = unnamed recipient
  //       Uint8Array.from([0]),
  //       hexToUint8Array("0000501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88"),
  //       transactionKeyPair.publicKey,
  //       Uint8Array.from([previousSig.length]),
  //       previousSig
  //     );
  //     expect(payload).toStrictEqual(expected_binary);
  //   });
  // });

  describe("originSign", () => {
    it("should sign the transaction with a origin private key", () => {
      const originKeypair = deriveKeyPair("origin_seed", 0);

      const tx = new TransactionBuilder("transfer").build("seed", 0).originSign(originKeypair.privateKey);

      expect(verify(tx.originSignature, tx.originSignaturePayload(), originKeypair.publicKey)).toBeTruthy();
    });
  });

  describe("toWalletRPC", () => {
    it("should return a transaction object for RPC", () => {
      const tx = new TransactionBuilder("transfer")
        .addUCOTransfer("0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646", parseBigInt("0.2193"))
        .setContent("Hello world");

      const txRPC = tx.toWalletRPC();

      // @ts-ignore
      expect(txRPC.version).toStrictEqual(VERSION);
      // @ts-ignore
      expect(txRPC.data.ledger.uco.transfers[0]).toStrictEqual({
        to: "0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646",
        amount: parseBigInt("0.2193")
      });
      // @ts-ignore
      expect(txRPC.data.content).toStrictEqual("Hello world");
    });
  });

  describe("toNodeRPC", () => {
    it("should compress using zlib contract's code", async () => {
      const tx = new TransactionBuilder("code").setCode("0061736d01000000015e1160017f017f60067f7f7f7f7f7f0060037f7f7f");
      console.log(await tx.toNodeRPC());
    });
  });
});
