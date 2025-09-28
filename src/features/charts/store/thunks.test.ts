// thunks.test.ts - тестовый thunk для проверки загрузки и отображения в Header
import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '@/store/store';
import type { SeriesBinDto } from '@charts/shared/contracts/chart/Dtos/SeriesBinDto';
import type { CoverageInterval, BucketsMs } from './chartsSlice';

import {
    updateView,
    upsertTiles,
    setFieldError,
    startLoading,
    finishLoading,
} from './chartsSlice';

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====

// Генерация фейковых данных для тестирования (оптимизированная версия)
function generateFakeBins(
    fromMs: number,
    toMs: number,
    bucketMs: number,
    fillRate = 0.8, // процент заполнения
    maxBins = 1000  // ограничение на количество бинов для тестов
): SeriesBinDto[] {
    const bins: SeriesBinDto[] = [];
    const totalBins = Math.ceil((toMs - fromMs) / bucketMs);

    // Ограничиваем количество бинов для производительности
    const actualBins = Math.min(totalBins, maxBins);
    const step = totalBins > maxBins ? Math.floor(totalBins / maxBins) : 1;

    for (let i = 0; i < actualBins; i++) {
        // Пропускаем некоторые бины для создания "дыр" в данных
        if (Math.random() > fillRate) continue;

        const actualIndex = i * step;
        const t = new Date(fromMs + actualIndex * bucketMs);
        const value = 20 + Math.sin(actualIndex / 10) * 10 + Math.random() * 5;

        bins.push({
            t,
            min: value - Math.random() * 2,
            max: value + Math.random() * 2,
            avg: value,
            count: Math.floor(Math.random() * 100) + 1,
        });
    }

    console.log(`  📊 Сгенерировано ${bins.length} бинов (из возможных ${totalBins})`);
    return bins;
}

// Имитация задержки сети
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Получение существующих уровней из view
function getExistingLevels(view: any): BucketsMs[] {
    if (!view || !view.seriesLevel) return [];

    return Object.keys(view.seriesLevel)
        .map(k => Number(k) as BucketsMs)
        .filter(b => Number.isFinite(b) && b > 0)
        .sort((a, b) => b - a); // От большего к меньшему
}

// ===== ТЕСТОВЫЕ СЦЕНАРИИ =====

/**
 * Сценарий 1: Инициализация с несколькими уровнями
 * Работает с существующими уровнями или создает новые
 */
export const testInitializeMultipleLevels = createAsyncThunk<
    void,
    { fieldName: string },
    { state: RootState }
