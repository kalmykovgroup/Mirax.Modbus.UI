import localforage from 'localforage';

const MAX_AGE_DAYS = 7; // Удалять данные старше 7 дней
const MAX_FIELDS = 100; // Максимум полей

export async function cleanupOldCharts() {
    try {
        const chartsDB = localforage.createInstance({
            name: 'ChartsDB',
            storeName: 'charts_data'
        });

        const data = await chartsDB.getItem('persist:charts');
        if (!data) return;

        const parsed = JSON.parse(data as string);
        const view = JSON.parse(parsed.view || '{}');

        const now = Date.now();
        const maxAge = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

        // Удаляем старые tiles
        Object.entries(view).forEach(([_field, fieldView]: [string, any]) => {
            Object.entries(fieldView.seriesLevel || {}).forEach(([bucket, tiles]: [string, any]) => {
                fieldView.seriesLevel[bucket] = tiles.filter((tile: any) => {
                    return tile.loadedAt && (now - tile.loadedAt) < maxAge;
                });
            });
        });

        // Ограничиваем количество полей
        const fields = Object.keys(view);
        if (fields.length > MAX_FIELDS) {
            // Сортируем по последнему использованию и удаляем старые
            const sorted = fields.sort((a, b) => {
                const aTime = view[a]?.loadingState?.startTime || 0;
                const bTime = view[b]?.loadingState?.startTime || 0;
                return bTime - aTime;
            });

            sorted.slice(MAX_FIELDS).forEach(field => {
                delete view[field];
            });
        }

        parsed.view = JSON.stringify(view);
        await chartsDB.setItem('persist:charts', JSON.stringify(parsed));

    } catch (error) {
        console.error('Failed to cleanup old charts:', error);
    }
}