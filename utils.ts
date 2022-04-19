export function measure(func: any): any {
    return async function (...args: any[]) {
        const startTime = Date.now();
        const result = await func(...args);
        console.log(`[took ${(Date.now() - startTime) / 1000}s]`);
        return result;
    }
}