>('charts/test/initializeMultipleLevels', async ({ fieldName }, { dispatch, getState }) => {
    console.log('🧪 TEST: Инициализация уровней для', fieldName);

    const state = getState();
    const template = state.charts.template;
    if (!template?.from || !template?.to) {
        throw new Error('Template with time range required');
    }

    const from = template.from.getTime();
    const to = template.to.getTime();
    const timeRange = { from: template.from, to: template.to };

    // Получаем существующий view
    const existingView = state.charts.view[fieldName];

    // Проверяем, какие уровни уже существуют
    let testLevels: BucketsMs[] = [];

    if (existingView && existingView.seriesLevel) {
        // Используем существующие уровни
        testLevels = getExistingLevels(existingView);
        console.log(`📋 Найдено ${testLevels.length} существующих уровней:`,
            testLevels.map(ms => formatBucket(ms)).join(', '));

        if (testLevels.length === 0) {
            // Если уровней нет, создаем стандартные
            console.log('⚠️ Уровни не найдены, создаем стандартные...');
            testLevels = [
                60 * 60 * 1000,   // 1 час
                5 * 60 * 1000,    // 5 минут
                60 * 1000,        // 1 минута
            ];
        }
    } else {
        // View не существует, инициализируем со стандартными уровнями
        console.log('🔍 View не инициализирован, создаем со стандартными уровнями...');
        testLevels = [
            60 * 60 * 1000,   // 1 час
            5 * 60 * 1000,    // 5 минут
            60 * 1000,        // 1 минута
        ];

        // Инициализируем view
        dispatch(updateView({
            field: fieldName,
            px: 1200,
            currentRange: timeRange,
            currentBucketsMs: existingView?.currentBucketsMs || testLevels[0],
        }));

        dispatch(initialLevels({
            field: fieldName,
            bucketList: testLevels,
        }));
    }

    // Определяем текущий bucket или используем первый из списка
    const currentBucket = existingView?.currentBucketsMs || testLevels[0];
    console.log(`🎯 Текущий уровень: ${formatBucket(currentBucket)}`);

    // Загружаем данные для каждого существующего уровня
    for (let i = 0; i < testLevels.length; i++) {
        const bucketMs = testLevels[i];
        console.log(`\n📊 Загрузка уровня ${formatBucket(bucketMs)} (${bucketMs}ms)`);

        // Проверяем, есть ли уже данные на этом уровне
        const existingTiles = existingView?.seriesLevel[bucketMs] || [];
        if (existingTiles.length > 0) {
            console.log(`  ℹ️ Уровень уже содержит ${existingTiles.length} тайлов`);
        }

        // Создаем рандомные чанки для более реалистичной загрузки
        const totalSpan = to - from;
        const numChunks = 6; // Больше чанков для разнообразия
        const chunkSize = totalSpan / numChunks;

        // Рандомно выбираем, какие чанки загружать (70% вероятность)
        const chunksToLoad = [];
        for (let j = 0; j < numChunks; j++) {
            if (Math.random() > 0.3) { // 70% вероятность загрузки
                chunksToLoad.push(j);
            }
        }

        console.log(`  🔄 План загрузки: ${chunksToLoad.length}/${numChunks} чанков`);

        for (const j of chunksToLoad) {
            const chunkStart = from + j * chunkSize;
            const chunkEnd = chunkStart + chunkSize;

            // Выравниваем по границам бакета
            const alignedStart = Math.floor(chunkStart / bucketMs) * bucketMs;
            const alignedEnd = Math.ceil(chunkEnd / bucketMs) * bucketMs;

            const interval: CoverageInterval = {
                fromMs: alignedStart,
                toMs: alignedEnd,
            };

            // Рандомно определяем результат загрузки
            const loadResult = Math.random();

            if (loadResult < 0.1) {
                // 10% - оставляем в состоянии loading
                dispatch(upsertTiles({
                    field: fieldName,
                    bucketMs: bucketMs,
                    tiles: [{
                        coverageInterval: interval,
                        bins: [],
                        status: 'loading' as const,
                    }],
                }));
                console.log(`  ⏳ Чанк ${j + 1}: загружается...`);

            } else if (loadResult < 0.2) {
                // 10% - ошибка
                dispatch(upsertTiles({
                    field: fieldName,
                    bucketMs: bucketMs,
                    tiles: [{
                        coverageInterval: interval,
                        bins: [],
                        status: 'error' as const,
                        error: `Test error for chunk ${j + 1}`,
                    }],
                }));
                console.log(`  ❌ Чанк ${j + 1}: ошибка загрузки`);

            } else {
                // 80% - успешная загрузка
                dispatch(startLoading({
                    field: fieldName,
                    type: 'initial',
                    message: 'Загрузка данных...'
                }));

                // Имитируем загрузку
                await delay(100 + Math.random() * 200);

                // Генерируем фейковые данные с переменной плотностью
                const fillRate = 0.5 + Math.random() * 0.45; // от 50% до 95%
                const bins = generateFakeBins(
                    alignedStart,
                    alignedEnd,
                    bucketMs,
                    fillRate
                );

                // Сохраняем данные
                dispatch(upsertTiles({
                    field: fieldName,
                    bucketMs: bucketMs,
                    tiles: [{
                        coverageInterval: interval,
                        bins,
                        status: 'ready' as const,
                    }],
                }));

                console.log(`  ✅ Чанк ${j + 1}: ${bins.length} бинов (плотность ${(fillRate * 100).toFixed(0)}%)`);

                dispatch(finishLoading({
                    field: fieldName,
                    success: true
                }));
            }
        }

        // Снимаем флаг загрузки
        dispatch(finishLoading({
            field: fieldName,
            success: true
        }));
    }

    console.log('\n✨ TEST: Инициализация завершена');
});

/**
 * Сценарий 2: Последовательная дозагрузка недостающих участков
 * Работает с текущим активным уровнем
 */
export const testIncrementalLoad = createAsyncThunk<
    void,
    {
        fieldName: string;
        targetCoverage: number; // Процент покрытия для достижения (0-100)
    },
    { state: RootState }
