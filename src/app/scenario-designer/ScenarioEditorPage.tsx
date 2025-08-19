import {
    ReactFlowProvider,
} from '@xyflow/react';

import {ScenarioEditorCore} from "@app/scenario-designer/ScenarioEditorCore.tsx";


export default function ScenarioEditorPage() {

    return (
        <ReactFlowProvider >
            <ScenarioEditorCore />
        </ReactFlowProvider>
    );
}
