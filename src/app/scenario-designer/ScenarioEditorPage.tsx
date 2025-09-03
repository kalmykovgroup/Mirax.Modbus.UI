import {
    ReactFlowProvider,
} from '@xyflow/react';
import {ScenarioMap} from "@app/scenario-designer/componentsReactFlow/map/ScenarioMap/ScenarioMap.tsx";


export default function ScenarioEditorPage() {

    return (
        <ReactFlowProvider >
            <ScenarioMap />
        </ReactFlowProvider>
    );
}