>('charts/test/incrementalLoad', async ({ fieldName, targetCoverage }, { dispatch, getState }) => {
    console.log('🧪 TEST: Инкрементальная загрузка до', targetCoverage + '%');

    const state = getState();
    const view = state.charts.view[fieldName];
    if (!view) {
        console.error('❌ View не инициализирован. Сначала запустите инициализацию!');
        throw new Error('View not initialized for field: ' + fieldName);
    }

    const currentBucket = view.currentBucketsMs;
    console.log(`🎯 Работаем с уровнем: ${formatBucket(currentBucket)}`);

    const tiles = view.seriesLevel[currentBucket];
    if (!tiles) {
        console.warn(`⚠️ Уровень ${formatBucket(currentBucket)} не существует`);
        throw new Error('No tiles for current bucket');
    }

    const template = state.charts.template;
    if (!template?.from || !template?.to) {
        throw new Error('Template required');
    }

    const domainStart = template.from.getTime();
    const domainEnd = template.to.getTime();
    const domainSpan = domainEnd - domainStart;

    // Находим текущие дыры в покрытии
    const gaps = findGapsInCoverage(
        tiles.filter(t => t.status === 'ready').map(t => t.coverageInterval),
        domainStart,
        domainEnd
    );

    console.log(`📊 Текущее состояние:`);
    console.log(`  - Тайлов: ${tiles.length}`);
    console.log(`  - Готовых: ${tiles.filter(t => t.status === 'ready').length}`);
    console.log(`  - С ошибками: ${tiles.filter(t => t.status === 'error').length}`);
    console.log(`  - Загружаются: ${tiles.filter(t => t.status === 'loading').length}`);
    console.log(`  - Найдено дыр: ${gaps.length}`);

    // Загружаем дыры до достижения целевого покрытия
    let currentCoverageMs = calculateCoverage(tiles, domainStart, domainEnd);
    let currentPercent = (currentCoverageMs / domainSpan) * 100;

    console.log(`📈 Текущее покрытие: ${currentPercent.toFixed(1)}%`);

    for (const gap of gaps) {
        if (currentPercent >= targetCoverage) {
            console.log(`✅ Достигнуто покрытие ${currentPercent.toFixed(1)}%`);
            break;
        }

        console.log(`🔥 Загрузка дыры: ${formatMs(gap.fromMs)} - ${formatMs(gap.toMs)}`);

        // Рандомно определяем результат загрузки
        const loadResult = Math.random();

        if (loadResult < 0.15) {
            // 15% вероятность ошибки
            console.log(`  ❌ Ошибка загрузки!`);
            dispatch(upsertTiles({
                field: fieldName,
                bucketMs: currentBucket,
                tiles: [{
                    coverageInterval: gap,
                    bins: [],
                    status: 'error' as const,
                    error: 'Network timeout (test error)',
                }],
            }));
            continue;
        }

        if (loadResult < 0.25) {
            // 10% вероятность оставить в состоянии loading
            console.log(`  ⏳ Оставлено в состоянии загрузки`);
            dispatch(upsertTiles({
                field: fieldName,
                bucketMs: currentBucket,
                tiles: [{
                    coverageInterval: gap,
                    bins: [],
                    status: 'loading' as const,
                }],
            }));
            continue;
        }

        // 75% - успешная загрузка
        dispatch(startLoading({
            field: fieldName,
            type: 'zoom',
            message: 'Дозагрузка данных...'
        }));

        // Имитируем сетевую задержку
        await delay(200 + Math.random() * 300);

        // Генерируем данные с переменной плотностью
        const fillRate = 0.6 + Math.random() * 0.35; // от 60% до 95%
        const bins = generateFakeBins(gap.fromMs, gap.toMs, currentBucket, fillRate);

        // Сохраняем
        dispatch(upsertTiles({
            field: fieldName,
            bucketMs: currentBucket,
            tiles: [{
                coverageInterval: gap,
                bins,
                status: 'ready' as const,
            }],
        }));

        // Снимаем флаг загрузки
        dispatch(finishLoading({
            field: fieldName,
            success: true
        }));

        // Обновляем текущее покрытие только для успешных загрузок
        currentCoverageMs += (gap.toMs - gap.fromMs);
        currentPercent = (currentCoverageMs / domainSpan) * 100;

        console.log(`  ✅ Загружено ${bins.length} бинов (плотность ${(fillRate * 100).toFixed(0)}%), покрытие: ${currentPercent.toFixed(1)}%`);
    }

    console.log('\n✨ TEST: Инкрементальная загрузка завершена');
});

