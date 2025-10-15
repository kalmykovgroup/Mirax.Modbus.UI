import {
    ReactFlowProvider,
} from '@xyflow/react';
import {ScenarioMap} from "@scenario/core/ui/map/ScenarioMap/ScenarioMap.tsx";

import styles from '../styles/theme.module.css'

import {useTheme} from "@app/providers/theme/useTheme.ts";
export default function ScenarioEditorPage() {
    const {theme} = useTheme();
    return (
        <div className={styles.scenarioEditorPage} data-theme={theme}>
            <ReactFlowProvider>
                <ScenarioMap/>
            </ReactFlowProvider>
        </div>
    );
}
