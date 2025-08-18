
import Handles from "@app/scenario-designer/components/Handles/Handles.tsx";

export interface HandlerTargetProps {
    topBottomCount: number;
    leftRightCount: number;
    containerWidth: number;
    containerHeight: number;
    className: string;
    inset?: number;
    includeVerticalCorners?: boolean;  // по умолчанию true
}

export function HandlerTarget(props: HandlerTargetProps) {

    return (
        <Handles
            type="target"
            topBottomCount={props.topBottomCount}
            leftRightCount={props.leftRightCount}
            containerWidth={props.containerWidth}
            containerHeight={props.containerHeight}
            inset={props.inset}
            includeVerticalCorners={props.includeVerticalCorners}
            className={`${props.className}`}
        />
    );
}

export default HandlerTarget;