/**
 * Сценарий 3: Переключение между уровнями
 * Переключается на другой существующий уровень
 */
export const testSwitchLevel = createAsyncThunk<
    void,
    {
        fieldName: string;
        targetBucketMs?: BucketsMs; // Опционально - если не указан, берем следующий
    },
    { state: RootState }
>('charts/test/switchLevel', async ({ fieldName, targetBucketMs }, { dispatch, getState }) => {
    const state = getState();
    const view = state.charts.view[fieldName];
    if (!view) {
        console.error('❌ View не инициализирован. Сначала запустите инициализацию!');
        throw new Error('View not initialized');
    }

    const existingLevels = getExistingLevels(view);
    if (existingLevels.length === 0) {
        console.error('❌ Нет доступных уровней');
        throw new Error('No levels available');
    }

    const oldBucket = view.currentBucketsMs;

    // Если targetBucketMs не указан, берем следующий уровень
    if (!targetBucketMs) {
        const currentIndex = existingLevels.indexOf(oldBucket);
        const nextIndex = (currentIndex + 1) % existingLevels.length;
        targetBucketMs = existingLevels[nextIndex];
        console.log(`🔄 Автоматический выбор следующего уровня: ${formatBucket(targetBucketMs)}`);
    } else {
        // Проверяем, существует ли запрошенный уровень
        if (!existingLevels.includes(targetBucketMs)) {
            console.warn(`⚠️ Уровень ${formatBucket(targetBucketMs)} не существует`);
            console.log(`📋 Доступные уровни: ${existingLevels.map(ms => formatBucket(ms)).join(', ')}`);
            targetBucketMs = existingLevels[0]; // Берем первый доступный
            console.log(`📌 Использую ${formatBucket(targetBucketMs)} вместо запрошенного`);
        }
    }

    console.log(`🧪 TEST: Переключение ${formatBucket(oldBucket)} → ${formatBucket(targetBucketMs)}`);

    // Переключаем текущий уровень
    dispatch(setCurrentBucketMs({
        field: fieldName,
        bucketMs: targetBucketMs,
    }));

    // Проверяем, есть ли уже данные на новом уровне
    const targetTiles = view.seriesLevel[targetBucketMs];
    if (!targetTiles || targetTiles.length === 0) {
        console.log('🔥 Уровень пустой, загружаем начальные данные...');

        const template = state.charts.template;
        if (!template?.from || !template?.to) return;

        const from = template.from.getTime();
        const to = template.to.getTime();

        // Загружаем центральную часть для быстрого отображения
        const center = (from + to) / 2;
        const span = (to - from) / 3; // Треть общего диапазона
        const loadStart = Math.floor((center - span / 2) / targetBucketMs) * targetBucketMs;
        const loadEnd = Math.ceil((center + span / 2) / targetBucketMs) * targetBucketMs;

        const interval: CoverageInterval = {
            fromMs: loadStart,
            toMs: loadEnd,
        };

        dispatch(startLoading({
            field: fieldName,
            type: 'zoom',
            message: 'Загрузка уровня...'
        }));

        await delay(800);

        const bins = generateFakeBins(loadStart, loadEnd, targetBucketMs, 0.85);

        dispatch(upsertTiles({
            field: fieldName,
            bucketMs: targetBucketMs,
            tiles: [{
                coverageInterval: interval,
                bins,
                status: 'ready' as const,
            }],
        }));

        dispatch(finishLoading({
            field: fieldName,
            success: true
        }));

        console.log(`✅ Загружено ${bins.length} бинов для нового уровня`);
    } else {
        const readyTiles = targetTiles.filter(t => t.status === 'ready').length;
        const errorTiles = targetTiles.filter(t => t.status === 'error').length;
        const loadingTiles = targetTiles.filter(t => t.status === 'loading').length;

        console.log(`ℹ️ Уровень уже содержит данные:`);
        console.log(`  - Всего тайлов: ${targetTiles.length}`);
        console.log(`  - Готовых: ${readyTiles}`);
        console.log(`  - С ошибками: ${errorTiles}`);
        console.log(`  - Загружаются: ${loadingTiles}`);
    }

    console.log('✨ TEST: Переключение уровня завершено');
});

/**
 * Сценарий 4: Тестирование панорамирования (pan)
 * Имитирует прокрутку влево/вправо и дозагрузку новых участков
 */
