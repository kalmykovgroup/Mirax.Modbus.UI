// orchestration/loading/LoadingStrategy.ts
export interface LoadingStrategy {
    shouldLoad(coverage: CoverageInfo): boolean;
    determineTiles(params: LoadParams): TileToLoad[];
    prioritizeTiles(tiles: TileToLoad[]): TileToLoad[];
}