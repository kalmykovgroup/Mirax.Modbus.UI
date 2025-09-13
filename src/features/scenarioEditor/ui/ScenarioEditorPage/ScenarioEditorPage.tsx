import {
    ReactFlowProvider,
} from '@xyflow/react';
import {ScenarioMap} from "@scenario/core/ui/map/ScenarioMap/ScenarioMap.tsx";


export default function ScenarioEditorPage() {

    return (
        <ReactFlowProvider >
            <ScenarioMap />
        </ReactFlowProvider>
    );
}
