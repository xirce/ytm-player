const requiredProductionVariables = [
    'APP_BASE_URL',
    'DATABASE_URL',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'METRICS_TOKEN',
    'YOUTUBE_CREDENTIALS_ENCRYPTION_KEY',
    'YOUTUBE_PO_TOKEN_PROVIDER_URL'
] as const;

export const validateProductionConfig = (): void => {
    const port = Number(process.env.PORT || 3001);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 to 65535');
    if (process.env.NODE_ENV !== 'production') return;

    const missing = requiredProductionVariables.filter(name => !process.env[name]?.trim());
    if (missing.length) throw new Error(`Missing production environment variables: ${missing.join(', ')}`);

    const appBaseUrl = new URL(process.env.APP_BASE_URL!);
    if (appBaseUrl.protocol !== 'https:') throw new Error('APP_BASE_URL must use https in production');
    if (appBaseUrl.pathname !== '/' || appBaseUrl.search || appBaseUrl.hash) {
        throw new Error('APP_BASE_URL must contain only the public origin');
    }
    if ((process.env.METRICS_TOKEN?.trim().length ?? 0) < 32) {
        throw new Error('METRICS_TOKEN must contain at least 32 characters');
    }
    const encryptionKey = process.env.YOUTUBE_CREDENTIALS_ENCRYPTION_KEY!.trim();
    const encryptionKeyBytes = /^[0-9a-f]{64}$/i.test(encryptionKey)
        ? Buffer.from(encryptionKey, 'hex')
        : Buffer.from(encryptionKey, 'base64');
    if (encryptionKeyBytes.length !== 32) {
        throw new Error('YOUTUBE_CREDENTIALS_ENCRYPTION_KEY must encode exactly 32 bytes');
    }
};
