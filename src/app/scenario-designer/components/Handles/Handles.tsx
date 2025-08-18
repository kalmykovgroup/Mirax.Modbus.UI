// src/app/scenario-designer/components/Handles/Handles.tsx
import { Handle, Position } from "@xyflow/react";

export interface HandlesProps {
    topBottomCount: number;     // сколько точек сверху/снизу
    leftRightCount: number;     // сколько точек слева/справа
    containerWidth: number;     // реальная ширина области (px)
    containerHeight: number;    // реальная высота области (px)
    className: string;          // класс-обёртка стороны (контейнер для handle)
    inset?: number;             // отступ от краёв, по умолчанию 5
    includeVerticalCorners?: boolean; // рисовать ли углы на лево/право (по умолчанию true)
    type: "source" | "target";  // тип Handle
    handleClassName?: string;   // CSS-класс самого Handle'а (иконка/цвет и т.п.)
}

/**
 * Равномерное распределение в диапазоне [inset .. span - inset], включая края.
 * - count = 1 → центр
 * - count = 2 → только края
 * - count >= 3 → края + равные шаги
 */
function spreadWithEndpoints(count: number, span: number, inset: number): number[] {
    if (count <= 0) return [];
    if (count === 1) return [span / 2];
    if (count === 2) return [inset, span - inset];

    const start = inset;
    const end = span - inset;
    const step = (end - start) / (count - 1);
    return Array.from({ length: count }, (_, i) => start + step * i);
}

function renderHandle(
    type: "source" | "target",
    pos: Position,
    coord: number,
    key: string,
    className: string
) {
    const style =
        pos === Position.Top || pos === Position.Bottom
            ? { left: `${coord}px` }
            : { top: `${coord}px` };

    console.log(className);

    return (
        <Handle
            key={key}
            id={key}
            type={type}
            position={pos}
            className={className}
            style={style}
        />
    );
}

export function Handles({
                            topBottomCount,
                            leftRightCount,
                            containerWidth,
                            containerHeight,
                            inset = 10,
                            includeVerticalCorners = true,
                            type,
                            className,
                        }: HandlesProps) {
    // Top/Bottom — всегда с углами (крайние на inset px)
    const top    = spreadWithEndpoints(topBottomCount, containerWidth, inset);
    const bottom = spreadWithEndpoints(topBottomCount, containerWidth, inset);

    // Left/Right — по желанию с углами (по умолчанию: да)
    const leftAll  = spreadWithEndpoints(leftRightCount, containerHeight, inset);
    const rightAll = spreadWithEndpoints(leftRightCount, containerHeight, inset);

    const left =
        includeVerticalCorners
            ? leftAll
            : (leftRightCount >= 3 ? leftAll.slice(1, -1) : leftRightCount === 1 ? [containerHeight / 2] : []);

    const right =
        includeVerticalCorners
            ? rightAll
            : (leftRightCount >= 3 ? rightAll.slice(1, -1) : leftRightCount === 1 ? [containerHeight / 2] : []);

    return (
        <>

            {top.map((x, i) =>
                renderHandle(type, Position.Top, x, `${type}-top-${i}`, className)
            )}

            {right.map((y, i) =>
                renderHandle(type, Position.Right, y, `${type}-right-${i}`, className)
            )}

            {bottom.map((x, i) =>
                renderHandle(type, Position.Bottom, x, `${type}-bottom-${i}`, className)
            )}

            {left.map((y, i) =>
                renderHandle(type, Position.Left, y, `${type}-left-${i}`, className)
            )}

        </>
    );
}

export default Handles;
