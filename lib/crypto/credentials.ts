/**
 * AES-256-GCM encryption/decryption for municipal portal credentials.
 *
 * Key: MUNICIPAL_CRED_ENCRYPTION_KEY env var (32-byte hex = 64 hex chars).
 * IV: Random 12 bytes per encryption, stored alongside ciphertext.
 * Format: Credentials serialised as single JSON blob {"username":"...","password":"..."}
 *         to eliminate IV reuse risk (one logical unit = one encryption).
 * Auth tag: Appended to ciphertext (16 bytes), verified on decryption.
 *
 * NEVER log plaintext credentials. NEVER return decrypted values in API responses.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;       // 96-bit IV recommended for GCM
const AUTH_TAG_LENGTH = 16;  // 128-bit auth tag

/**
 * Loads the encryption key from environment. Throws if missing or invalid.
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.MUNICIPAL_CRED_ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error('[credentials] MUNICIPAL_CRED_ENCRYPTION_KEY is not set');
  }
  if (keyHex.length !== 64) {
    throw new Error('[credentials] MUNICIPAL_CRED_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }
  return Buffer.from(keyHex, 'hex');
}

/**
 * Encrypts municipal portal credentials using AES-256-GCM.
 *
 * @returns Object with hex-encoded ciphertext (includes appended auth tag) and IV.
 */
export function encryptCredentials(
  username: string,
  password: string
): { ciphertext: string; iv: string } {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const plaintext = JSON.stringify({ username, password });

  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Ciphertext = encrypted data + auth tag (appended)
  const ciphertextWithTag = Buffer.concat([encrypted, authTag]);

  return {
    ciphertext: ciphertextWithTag.toString('hex'),
    iv: iv.toString('hex'),
  };
}

/**
 * Decrypts municipal portal credentials from AES-256-GCM ciphertext.
 *
 * @throws Error if ciphertext has been tampered with or key is wrong.
 */
export function decryptCredentials(
  ciphertextHex: string,
  ivHex: string
): { username: string; password: string } {
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const ciphertextWithTag = Buffer.from(ciphertextHex, 'hex');

  // Split ciphertext and auth tag
  const encrypted = ciphertextWithTag.subarray(0, ciphertextWithTag.length - AUTH_TAG_LENGTH);
  const authTag = ciphertextWithTag.subarray(ciphertextWithTag.length - AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  const parsed = JSON.parse(decrypted.toString('utf8'));

  if (typeof parsed.username !== 'string' || typeof parsed.password !== 'string') {
    throw new Error('[credentials] Decrypted payload has invalid structure');
  }

  return { username: parsed.username, password: parsed.password };
}
