export interface IChain<T> {
    value: T;
    next?: IChain<T>;
}

export const toArray = <T>(source: IChain<T>) => {
    const result = [];
    let current: IChain<T> | undefined = source;

    while (current) {
        result.push(current.value);
        current = current.next;
    }

    return result;
}
