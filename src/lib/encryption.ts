import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // Standard 96-bit IV recommended by NIST for GCM
const TAG_LENGTH = 16;
const CURRENT_KEY_VERSION = 1; // Key rotation version byte

// Derive master encryption key once at startup using HKDF with fixed domain salt
let cachedKey: Buffer | null = null;

function getMasterKey(): Buffer {
  if (cachedKey) return cachedKey;

  const rawKey = process.env.ENCRYPTION_KEY;
  if (!rawKey) {
    if (process.env.NODE_ENV === "test") {
      // Safe fallback for test runners
      const testSalt = Buffer.from("lifehub-master-salt-v1");
      cachedKey = crypto.scryptSync("test-key-32-characters-long-12345678", testSalt, 32);
      return cachedKey;
    }
    throw new Error("ENCRYPTION_KEY environment variable is not configured");
  }

  const salt = Buffer.from("lifehub-master-domain-salt-v1");
  cachedKey = crypto.scryptSync(rawKey, salt, 32);
  return cachedKey;
}

/**
 * Encrypts sensitive text using AES-256-GCM.
 * Packed format: [ KeyVersion (1 Byte) | IV (12 Bytes) | AuthTag (16 Bytes) | Ciphertext ]
 * Optional AAD (Additional Authenticated Data) binds ciphertext to a specific record (e.g. userId or transactionId).
 */
export function encrypt(text: string, aad?: string): string {
  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  if (aad) {
    cipher.setAAD(Buffer.from(aad, "utf8"));
  }

  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const versionHeader = Buffer.from([CURRENT_KEY_VERSION]);

  return Buffer.concat([versionHeader, iv, tag, encrypted]).toString("base64");
}

/**
 * Decrypts AES-256-GCM encrypted data with version header and optional AAD binding.
 * Also supports legacy format (64-byte salt prefix) for backward compatibility.
 */
export function decrypt(data: string, aad?: string): string {
  const buffer = Buffer.from(data, "base64");

  // Check if buffer starts with current key version byte
  const version = buffer[0];

  if (version === CURRENT_KEY_VERSION) {
    const key = getMasterKey();
    const iv = buffer.subarray(1, 1 + IV_LENGTH);
    const tag = buffer.subarray(1 + IV_LENGTH, 1 + IV_LENGTH + TAG_LENGTH);
    const encrypted = buffer.subarray(1 + IV_LENGTH + TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    if (aad) {
      decipher.setAAD(Buffer.from(aad, "utf8"));
    }

    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  }

  // Fallback: Legacy format [ Salt (64B) | IV (16B) | Tag (16B) | Encrypted ]
  const rawKey = process.env.ENCRYPTION_KEY || "test-key-32-characters-long-12345678";
  const salt = buffer.subarray(0, 64);
  const iv = buffer.subarray(64, 80);
  const tag = buffer.subarray(80, 96);
  const encrypted = buffer.subarray(96);

  const legacyKey = crypto.scryptSync(rawKey, salt, 32);
  const decipher = crypto.createDecipheriv(ALGORITHM, legacyKey, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
