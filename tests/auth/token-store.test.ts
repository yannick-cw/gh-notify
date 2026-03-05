import fc from "fast-check";
import { writeFile } from "fs/promises";
import { describe, expect, it } from "vitest";
import { readTkn, storeTkn } from "../../src/auth/token-store.js";
import { ok } from "../../src/errors.js";

const testfile = "tests/auth/test-tokens.json";
const brokenFile = "tests/auth/broken-tokens.json";
describe("Token Store test", () => {
    describe("roundtrip", () => {
        it("stores and reads any token", async () => {
            await fc.assert(
                fc.asyncProperty(fc.string(), async (tkn) => {
                    await storeTkn(tkn, testfile);
                    const readToken = await readTkn(testfile);
                    expect(readToken).toEqual(ok(tkn));
                }),
            );
        });
    });
    describe("fails reading invalid", () => {
        it("stores and reads any token", async () => {
            await fc.assert(
                fc.asyncProperty(fc.json(), async (brokenJson) => {
                    await writeFile(brokenFile, JSON.stringify(brokenJson), "utf8");
                    const readToken = await readTkn(brokenFile);
                    expect(readToken).toMatchObject({ ok: false, error: { kind: "ConfigError" } });
                }),
                { numRuns: 10 },
            );
        });
    });
});
