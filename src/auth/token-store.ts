import z from "zod";
import { env } from "../config.js";
import { Token } from "./github.js";
import crypto from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { logger } from "../logger.js";
import { configError, err, ok, Result } from "../errors.js";

const tknFile = ".tokens/tokens.json";
export async function storeTkn(tkn: Token): Promise<void> {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", env.TOKEN_ENCRYPTION_KEY, iv);
    const encrypted = Buffer.concat([cipher.update(tkn, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const data = JSON.stringify({
        iv: iv.toString("base64"),
        authTag: authTag.toString("base64"),
        encrypted: encrypted.toString("base64"),
    });

    await writeFile(tknFile, data, "utf8");
}

export async function readTkn(): Promise<Result<Token>> {
    const tknFileSchema = z.object({
        iv: z.string(),
        authTag: z.string(),
        encrypted: z.string(),
    });
    const tknData = await readFile(tknFile, "utf8")
    const parsed = tknFileSchema.safeParse(JSON.parse(tknData));

    if (!parsed.success) {
        logger.error({ err: parsed.error }, "Could not read token file.")
        return err(configError(parsed.error.message))
    } else {
        const iv = Buffer.from(parsed.data.iv, "base64");
        const authTag = Buffer.from(parsed.data.authTag, "base64");
        const encrypted = Buffer.from(parsed.data.encrypted, "base64");

        const decipher = crypto.createDecipheriv("aes-256-gcm", env.TOKEN_ENCRYPTION_KEY, iv);
        decipher.setAuthTag(authTag);

        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final(),
        ]).toString("utf8");
        return ok(decrypted)
    }
}
