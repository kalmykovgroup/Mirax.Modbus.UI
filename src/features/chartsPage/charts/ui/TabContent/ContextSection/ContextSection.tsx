import type {Guid} from "@app/lib/types/Guid.ts";
import {useSelector} from "react-redux";
import type {RootState} from "@/baseStore/store.ts";
import {selectTemplate} from "@chartsPage/charts/core/store/selectors/base.selectors.ts";
import styles from "./ContextSection.module.css";
import {RequestManagerProvider} from "@chartsPage/charts/orchestration/requests/RequestManagerProvider.tsx";
import {ChartContainer} from "@chartsPage/charts/ui/TabContent/ContextSection/ChartContainer/ChartContainer.tsx";

interface ContextSectionProps {
    readonly contextId: Guid;
}

export function ContextSection({ contextId }: ContextSectionProps) {
    const template = useSelector((state: RootState) => selectTemplate(state, contextId));
    const templateName = template?.name ?? `Контекст ${contextId.slice(0, 8)}`;

    return (
        <div className={styles.contextSection}>
            <div className={styles.contextHeader}>
                <h3 className={styles.contextTitle}>{templateName}</h3>
            </div>

            <div className={styles.contextContent}>
                <RequestManagerProvider contextId={contextId}>
                    <ChartContainer />
                </RequestManagerProvider>
            </div>
        </div>
    );
}