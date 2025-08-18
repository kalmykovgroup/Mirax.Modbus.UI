
import Handles from "@app/scenario-designer/components/Handles/Handles.tsx";
import styles from "@app/scenario-designer/components/Handles/HandlerTarget/HandelTarget.module.css";

export interface HandlerSourceProps {
    topBottomCount: number;
    leftRightCount: number;
    containerWidth: number;
    containerHeight: number;
    className: string;
    inset?: number;
    includeVerticalCorners?: boolean;  // по умолчанию true
}

export function HandlerSource(props: HandlerSourceProps) {

    return (
        <Handles
            type="source"
            topBottomCount={props.topBottomCount}
            leftRightCount={props.leftRightCount}
            containerWidth={props.containerWidth}
            containerHeight={props.containerHeight}
            inset={props.inset}
            includeVerticalCorners={props.includeVerticalCorners}
            className={`${styles.handlerSource} ${props.className}`}
        />
    );
}

export default HandlerSource;
