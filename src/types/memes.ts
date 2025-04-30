const memeQueries = [
    'Default',
    'Trending',
    'Trending (German)',
    'Best', 'Best (German)',
    'Rocket League',
    'Recent',
    'Custom'] as const;

export type MemeQuery = (typeof memeQueries)[number];

export function getMemeQueries(): readonly MemeQuery[] {
    return memeQueries;
}
