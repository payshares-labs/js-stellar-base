/* eslint-disable no-bitwise */

import base32 from 'base32.js';
import crc from 'crc';
import isUndefined from 'lodash/isUndefined';
import isNull from 'lodash/isNull';
import isString from 'lodash/isString';
import { verifyChecksum } from './util/checksum';

const versionBytes = {
  ed25519PublicKey: 6 << 3, // G
  ed25519SecretSeed: 18 << 3, // S
  preAuthTx: 19 << 3, // T
  sha256Hash: 23 << 3 // X
};

/**
 * StrKey is a helper class that allows encoding and decoding strkey.
 */
export class StrKey {
  /**
   * Encodes data to strkey ed25519 public key.
   * @param {Buffer} data data to encode
   * @returns {string}
   */
  static encodeEd25519PublicKey(data: Buffer): string {
    return encodeCheck('ed25519PublicKey', data);
  }

  /**
   * Decodes strkey ed25519 public key to raw data.
   * @param {string} data data to decode
   * @returns {Buffer}
   */
  static decodeEd25519PublicKey(data: string): Buffer {
    return decodeCheck('ed25519PublicKey', data);
  }

  /**
   * Returns true if the given Stellar public key is a valid ed25519 public key.
   * @param {string} publicKey public key to check
   * @returns {boolean}
   */
  static isValidEd25519PublicKey(publicKey: string): boolean {
    return isValid('ed25519PublicKey', publicKey);
  }

  /**
   * Encodes data to strkey ed25519 seed.
   * @param {Buffer} data data to encode
   * @returns {string}
   */
  static encodeEd25519SecretSeed(data: Buffer): string {
    return encodeCheck('ed25519SecretSeed', data);
  }

  /**
   * Decodes strkey ed25519 seed to raw data.
   * @param {string} data data to decode
   * @returns {Buffer}
   */
  static decodeEd25519SecretSeed(data: string): Buffer {
    return decodeCheck('ed25519SecretSeed', data);
  }

  /**
   * Returns true if the given Stellar secret key is a valid ed25519 secret seed.
   * @param {string} seed seed to check
   * @returns {boolean}
   */
  static isValidEd25519SecretSeed(seed: string): boolean {
    return isValid('ed25519SecretSeed', seed);
  }

  /**
   * Encodes data to strkey preAuthTx.
   * @param {Buffer} data data to encode
   * @returns {string}
   */
  static encodePreAuthTx(data: Buffer): string {
    return encodeCheck('preAuthTx', data);
  }

  /**
   * Decodes strkey PreAuthTx to raw data.
   * @param {string} data data to decode
   * @returns {Buffer}
   */
  static decodePreAuthTx(data: string): Buffer {
    return decodeCheck('preAuthTx', data);
  }

  /**
   * Encodes data to strkey sha256 hash.
   * @param {Buffer} data data to encode
   * @returns {string}
   */
  static encodeSha256Hash(data: Buffer): string {
    return encodeCheck('sha256Hash', data);
  }

  /**
   * Decodes strkey sha256 hash to raw data.
   * @param {string} data data to decode
   * @returns {Buffer}
   */
  static decodeSha256Hash(data: string): Buffer {
    return decodeCheck('sha256Hash', data);
  }
}

function isValid(versionByteName: string, encoded: string) {
  if (encoded && encoded.length !== 56) {
    return false;
  }

  try {
    const decoded = decodeCheck(versionByteName, encoded);
    if (decoded.length !== 32) {
      return false;
    }
  } catch (err) {
    return false;
  }
  return true;
}

export function decodeCheck(versionByteName: string, encoded: string) {
  if (!isString(encoded)) {
    throw new TypeError('encoded argument must be of type String');
  }

  const decoded = base32.decode(encoded);
  const versionByte = decoded[0];
  const payload = decoded.slice(0, -2);
  const data = payload.slice(1);
  const checksum = decoded.slice(-2);

  if (encoded !== base32.encode(decoded)) {
    throw new Error('invalid encoded string');
  }

  const expectedVersion = versionBytes[versionByteName];

  if (isUndefined(expectedVersion)) {
    throw new Error(
      `${versionByteName} is not a valid version byte name.  expected one of "accountId" or "seed"`
    );
  }

  if (versionByte !== expectedVersion) {
    throw new Error(
      `invalid version byte. expected ${expectedVersion}, got ${versionByte}`
    );
  }

  const expectedChecksum = calculateChecksum(payload);

  if (!verifyChecksum(expectedChecksum, checksum)) {
    throw new Error(`invalid checksum`);
  }

  return Buffer.from(data);
}

export function encodeCheck(versionByteName: string, data: Buffer) {
  if (isNull(data) || isUndefined(data)) {
    throw new Error('cannot encode null data');
  }

  const versionByte = versionBytes[versionByteName];

  if (isUndefined(versionByte)) {
    throw new Error(
      `${versionByteName} is not a valid version byte name.  expected one of "ed25519PublicKey", "ed25519SecretSeed", "preAuthTx", "sha256Hash"`
    );
  }

  data = Buffer.from(data);
  const versionBuffer = Buffer.from([versionByte]);
  const payload = Buffer.concat([versionBuffer, data]);
  const checksum = calculateChecksum(payload);
  const unencoded = Buffer.concat([payload, checksum]);

  return base32.encode(unencoded);
}

function calculateChecksum(payload: string | Buffer): Buffer {
  // This code calculates CRC16-XModem checksum of payload
  // and returns it as Buffer in little-endian order.
  const checksum = Buffer.alloc(2);
  checksum.writeUInt16LE(crc.crc16xmodem(payload), 0);
  return checksum;
}
