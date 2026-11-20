function withTimestamp(message: unknown, args: unknown[]): [string, ...unknown[]] {
    const timestamp = `[${new Date().toISOString()}]`;
    return typeof message === 'string'
        ? [`${timestamp} ${message}`, ...args]
        : [timestamp, message, ...args];
}

export const logger = {
    log(message: unknown, ...args: unknown[]): void {
        console.log(...withTimestamp(message, args));
    },
    warn(message: unknown, ...args: unknown[]): void {
        console.warn(...withTimestamp(message, args));
    },
    error(message: unknown, ...args: unknown[]): void {
        console.error(...withTimestamp(message, args));
    }
};
