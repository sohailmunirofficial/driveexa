import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { pbkdf2Async } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils.js";
import { Platform } from "react-native";

const PBKDF2_HASH_ALGORITHM = "pbkdf2-sha256";
const NATIVE_HASH_ALGORITHM = "hmac-sha256-peppered";
const LEGACY_NATIVE_HASH_ALGORITHM = "sha256-peppered";
const PASSWORD_HASH_VERSION = "1";
const PBKDF2_MIN_ITERATIONS = 10_000;
const PASSWORD_SALT_BYTES = 16;
const PASSWORD_KEY_BYTES = 32;
const SHA256_BLOCK_BYTES = 64;
const PASSWORD_PEPPER_BYTES = 32;
const PASSWORD_PEPPER_KEY = "drivexa.auth.passwordPepper";
const WEB_FALLBACK_PEPPER = "drivexa-web-local-password-pepper-v1";

type ParsedPbkdf2PasswordHash = {
  iterations: number;
  saltHex: string;
  hashHex: string;
};

type ParsedNativePasswordHash = {
  algorithm: string;
  saltHex: string;
  hashHex: string;
};

let cachedPepper: string | null = null;

async function canUseSecureStore(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

async function getPasswordPepper(): Promise<string> {
  if (cachedPepper) {
    return cachedPepper;
  }

  if (!(await canUseSecureStore())) {
    cachedPepper = WEB_FALLBACK_PEPPER;
    return cachedPepper;
  }

  const existingPepper = await SecureStore.getItemAsync(PASSWORD_PEPPER_KEY, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });

  if (existingPepper) {
    cachedPepper = existingPepper;
    return cachedPepper;
  }

  const pepper = bytesToHex(
    await Crypto.getRandomBytesAsync(PASSWORD_PEPPER_BYTES),
  );
  await SecureStore.setItemAsync(PASSWORD_PEPPER_KEY, pepper, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });

  cachedPepper = pepper;
  return pepper;
}

function parsePbkdf2PasswordHash(
  value: string,
): ParsedPbkdf2PasswordHash | null {
  const parts = value.split(":");
  if (
    parts.length !== 5 ||
    parts[0] !== PBKDF2_HASH_ALGORITHM ||
    parts[1] !== PASSWORD_HASH_VERSION
  ) {
    return null;
  }

  const iterations = Number(parts[2]);
  const saltHex = parts[3];
  const hashHex = parts[4];

  if (
    !Number.isSafeInteger(iterations) ||
    iterations < PBKDF2_MIN_ITERATIONS ||
    saltHex.length !== PASSWORD_SALT_BYTES * 2 ||
    hashHex.length !== PASSWORD_KEY_BYTES * 2
  ) {
    return null;
  }

  return { iterations, saltHex, hashHex };
}

function parseNativePasswordHash(
  value: string,
): ParsedNativePasswordHash | null {
  const parts = value.split(":");
  if (
    parts.length !== 4 ||
    ![NATIVE_HASH_ALGORITHM, LEGACY_NATIVE_HASH_ALGORITHM].includes(parts[0]) ||
    parts[1] !== PASSWORD_HASH_VERSION
  ) {
    return null;
  }

  const saltHex = parts[2];
  const hashHex = parts[3];

  if (
    saltHex.length !== PASSWORD_SALT_BYTES * 2 ||
    hashHex.length !== PASSWORD_KEY_BYTES * 2
  ) {
    return null;
  }

  return { algorithm: parts[0], saltHex, hashHex };
}

function timingSafeEqualHex(left: string, right: string): boolean {
  if (left.length !== right.length) return false;

  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return difference === 0;
}

async function derivePbkdf2PasswordHash(
  password: string,
  saltHex: string,
  iterations: number,
): Promise<string> {
  const derivedKey = await pbkdf2Async(
    sha256,
    utf8ToBytes(password),
    hexToBytes(saltHex),
    {
      c: iterations,
      dkLen: PASSWORD_KEY_BYTES,
      asyncTick: 10,
    },
  );

  return bytesToHex(derivedKey);
}

function toArrayBufferBytes(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  return copy;
}

function concatBytes(...chunks: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const byteLength = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const bytes = new Uint8Array(byteLength);
  let offset = 0;

  chunks.forEach((chunk) => {
    bytes.set(chunk, offset);
    offset += chunk.length;
  });

  return bytes;
}

async function sha256Digest(
  data: Uint8Array,
): Promise<Uint8Array<ArrayBuffer>> {
  const digest = await Crypto.digest(
    Crypto.CryptoDigestAlgorithm.SHA256,
    toArrayBufferBytes(data),
  );
  return new Uint8Array(digest);
}

async function hmacSha256Hex(keyHex: string, message: string): Promise<string> {
  let keyBytes = toArrayBufferBytes(hexToBytes(keyHex));

  if (keyBytes.length > SHA256_BLOCK_BYTES) {
    keyBytes = await sha256Digest(keyBytes);
  }

  const keyBlock = new Uint8Array(SHA256_BLOCK_BYTES);
  keyBlock.set(keyBytes);

  const innerPad = keyBlock.map((byte) => byte ^ 0x36);
  const outerPad = keyBlock.map((byte) => byte ^ 0x5c);
  const innerHash = await sha256Digest(
    concatBytes(innerPad, utf8ToBytes(message)),
  );
  const hmac = await sha256Digest(concatBytes(outerPad, innerHash));

  return bytesToHex(hmac);
}

async function deriveLegacyNativePasswordHash(
  password: string,
  saltHex: string,
): Promise<string> {
  const pepper = await getPasswordPepper();

  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${PASSWORD_HASH_VERSION}:${saltHex}:${pepper}:${password}`,
  );
}

async function deriveNativePasswordHash(
  password: string,
  saltHex: string,
): Promise<string> {
  const pepper = await getPasswordPepper();

  return hmacSha256Hex(
    pepper,
    `${PASSWORD_HASH_VERSION}:${saltHex}:${password}`,
  );
}

export function isPasswordHash(value: string | null | undefined): boolean {
  return (
    typeof value === "string" &&
    (parseNativePasswordHash(value) !== null ||
      parsePbkdf2PasswordHash(value) !== null)
  );
}

export function shouldRehashPassword(value: string): boolean {
  return parseNativePasswordHash(value)?.algorithm !== NATIVE_HASH_ALGORITHM;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await Crypto.getRandomBytesAsync(PASSWORD_SALT_BYTES);
  const saltHex = bytesToHex(salt);
  const hashHex = await deriveNativePasswordHash(password, saltHex);

  return [NATIVE_HASH_ALGORITHM, PASSWORD_HASH_VERSION, saltHex, hashHex].join(
    ":",
  );
}

export async function verifyPasswordHash(
  password: string,
  storedPassword: string,
): Promise<boolean> {
  const nativeHash = parseNativePasswordHash(storedPassword);
  if (nativeHash) {
    const candidateHash =
      nativeHash.algorithm === NATIVE_HASH_ALGORITHM
        ? await deriveNativePasswordHash(password, nativeHash.saltHex)
        : await deriveLegacyNativePasswordHash(password, nativeHash.saltHex);

    return timingSafeEqualHex(candidateHash, nativeHash.hashHex);
  }

  const pbkdf2Hash = parsePbkdf2PasswordHash(storedPassword);
  if (pbkdf2Hash) {
    const candidateHash = await derivePbkdf2PasswordHash(
      password,
      pbkdf2Hash.saltHex,
      pbkdf2Hash.iterations,
    );

    return timingSafeEqualHex(candidateHash, pbkdf2Hash.hashHex);
  }

  return storedPassword === password;
}