export const testPanNavigation = createAsyncThunk<
    void,
    {
        fieldName: string;
        direction?: 'left' | 'right' | 'both';
        panSteps?: number;
    },
    { state: RootState }
>('charts/test/panNavigation', async ({ fieldName, direction = 'both', panSteps = 3 }, { dispatch, getState }) => {
    console.log('🧪 TEST: Тестирование панорамирования');

    const state = getState();
    const view = state.charts.view[fieldName];
    if (!view) {
        console.error('❌ View не инициализирован');
        throw new Error('View not initialized');
    }

    const template = state.charts.template;
    if (!template?.from || !template?.to) {
        throw new Error('Template required');
    }

    const bucketMs = view.currentBucketsMs;
    console.log(`🎯 Работаем с уровнем: ${formatBucket(bucketMs)}`);

    const domainStart = template.from.getTime();
    const domainEnd = template.to.getTime();
    const domainSpan = domainEnd - domainStart;

    // Определяем размер шага панорамирования (20% от видимой области)
    const panStepSize = domainSpan * 0.2;

    console.log(`🔄 Шаг панорамирования: ${(panStepSize / (1000 * 60 * 60)).toFixed(2)} часов`);

    // Панорамирование влево
    if (direction === 'left' || direction === 'both') {
        console.log('\n◀️ ПАНОРАМИРОВАНИЕ ВЛЕВО');

        for (let step = 1; step <= panSteps; step++) {
            console.log(`\n  Шаг ${step}/${panSteps} влево`);

            // Вычисляем новую область для загрузки (слева от текущей)
            const newEnd = domainStart - (panStepSize * (step - 1));
            const newStart = domainStart - (panStepSize * step);

            // Выравниваем по границам bucket
            const alignedStart = Math.floor(newStart / bucketMs) * bucketMs;
            const alignedEnd = Math.ceil(newEnd / bucketMs) * bucketMs;

            const interval: CoverageInterval = {
                fromMs: alignedStart,
                toMs: alignedEnd,
            };

            console.log(`  📍 Загружаем: ${formatMs(alignedStart)} - ${formatMs(alignedEnd)}`);

            // Показываем загрузку
            dispatch(startLoading({
                field: fieldName,
                type: 'background',
                message: 'Загрузка области...'
            }));

            await delay(300 + Math.random() * 200);

            // Генерируем данные для новой области
            const fillRate = 0.7 + Math.random() * 0.25;
            const bins = generateFakeBins(alignedStart, alignedEnd, bucketMs, fillRate);

            dispatch(upsertTiles({
                field: fieldName,
                bucketMs: bucketMs,
                tiles: [{
                    coverageInterval: interval,
                    bins,
                    status: 'ready' as const,
                }],
            }));

            dispatch(finishLoading({
                field: fieldName,
                success: true
            }));

            console.log(`  ✅ Загружено ${bins.length} бинов`);
        }
    }

    // Панорамирование вправо
    if (direction === 'right' || direction === 'both') {
        console.log('\n▶️ ПАНОРАМИРОВАНИЕ ВПРАВО');

        for (let step = 1; step <= panSteps; step++) {
            console.log(`\n  Шаг ${step}/${panSteps} вправо`);

            // Вычисляем новую область для загрузки (справа от текущей)
            const newStart = domainEnd + (panStepSize * (step - 1));
            const newEnd = domainEnd + (panStepSize * step);

            // Выравниваем по границам bucket
            const alignedStart = Math.floor(newStart / bucketMs) * bucketMs;
            const alignedEnd = Math.ceil(newEnd / bucketMs) * bucketMs;

            const interval: CoverageInterval = {
                fromMs: alignedStart,
                toMs: alignedEnd,
            };

            console.log(`  📍 Загружаем: ${formatMs(alignedStart)} - ${formatMs(alignedEnd)}`);

            // Рандомно определяем результат загрузки
            const loadResult = Math.random();

            if (loadResult < 0.1) {
                // 10% - ошибка при загрузке
                console.log(`  ❌ Ошибка загрузки новой области`);
                dispatch(upsertTiles({
                    field: fieldName,
                    bucketMs: bucketMs,
                    tiles: [{
                        coverageInterval: interval,
                        bins: [],
                        status: 'error' as const,
                        error: 'Failed to load future data',
                    }],
                }));
            } else {
                // 90% - успешная загрузка
                dispatch(startLoading({
                    field: fieldName,
                    type: 'background',
                    message: 'Загрузка области...'
                }));

                await delay(300 + Math.random() * 200);

                const fillRate = 0.7 + Math.random() * 0.25;
                const bins = generateFakeBins(alignedStart, alignedEnd, bucketMs, fillRate);

                dispatch(upsertTiles({
                    field: fieldName,
                    bucketMs: bucketMs,
                    tiles: [{
                        coverageInterval: interval,
                        bins,
                        status: 'ready' as const,
                    }],
                }));

                dispatch(finishLoading({
                    field: fieldName,
                    success: true
                }));

                console.log(`  ✅ Загружено ${bins.length} бинов`);
            }
        }
    }

    console.log('\n✨ TEST: Панорамирование завершено');
});

