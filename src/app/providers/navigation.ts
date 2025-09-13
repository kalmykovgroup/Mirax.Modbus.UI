let navigateFunction: ((path: string) => void) | null = null

export const setNavigate = (fn: (path: string) => void) => {
    navigateFunction = fn
}

export const redirectTo = (path: string) => {
    if (navigateFunction) navigateFunction(path)
    else window.location.href = path
}