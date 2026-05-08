/**
 * Unit tests for AES-256-GCM credential encryption.
 *
 * Covers:
 * - Encrypt/decrypt round-trip
 * - IV uniqueness across calls
 * - Tamper detection (modified ciphertext, modified IV, wrong key)
 * - Edge cases (empty strings, special characters, Unicode)
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { encryptCredentials, decryptCredentials } from './credentials';
import { randomBytes } from 'crypto';

// Generate a stable test key (32 bytes = 64 hex chars)
const TEST_KEY = randomBytes(32).toString('hex');

beforeAll(() => {
  vi.stubEnv('MUNICIPAL_CRED_ENCRYPTION_KEY', TEST_KEY);
});

afterAll(() => {
  vi.unstubAllEnvs();
});

describe('encryptCredentials / decryptCredentials', () => {
  it('round-trips basic credentials', () => {
    const username = 'user@example.com';
    const password = 'p@ssw0rd!123';

    const { ciphertext, iv } = encryptCredentials(username, password);
    const result = decryptCredentials(ciphertext, iv);

    expect(result.username).toBe(username);
    expect(result.password).toBe(password);
  });

  it('round-trips credentials with special characters', () => {
    const username = 'test+user@muni.gov.za';
    const password = 'P@$$w0rd!#%^&*()_+{}|:"<>?';

    const { ciphertext, iv } = encryptCredentials(username, password);
    const result = decryptCredentials(ciphertext, iv);

    expect(result.username).toBe(username);
    expect(result.password).toBe(password);
  });

  it('round-trips credentials with Unicode characters', () => {
    const username = 'ùser@example.com';
    const password = 'пароль123';

    const { ciphertext, iv } = encryptCredentials(username, password);
    const result = decryptCredentials(ciphertext, iv);

    expect(result.username).toBe(username);
    expect(result.password).toBe(password);
  });

  it('round-trips empty strings', () => {
    const { ciphertext, iv } = encryptCredentials('', '');
    const result = decryptCredentials(ciphertext, iv);

    expect(result.username).toBe('');
    expect(result.password).toBe('');
  });

  it('produces unique IVs across multiple calls', () => {
    const ivs = new Set<string>();

    for (let i = 0; i < 100; i++) {
      const { iv } = encryptCredentials('user', 'pass');
      ivs.add(iv);
    }

    // All 100 IVs should be unique (collision probability is negligible)
    expect(ivs.size).toBe(100);
  });

  it('produces different ciphertexts for same input (due to random IV)', () => {
    const a = encryptCredentials('user', 'pass');
    const b = encryptCredentials('user', 'pass');

    expect(a.ciphertext).not.toBe(b.ciphertext);
    expect(a.iv).not.toBe(b.iv);
  });
});

describe('tamper detection', () => {
  it('fails on tampered ciphertext', () => {
    const { ciphertext, iv } = encryptCredentials('user', 'pass');

    // Flip a byte in the middle of the ciphertext
    const bytes = Buffer.from(ciphertext, 'hex');
    bytes[Math.floor(bytes.length / 2)] ^= 0xff;
    const tampered = bytes.toString('hex');

    expect(() => decryptCredentials(tampered, iv)).toThrow();
  });

  it('fails on tampered IV', () => {
    const { ciphertext, iv } = encryptCredentials('user', 'pass');

    // Flip a byte in the IV
    const ivBytes = Buffer.from(iv, 'hex');
    ivBytes[0] ^= 0xff;
    const tamperedIv = ivBytes.toString('hex');

    expect(() => decryptCredentials(ciphertext, tamperedIv)).toThrow();
  });

  it('fails with wrong encryption key', () => {
    const { ciphertext, iv } = encryptCredentials('user', 'pass');

    // Swap to a different key for decryption
    const wrongKey = randomBytes(32).toString('hex');
    vi.stubEnv('MUNICIPAL_CRED_ENCRYPTION_KEY', wrongKey);

    expect(() => decryptCredentials(ciphertext, iv)).toThrow();

    // Restore correct key
    vi.stubEnv('MUNICIPAL_CRED_ENCRYPTION_KEY', TEST_KEY);
  });

  it('fails on truncated ciphertext', () => {
    const { ciphertext, iv } = encryptCredentials('user', 'pass');

    // Truncate to half length
    const truncated = ciphertext.substring(0, ciphertext.length / 2);

    expect(() => decryptCredentials(truncated, iv)).toThrow();
  });
});

describe('key validation', () => {
  it('throws when key env var is missing', () => {
    vi.stubEnv('MUNICIPAL_CRED_ENCRYPTION_KEY', '');

    expect(() => encryptCredentials('user', 'pass')).toThrow('MUNICIPAL_CRED_ENCRYPTION_KEY');

    vi.stubEnv('MUNICIPAL_CRED_ENCRYPTION_KEY', TEST_KEY);
  });

  it('throws when key is wrong length', () => {
    vi.stubEnv('MUNICIPAL_CRED_ENCRYPTION_KEY', 'abcdef1234');

    expect(() => encryptCredentials('user', 'pass')).toThrow('64 hex characters');

    vi.stubEnv('MUNICIPAL_CRED_ENCRYPTION_KEY', TEST_KEY);
  });
});
