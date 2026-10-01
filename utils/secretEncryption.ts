import { createCipheriv, createDecipheriv, createSecretKey, KeyObject, randomBytes } from 'node:crypto';

const getKey = (): KeyObject => {
    const value = process.env.YOUTUBE_CREDENTIALS_ENCRYPTION_KEY?.trim();
    if (!value) throw new Error('YOUTUBE_CREDENTIALS_ENCRYPTION_KEY is required');
    const key = /^[0-9a-f]{64}$/i.test(value) ? Buffer.from(value, 'hex') : Buffer.from(value, 'base64');
    if (key.length !== 32) {
        throw new Error('YOUTUBE_CREDENTIALS_ENCRYPTION_KEY must be 32 bytes encoded as base64 or hex');
    }
    return createSecretKey(Uint8Array.from(key));
};

export const encryptSecret = (plaintext: string): string => {
    const iv = Uint8Array.from(randomBytes(12));
    const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
    const ciphertext = cipher.update(plaintext, 'utf8', 'hex') + cipher.final('hex');
    return [Buffer.from(iv).toString('base64url'), cipher.getAuthTag().toString('base64url'), ciphertext].join('.');
};

export const decryptSecret = (payload: string): string => {
    const [ivValue, tagValue, ciphertextValue, extra] = payload.split('.');
    if (!ivValue || !tagValue || !ciphertextValue || extra) throw new Error('Invalid encrypted secret');
    const decipher = createDecipheriv(
        'aes-256-gcm',
        getKey(),
        Uint8Array.from(Buffer.from(ivValue, 'base64url'))
    );
    decipher.setAuthTag(Uint8Array.from(Buffer.from(tagValue, 'base64url')));
    return decipher.update(ciphertextValue, 'hex', 'utf8') + decipher.final('utf8');
};
