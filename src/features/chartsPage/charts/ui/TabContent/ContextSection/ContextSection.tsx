import type {Guid} from "@app/lib/types/Guid.ts";
import {RequestManagerProvider} from "@chartsPage/charts/orchestration/requests/RequestManagerProvider.tsx";
import {ChartContainer} from "@chartsPage/charts/ui/TabContent/ContextSection/ChartContainer/ChartContainer.tsx";

interface ContextSectionProps {
    readonly contextId: Guid;
}

export function ContextSection({ contextId }: ContextSectionProps) {
    return (
        <RequestManagerProvider contextId={contextId}>
                <ChartContainer />
        </RequestManagerProvider>
    );
}