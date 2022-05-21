export function shuffle<T>(source: T[]) {
    const copy = [...source];

    for (let currentIndex = copy.length - 1; currentIndex > 0; currentIndex--) {
        const randomIndex = Math.floor(Math.random() * (currentIndex + 1));
        [copy[currentIndex], copy[randomIndex]] = [copy[randomIndex], copy[currentIndex]];
    }

    return copy;
}
