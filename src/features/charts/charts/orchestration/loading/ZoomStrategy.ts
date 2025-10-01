import type {LoadingStrategy} from "@charts/charts/orchestration/loading/LoadingStrategy.ts";

export class ZoomStrategy implements LoadingStrategy {
    determineTiles(params) {
        // Специфичная логика для zoom
        if (params.bucketChanged) {
            return this.loadNewLevel(params);
        }
        return this.loadVisibleGaps(params);
    }
}