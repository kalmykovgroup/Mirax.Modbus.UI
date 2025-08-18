import useRouteChange from "@app/providers/routing/useRouteChange.ts";


/**
 * Компонент, логирующий переходы по роутам.
 * Может быть использован для аналитики, логирования или сброса состояния.
 */
const RouteLogger = () => {
    useRouteChange((path, type) => {
        console.log(`[Route Change] ${type} -> ${path}`)
        // можно отправить в GA, Sentry, или сохранить в store
    })

    return null
}

export default RouteLogger