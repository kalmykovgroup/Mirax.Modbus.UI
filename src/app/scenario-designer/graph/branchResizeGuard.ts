// простая шина-синглтон
const resizing = new Set<string>();

export function startBranchResize(id: string) {
    resizing.add(id);
}

export function endBranchResize(id: string) {
    resizing.delete(id);
}

export function isAnyBranchResizing() {
    return resizing.size > 0;
}
