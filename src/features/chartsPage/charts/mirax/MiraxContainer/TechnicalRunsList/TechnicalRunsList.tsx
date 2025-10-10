// src/features/mirax/components/TechnicalRunsList.tsx
import type { TechnicalRunDto } from '@chartsPage/charts/mirax/contracts/TechnicalRunDto';

import styles from './TechnicalRunsList.module.css';
import type {JSX} from "react";
import {
    TechnicalRunItem
} from "@chartsPage/charts/mirax/MiraxContainer/TechnicalRunsList/TechnicalRunItem/TechnicalRunItem.tsx";

interface Props {
    readonly runs: readonly TechnicalRunDto[];
}

export function TechnicalRunsList({ runs }: Props): JSX.Element {
    return (
        <ul className={styles.list}>
            {runs.map((run) => (
                <TechnicalRunItem key={run.id} run={run} />
            ))}
        </ul>
    );
}