/**
 * Сценарий 5: Имитация ошибок загрузки
 * Работает с текущим активным уровнем
 */
export const testLoadingErrors = createAsyncThunk<
    void,
    { fieldName: string },
    { state: RootState }
>('charts/test/loadingErrors', async ({ fieldName }, { dispatch, getState }) => {
    console.log('🧪 TEST: Имитация ошибок загрузки');

    const state = getState();
    const view = state.charts.view[fieldName];
    if (!view) {
        console.error('❌ View не инициализирован. Сначала запустите инициализацию!');
        throw new Error('View not initialized');
    }

    const template = state.charts.template;
    if (!template?.from || !template?.to) return;

    const bucketMs = view.currentBucketsMs;
    console.log(`🎯 Работаем с уровнем: ${formatBucket(bucketMs)}`);

    const from = template.from.getTime();
    const to = template.to.getTime();
    const chunkSize = (to - from) / 5;

    // Загружаем 5 чанков с разными результатами
    const scenarios = [
        { status: 'success', delay: 300 },
        { status: 'error', delay: 500, error: 'Connection refused' },
        { status: 'success', delay: 200 },
        { status: 'error', delay: 400, error: 'Timeout exceeded' },
        { status: 'loading', delay: 0 }, // Оставляем в состоянии loading
    ];

    for (let i = 0; i < scenarios.length; i++) {
        const scenario = scenarios[i];
        const chunkStart = Math.floor((from + i * chunkSize) / bucketMs) * bucketMs;
        const chunkEnd = Math.ceil((chunkStart + chunkSize) / bucketMs) * bucketMs;

        const interval: CoverageInterval = {
            fromMs: chunkStart,
            toMs: chunkEnd,
        };

        console.log(`🔥 Чанк ${i + 1}: ${scenario.status}`);

        // Показываем загрузку для визуальной демонстрации
        dispatch(startLoading({
            field: fieldName,
            type: 'background',
            message: `Загрузка чанка ${i + 1}/5...`
        }));

        if (scenario.delay > 0) {
            await delay(scenario.delay);
        }

        // Обрабатываем результат
        if (scenario.status === 'success') {
            const bins = generateFakeBins(chunkStart, chunkEnd, bucketMs, 0.9);
            dispatch(upsertTiles({
                field: fieldName,
                bucketMs,
                tiles: [{
                    coverageInterval: interval,
                    bins,
                    status: 'ready' as const,
                }],
            }));
            console.log(`  ✅ Успешно загружено`);

        } else if (scenario.status === 'error') {
            dispatch(upsertTiles({
                field: fieldName,
                bucketMs,
                tiles: [{
                    coverageInterval: interval,
                    bins: [],
                    status: 'error' as const,
                    error: scenario.error,
                }],
            }));
            console.log(`  ❌ Ошибка: ${scenario.error}`);

        } else if (scenario.status === 'loading') {
            dispatch(upsertTiles({
                field: fieldName,
                bucketMs,
                tiles: [{
                    coverageInterval: interval,
                    bins: [],
                    status: 'loading' as const,
                }],
            }));
            console.log(`  ⏳ Оставлен в состоянии загрузки`);
        }

        // Снимаем флаг загрузки кроме последнего случая
        if (scenario.status !== 'loading') {
            dispatch(finishLoading({
                field: fieldName,
                success: scenario.status === 'success',
                error: scenario.status === 'error' ? scenario.error : undefined
            }));
        }
    }

    // Устанавливаем общую ошибку поля для демонстрации
    dispatch(setFieldError({
        fieldName: fieldName,
        error: 'Частичная загрузка данных: некоторые участки недоступны',
    }));

    console.log('✨ TEST: Сценарий с ошибками завершен');
});

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====

