// orchestration/loading/PanStrategy.ts
import type {LoadingStrategy} from "@charts/charts/orchestration/loading/LoadingStrategy.ts";

export class PanStrategy implements LoadingStrategy {
    determineTiles(params) {
        // Логика из determineTilesForPan
        const direction = this.detectDirection(params);
        const gaps = this.findGaps(params);
        const prefetch = this.calculatePrefetch(direction);
        return [...gaps, ...prefetch];
    }
}
