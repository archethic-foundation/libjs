import TransactionBuilder from "../src/transaction_builder";
import {deriveAddress, deriveKeyPair, sign, verify} from "../src/crypto"
import {
    bigIntToUint8Array,
    concatUint8Arrays,
    hexToUint8Array,
    intToUint8Array,
    toBigInt,
    uint8ArrayToHex,
} from "../src/utils";
import {Curve} from "../src/types";

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
            const tx = new TransactionBuilder("transfer").setCode(
                "my smart contract code"
            );
            expect(new TextDecoder().decode(tx.data.code)).toBe("my smart contract code"); });
    });

    describe("setContent", () => {
        it("should insert the content into the transaction data", () => {
            const tx = new TransactionBuilder("transfer").setContent(
                "my super content"
            );
            expect(tx.data.content).toStrictEqual(new TextEncoder().encode("my super content"));
        });
    });

    describe("addOwnership", () => {
        it("should add an ownership with a secret and its authorized keys into the transaction data", () => {
            const tx = new TransactionBuilder("transfer").addOwnership(
                "00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88",
                [
                    {
                        publicKey:
                            "0001b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646",
                        encryptedSecretKey:
                            "00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88",
                    },
                    {
                        publicKey:
                            "0001b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646",
                        encryptedSecretKey:
                            "00601fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88",
                    },
                ]
            );

            expect(tx.data.ownerships[0].secret).toStrictEqual(hexToUint8Array(
                "00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88"
            ));
            expect(tx.data.ownerships[0].authorizedPublicKeys).toStrictEqual([
                {
                    publicKey: hexToUint8Array(
                        "0001b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"
                    ),
                    encryptedSecretKey: hexToUint8Array(
                        "00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88"
                    )
                }
            ]);
        });
    });

    describe("addUCOTransfer", () => {
        it("should add an uco transfer to the transaction data", () => {
            const tx = new TransactionBuilder("transfer").addUCOTransfer(
                "0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646",
                toBigInt(10.03)
            );

            expect(tx.data.ledger.uco.transfers.length).toBe(1);
            expect(tx.data.ledger.uco.transfers[0].to).toStrictEqual(hexToUint8Array(
                "0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"
            ))
            expect(tx.data.ledger.uco.transfers[0].amount).toStrictEqual(toBigInt(10.03));
        });
    });

    describe("addTokenTransfer", () => {
        it("should add an token transfer to the transaction data", () => {
            const tx = new TransactionBuilder("transfer").addTokenTransfer(
                "0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646",
                toBigInt(10.03),
                "0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"
            );

            expect(tx.data.ledger.token.transfers.length).toBe(1);
            expect(tx.data.ledger.token.transfers[0].to).toStrictEqual(hexToUint8Array(
                "0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"
            ));
            expect(tx.data.ledger.token.transfers[0].amount).toStrictEqual(toBigInt(10.03));
            expect(tx.data.ledger.token.transfers[0].tokenAddress).toStrictEqual(hexToUint8Array(
                "0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"
            ));
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
                        publicKey:
                            "0001b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646",
                        encryptedSecretKey:
                            "00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88",
                    },
                ])
                .addUCOTransfer(
                    "0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646",
                    toBigInt(0.202)
                )
                .addTokenTransfer(
                    "0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646",
                    toBigInt(100),
                    "0000501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88"
                )
                .setCode(code)
                .setContent(content)
                .addRecipient(
                    "0000501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88"
                );

            const keypair = deriveKeyPair("seed", 0);

            tx.address = deriveAddress("seed", 1);
            tx.previousPublicKey = keypair.publicKey;

            const payload = tx.previousSignaturePayload();

            const expected_binary = concatUint8Arrays(
                //Version
                intToUint8Array(1),
                tx.address,
                Uint8Array.from([253]),
                //Code size
                intToUint8Array(code.length),
                new TextEncoder().encode(code),
                //Content size
                intToUint8Array(content.length),
                new TextEncoder().encode(content),
                // Nb of byte to encode nb of ownerships
                Uint8Array.from([1]),
                //Nb of ownerships
                Uint8Array.from([1]),
                //Secret size
                intToUint8Array(secret.length),
                new TextEncoder().encode(secret),
                // Nb of byte to encode nb of authorized keys
                Uint8Array.from([1]),
                // Nb of authorized keys
                Uint8Array.from([1]),
                // Authorized keys encoding
                concatUint8Arrays(
                    hexToUint8Array(
                        "0001b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"
                    ),
                    hexToUint8Array(
                        "00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88"
                    ),
                ),
                // Nb of byte to encode nb of uco transfers
                Uint8Array.from([1]),
                // Nb of uco transfers
                Uint8Array.from([1]),
                concatUint8Arrays(
                    hexToUint8Array(
                        "0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"
                    ),
                    bigIntToUint8Array(toBigInt(0.202)),
                ),
                // Nb of byte to encode nb of Token transfers
                Uint8Array.from([1]),
                // Nb of Token transfers
                Uint8Array.from([1]),
                concatUint8Arrays(
                    hexToUint8Array(
                        "0000501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88"
                    ),
                    hexToUint8Array(
                        "0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"
                    ),
                    bigIntToUint8Array(toBigInt(100)),
                    Uint8Array.from([1]),
                    Uint8Array.from([0]),
                ),
                // Nb of byte to encode nb of recipients
                Uint8Array.from([1]),
                // Nb of recipients
                Uint8Array.from([1]),
                hexToUint8Array(
                    "0000501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88"
                ),
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

            const tx = new TransactionBuilder(
                "transfer"
            ).setPreviousSignatureAndPreviousPublicKey(
                exampleSignature,
                examplePublicKey
            );

            expect(Buffer.from(tx.previousPublicKey).toString("hex")).toEqual(examplePublicKey);
            expect(Buffer.from(tx.previousSignature).toString("hex")).toEqual(exampleSignature);
        });
    });

    describe("setAddress", () => {
        it("should set this.address in transaction builder", () => {
            const exampleAddress =
                "0000501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88";

            const tx = new TransactionBuilder("transfer").setAddress(exampleAddress);

            expect(tx.address).toEqual(hexToUint8Array(exampleAddress));
        });
    });

    describe("build", () => {
        it("should build the transaction and the related signature", () => {
            const tx = new TransactionBuilder("transfer")
                .addUCOTransfer(
                    "0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646",
                    10.0
                )
                .build("seed", 0, "ed25519", "sha256");

            expect(tx.address).toEqual(
                hexToUint8Array(
                    "00001ff1733caa91336976ee7cef5aff6bb26c7682213b8e6770ab82272f966dac35"
                )
            );
            expect(tx.previousPublicKey).toEqual(
                hexToUint8Array(
                    "000161d6cd8da68207bd01198909c139c130a3df3a8bd20f4bacb123c46354ccd52c"
                )
            );
            expect(
                verify(
                    tx.previousSignature,
                    tx.previousSignaturePayload(),
                    tx.previousPublicKey
                )
            ).toBeTruthy();

        });
    });

    describe("originSignaturePayload", () => {
        it("should generate binary encoding of the transaction before signing", () => {
            const secret = "mysecret";
            const content =
                "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec sit amet leo egestas, lobortis lectus a, dignissim orci.";
            const code = `condition inherit: [
                            uco_transferred: 0.020
                          ]

                          actions triggered by: transaction do
                              set_type transfer
                              add_uco_ledger to: "000056E763190B28B4CF9AAF3324CF379F27DE9EF7850209FB59AA002D71BA09788A", amount: 0.020
                          end
      `;

            const tx = new TransactionBuilder("transfer")
                .addOwnership(secret, [
                    {
                        publicKey:
                            "0001b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646",
                        encryptedSecretKey:
                            "00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88",
                    },
                    {
                        publicKey:
                            "0001a1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646",
                        encryptedSecretKey:
                            "00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88",
                    },
                ])
                .addUCOTransfer(
                    "0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646",
                    toBigInt(0.202)
                )
                .addTokenTransfer(
                    "0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646",
                    toBigInt(100),
                    "0000501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88"
                )
                .setCode(code)
                .setContent(content)
                .addRecipient(
                    "0000501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88"
                )
                .build("seed", 0, "P256");

            const transactionKeyPair = deriveKeyPair("seed", 0, Curve.P256);
            const previousSig = sign(
                tx.previousSignaturePayload(),
                transactionKeyPair.privateKey
            );

            const payload = tx.originSignaturePayload();
            const expected_binary = concatUint8Arrays(
                //Version
                intToUint8Array(1),
                tx.address,
                Uint8Array.from([253]),
                //Code size
                intToUint8Array(code.length),
                new TextEncoder().encode(code),
                //Content size
                intToUint8Array(content.length),
                new TextEncoder().encode(content),
                // Nb of byte to encode nb of ownerships
                Uint8Array.from([1]),
                //Nb ownerships
                Uint8Array.from([1]),
                //Secret size
                intToUint8Array(secret.length),
                new TextEncoder().encode(secret),
                // Nb of byte to encode nb of authorized key
                Uint8Array.from([1]),
                // Nb of authorized keys
                Uint8Array.from([2]),
                // Authorized keys encoding
                concatUint8Arrays(
                    hexToUint8Array(
                        "0001a1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"
                    ),
                    hexToUint8Array(
                        "00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88"
                    ),
                    hexToUint8Array(
                        "0001b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"
                    ),
                    hexToUint8Array(
                        "00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88"
                    ),
                ),
                // Nb of byte to encode nb of uco transfers
                Uint8Array.from([1]),
                // Nb of uco transfers
                Uint8Array.from([1]),
                concatUint8Arrays(
                    hexToUint8Array(
                        "0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"
                    ),
                    bigIntToUint8Array(toBigInt(0.202)),
                ),
                // Nb of byte to encode nb of Token transfers
                Uint8Array.from([1]),
                // Nb of Token transfers
                Uint8Array.from([1]),
                concatUint8Arrays(
                    hexToUint8Array(
                        "0000501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88"
                    ),
                    hexToUint8Array(
                        "0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646"
                    ),
                    bigIntToUint8Array(toBigInt(100)),
                    Uint8Array.from([1]),
                    Uint8Array.from([0]),
                ),
                // Nb of byte to encode nb of recipients
                Uint8Array.from([1]),
                // Nb of recipients
                Uint8Array.from([1]),
                hexToUint8Array(
                    "0000501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88"
                ),
                transactionKeyPair.publicKey,
                Uint8Array.from([previousSig.length]),
                previousSig,
            );
            expect(payload).toStrictEqual(expected_binary);
        });
    });

    describe("originSign", () => {
        it("should sign the transaction with a origin private key", () => {
            const originKeypair = deriveKeyPair("origin_seed", 0);

            const tx = new TransactionBuilder("transfer")
                .build("seed", 0)
                .originSign(originKeypair.privateKey);

            expect(
                verify(
                    tx.originSignature,
                    tx.originSignaturePayload(),
                    originKeypair.publicKey
                )
            ).toBeTruthy();

        });
    });

    describe("toJSON", () => {
        it("should return a JSON from the transaction", () => {
            const originKeypair = deriveKeyPair("origin_seed", 0);
            const transactionKeyPair = deriveKeyPair("seed", 0);

            const tx = new TransactionBuilder("transfer")
                .addUCOTransfer(
                    "0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646",
                    toBigInt(0.2193)
                )
                .addOwnership(Uint8Array.from([0, 1, 2, 3, 4]), [
                    {
                        publicKey:
                            "0001b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646",
                        encryptedSecretKey:
                            "00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88",
                    },
                ])
                .build("seed", 0)
                .originSign(originKeypair.privateKey);

            const parsedTx = JSON.parse(tx.toJSON());

            const previousSig = sign(
                tx.previousSignaturePayload(),
                transactionKeyPair.privateKey
            );
            const originSig = sign(
                tx.originSignaturePayload(),
                originKeypair.privateKey
            );

            expect(parsedTx.address).toStrictEqual(uint8ArrayToHex(deriveAddress("seed", 1)));
            expect(parsedTx.type).toStrictEqual("transfer");
            expect(parsedTx.previousPublicKey).toStrictEqual(uint8ArrayToHex(transactionKeyPair.publicKey));
            expect(parsedTx.previousSignature).toStrictEqual(uint8ArrayToHex(previousSig));
            expect(parsedTx.originSignature).toStrictEqual(uint8ArrayToHex(originSig));
            expect(parsedTx.data.ownerships[0].secret).toStrictEqual(uint8ArrayToHex(Uint8Array.from([0, 1, 2, 3, 4])));
            expect(parsedTx.data.ledger.uco.transfers[0]).toStrictEqual(
                {
                    to: "0000b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646",
                    amount: toBigInt(0.2193),
                }
            );
            expect(parsedTx.data.ownerships[0].authorizedKeys).toStrictEqual([
                {
                    publicKey: "0001b1d3750edb9381c96b1a975a55b5b4e4fb37bfab104c10b0b6c9a00433ec4646",
                    encryptedSecretKey:
                        "00501fa2db78bcf8ceca129e6139d7e38bf0d61eb905441056b9ebe6f1d1feaf88",
                }
            ])

        });
    });
});