function findGapsInCoverage(
    coverage: CoverageInterval[],
    domainStart: number,
    domainEnd: number
): CoverageInterval[] {
    if (coverage.length === 0) {
        return [{ fromMs: domainStart, toMs: domainEnd }];
    }

    // Сортируем интервалы
    const sorted = [...coverage].sort((a, b) => a.fromMs - b.fromMs);
    const gaps: CoverageInterval[] = [];

    // Проверяем начало
    if (sorted[0].fromMs > domainStart) {
        gaps.push({ fromMs: domainStart, toMs: sorted[0].fromMs });
    }

    // Проверяем промежутки
    for (let i = 0; i < sorted.length - 1; i++) {
        const current = sorted[i];
        const next = sorted[i + 1];
        if (current.toMs < next.fromMs) {
            gaps.push({ fromMs: current.toMs, toMs: next.fromMs });
        }
    }

    // Проверяем конец
    const last = sorted[sorted.length - 1];
    if (last.toMs < domainEnd) {
        gaps.push({ fromMs: last.toMs, toMs: domainEnd });
    }

    return gaps;
}

function calculateCoverage(
    tiles: Array<{ coverageInterval: CoverageInterval; status: string }>,
    domainStart: number,
    domainEnd: number
): number {
    let covered = 0;

    tiles
        .filter(t => t.status === 'ready')
        .forEach(tile => {
            const start = Math.max(tile.coverageInterval.fromMs, domainStart);
            const end = Math.min(tile.coverageInterval.toMs, domainEnd);
            if (end > start) {
                covered += (end - start);
            }
        });

    return covered;
}

function formatBucket(ms: number): string {
    const s = ms / 1000;
    if (s < 60) return `${s}с`;
    const m = s / 60;
    if (m < 60) return `${m}мин`;
    const h = m / 60;
    if (h < 24) return `${h}ч`;
    const d = h / 24;
    return `${d}д`;
}

function formatMs(ms: number): string {
    return new Date(ms).toLocaleTimeString('ru-RU');
}

// ===== КОМПОЗИТНЫЙ ТЕСТ =====

/**
 * Полный тестовый сценарий
 * Запускает все тесты последовательно для демонстрации всех возможностей
 */
export const runFullTestSuite = createAsyncThunk<
    void,
    { fieldName: string },
    { state: RootState }
>('charts/test/fullSuite', async ({ fieldName }, { dispatch, getState }) => {
    console.log('🚀 ЗАПУСК ПОЛНОГО ТЕСТОВОГО НАБОРА');
    console.log('=====================================\n');

    // 0. Проверяем текущее состояние
    const state = getState();
    const view = state.charts.view[fieldName];

    if (view) {
        const levels = getExistingLevels(view);
        console.log(`📋 Текущее состояние:`);
        console.log(`  - Уровни: ${levels.map(ms => formatBucket(ms)).join(', ')}`);
        console.log(`  - Текущий: ${formatBucket(view.currentBucketsMs)}`);
    } else {
        console.log('📋 View не инициализирован, будет создан автоматически');
    }

    // 1. Инициализация или дозагрузка существующих уровней
    console.log('\n--- Этап 1: Инициализация ---');
    await dispatch(testInitializeMultipleLevels({ fieldName })).unwrap();
    await delay(1000);

    // 2. Дозагрузка до 80%
    console.log('\n--- Этап 2: Дозагрузка ---');
    await dispatch(testIncrementalLoad({ fieldName, targetCoverage: 80 })).unwrap();
    await delay(1000);

    // 3. Панорамирование влево и вправо
    console.log('\n--- Этап 3: Панорамирование ---');
    await dispatch(testPanNavigation({
        fieldName,
        direction: 'both',
        panSteps: 2
    })).unwrap();
    await delay(1000);

    // 4. Переключение уровня
    console.log('\n--- Этап 4: Переключение уровня ---');
    await dispatch(testSwitchLevel({ fieldName })).unwrap(); // Автоматически выберет следующий
    await delay(1000);

    // 5. Имитация ошибок
    console.log('\n--- Этап 5: Тест ошибок ---');
    await dispatch(testLoadingErrors({ fieldName })).unwrap();

    console.log('\n=====================================');
    console.log('✅ ТЕСТОВЫЙ НАБОР ЗАВЕРШЕН');
    console.log('Проверьте Header для просмотра результатов');
});