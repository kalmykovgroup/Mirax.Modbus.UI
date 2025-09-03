export const extractErr = (e: unknown) =>
    (e && typeof e === 'object' && 'message' in e) ? String((e as any).message) : 'Request failed';
