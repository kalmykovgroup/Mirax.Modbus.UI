// orchestration/services/DataProcessingService.test.ts

import { DataProcessingService } from './DataProcessingService';
import type { SeriesTile, OriginalRange, CoverageInterval } from '@chartsPage/charts/core/store/types/chart.types';

// ============================================
// ТИПЫ
// ============================================

interface TestCase {
    readonly name: string;
    readonly tiles: readonly SeriesTile[];
    readonly originalRange: OriginalRange;
    readonly requestedFrom: number;
    readonly requestedTo: number;
    readonly bucketMs: number;
    readonly expected: {
        readonly shouldLoad: boolean;
        readonly fromMs?: number | undefined;
        readonly toMs?: number | undefined;
        readonly reason?: string | undefined;
    };
}

interface TestResult {
    readonly testName: string;
    readonly passed: boolean;
    readonly actual: CoverageInterval | null;
    readonly expected: CoverageInterval | null;
    readonly error?: string | undefined;
}

interface TestSummary {
    readonly total: number;
    readonly passed: number;
    readonly failed: number;
    readonly results: readonly TestResult[];
}

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

/**
 * Создать ready тайл
 */
function createReadyTile(fromMs: number, toMs: number, binsCount = 10): SeriesTile {
    return {
        coverageInterval: { fromMs, toMs },
        bins: Array.from({ length: binsCount }, (_, i) => ({
            t: new Date(fromMs + (i * (toMs - fromMs)) / binsCount),
            avg: Math.random() * 100,
            count: 1
        })),
        status: 'ready',
        loadedAt: Date.now()
    };
}

/**
 * Создать loading тайл
 */
function createLoadingTile(fromMs: number, toMs: number, requestId?: string): SeriesTile {
    return {
        coverageInterval: { fromMs, toMs },
        bins: [],
        status: 'loading',
        requestId: requestId ?? `req-${Date.now()}`
    };
}

/**
 * Создать error тайл
 */
function createErrorTile(fromMs: number, toMs: number, error?: string): SeriesTile {
    return {
        coverageInterval: { fromMs, toMs },
        bins: [],
        status: 'error',
        error: error ?? 'Test error'
    };
}

/**
 * Сравнить интервалы с учетом погрешности
 */
function intervalsMatch(
    actual: CoverageInterval | null,
    expected: CoverageInterval | null,
    tolerance = 0
): boolean {
    if (actual === null && expected === null) return true;
    if (actual === null || expected === null) return false;

    return (
        Math.abs(actual.fromMs - expected.fromMs) <= tolerance &&
        Math.abs(actual.toMs - expected.toMs) <= tolerance
    );
}

// ============================================
// ТЕСТ-КЕЙСЫ
// ============================================

function getTestCases(): readonly TestCase[] {
    const bucketMs = 100;
    const originalRange: OriginalRange = { fromMs: 0, toMs: 10000 };

    return [
        // ============================================
        // БАЗОВЫЕ СЛУЧАИ
        // ============================================

        {
            name: '01. Пустой массив тайлов - должен загрузить запрошенный диапазон',
            tiles: [],
            originalRange,
            requestedFrom: 1000,
            requestedTo: 2000,
            bucketMs,
            expected: {
                shouldLoad: true,
                fromMs: 1000,
                toMs: 2000,
                reason: 'No existing tiles'
            }
        },

        {
            name: '02. Полное покрытие ready тайлом - не должен загружать',
            tiles: [createReadyTile(0, 10000)],
            originalRange,
            requestedFrom: 1000,
            requestedTo: 2000,
            bucketMs,
            expected: {
                shouldLoad: false,
                reason: 'Full coverage by ready tile'
            }
        },

        {
            name: '03. Полное покрытие loading тайлом - не должен загружать',
            tiles: [createLoadingTile(0, 10000)],
            originalRange,
            requestedFrom: 1000,
            requestedTo: 2000,
            bucketMs,
            expected: {
                shouldLoad: false,
                reason: 'Already loading'
            }
        },

        {
            name: '04. Частичное покрытие ready - должен загрузить недостающее',
            tiles: [createReadyTile(0, 1500)],
            originalRange,
            requestedFrom: 1000,
            requestedTo: 2000,
            bucketMs,
            expected: {
                shouldLoad: true,
                fromMs: 1500,
                toMs: 2000,
                reason: 'Partial coverage'
            }
        },

        // ============================================
        // ВЫРАВНИВАНИЕ ПО BUCKET
        // ============================================

        {
            name: '05. Невыравненные границы - должен выравнять по bucketMs',
            tiles: [],
            originalRange,
            requestedFrom: 1050,
            requestedTo: 1950,
            bucketMs,
            expected: {
                shouldLoad: true,
                fromMs: 1000,
                toMs: 2000,
                reason: 'Alignment to bucket boundaries'
            }
        },

        // ============================================
        // РАСШИРЕНИЕ ДО ГРАНИЦ ГРАФИКА
        // ============================================

        {
            name: '06. Близко к началу графика - расширить до границы',
            tiles: [],
            originalRange,
            requestedFrom: 200,
            requestedTo: 1000,
            bucketMs,
            expected: {
                shouldLoad: true,
                fromMs: 0,
                toMs: 1000,
                reason: 'Close to graph start'
            }
        },

        {
            name: '07. Близко к концу графика - расширить до границы',
            tiles: [],
            originalRange,
            requestedFrom: 9000,
            requestedTo: 9800,
            bucketMs,
            expected: {
                shouldLoad: true,
                fromMs: 9000,
                toMs: 10000,
                reason: 'Close to graph end'
            }
        },

        {
            name: '08. Близко к обеим границам - расширить до обеих',
            tiles: [],
            originalRange: { fromMs: 0, toMs: 1000 },
            requestedFrom: 100,
            requestedTo: 900,
            bucketMs,
            expected: {
                shouldLoad: true,
                fromMs: 0,
                toMs: 1000,
                reason: 'Close to both boundaries'
            }
        },

        // ============================================
        // РАСШИРЕНИЕ ДО СОСЕДНИХ ТАЙЛОВ
        // ============================================

        {
            name: '09. Маленький gap слева - объединить с левым тайлом',
            tiles: [createReadyTile(0, 1000)],
            originalRange,
            requestedFrom: 1200,
            requestedTo: 2000,
            bucketMs,
            expected: {
                shouldLoad: true,
                fromMs: 1000,
                toMs: 2000,
                reason: 'Small gap to left tile'
            }
        },

        {
            name: '10. Маленький gap справа - объединить с правым тайлом',
            tiles: [createReadyTile(2000, 3000)],
            originalRange,
            requestedFrom: 1000,
            requestedTo: 1800,
            bucketMs,
            expected: {
                shouldLoad: true,
                fromMs: 1000,
                toMs: 2000,
                reason: 'Small gap to right tile'
            }
        },

        {
            name: '11. Маленькие gaps с обеих сторон - объединить с обоими тайлами',
            tiles: [
                createReadyTile(0, 1000),
                createReadyTile(2000, 3000)
            ],
            originalRange,
            requestedFrom: 1100,
            requestedTo: 1900,
            bucketMs,
            expected: {
                shouldLoad: true,
                fromMs: 1000,
                toMs: 2000,
                reason: 'Small gaps on both sides'
            }
        },

        {
            name: '12. Большой gap слева - не объединять',
            tiles: [createReadyTile(0, 500)],
            originalRange,
            requestedFrom: 1000,
            requestedTo: 2000,
            bucketMs,
            expected: {
                shouldLoad: true,
                fromMs: 1000,
                toMs: 2000,
                reason: 'Large gap to left tile'
            }
        },

        // ============================================
        // МИНИМАЛЬНЫЙ РАЗМЕР ЗАПРОСА
        // ============================================

        {
            name: '13. Запрос меньше минимума - расширить до минимума',
            tiles: [],
            originalRange,
            requestedFrom: 1000,
            requestedTo: 1200,
            bucketMs,
            expected: {
                shouldLoad: true,
                fromMs: 900,
                toMs: 1300,
                reason: 'Below minimum size'
            }
        },

        // ============================================
        // КОМБИНИРОВАННЫЕ СЛУЧАИ
        // ============================================

        {
            name: '14. Несколько тайлов с gaps - загрузить недостающее',
            tiles: [
                createReadyTile(0, 1000),
                createReadyTile(2000, 3000),
                createReadyTile(4000, 5000)
            ],
            originalRange,
            requestedFrom: 500,
            requestedTo: 4500,
            bucketMs,
            expected: {
                shouldLoad: true,
                fromMs: 1000,
                toMs: 5000,
                reason: 'Multiple gaps'
            }
        },

        {
            name: '15. Ready и loading тайлы - учитывать оба типа',
            tiles: [
                createReadyTile(0, 1000),
                createLoadingTile(1500, 2000)
            ],
            originalRange,
            requestedFrom: 1000,
            requestedTo: 1400,
            bucketMs,
            expected: {
                shouldLoad: true,
                fromMs: 1000,
                toMs: 1500,
                reason: 'Gap between ready and loading'
            }
        },

        {
            name: '16. Error тайлы игнорируются - загружать как будто их нет',
            tiles: [
                createReadyTile(0, 1000),
                createErrorTile(1000, 2000),
                createReadyTile(2000, 3000)
            ],
            originalRange,
            requestedFrom: 1000,
            requestedTo: 2000,
            bucketMs,
            expected: {
                shouldLoad: true,
                fromMs: 1000,
                toMs: 2000,
                reason: 'Error tiles ignored'
            }
        },

        // ============================================
        // ГРАНИЧНЫЕ СЛУЧАИ
        // ============================================

        {
            name: '17. Запрос точно на границе тайла слева',
            tiles: [createReadyTile(0, 1000)],
            originalRange,
            requestedFrom: 1000,
            requestedTo: 2000,
            bucketMs,
            expected: {
                shouldLoad: true,
                fromMs: 1000,
                toMs: 2000,
                reason: 'Exact boundary match'
            }
        },

        {
            name: '18. Запрос точно на границе тайла справа',
            tiles: [createReadyTile(2000, 3000)],
            originalRange,
            requestedFrom: 1000,
            requestedTo: 2000,
            bucketMs,
            expected: {
                shouldLoad: true,
                fromMs: 1000,
                toMs: 2000,
                reason: 'Exact boundary match'
            }
        },

        {
            name: '19. Один bucket запрос - расширить до минимума',
            tiles: [],
            originalRange,
            requestedFrom: 1000,
            requestedTo: 1100,
            bucketMs,
            expected: {
                shouldLoad: true,
                fromMs: 900,
                toMs: 1300,
                reason: 'Single bucket expanded'
            }
        },

        {
            name: '20. Весь диапазон графика уже загружен',
            tiles: [
                createReadyTile(0, 5000),
                createReadyTile(5000, 10000)
            ],
            originalRange,
            requestedFrom: 3000,
            requestedTo: 7000,
            bucketMs,
            expected: {
                shouldLoad: false,
                reason: 'Complete coverage'
            }
        }
    ];
}

// ============================================
// ОСНОВНОЙ ТЕСТОВЫЙ МЕТОД
// ============================================

export class DataProcessingServiceTest {
    /**
     * Запустить все тесты для calculateLoadInterval
     */
    static testCalculateLoadInterval(): TestSummary {
        console.log('\n=== TESTING DataProcessingService.calculateLoadInterval ===\n');

        const testCases = getTestCases();
        const results: TestResult[] = [];

        for (const testCase of testCases) {
            const result = this.runTestCase(testCase);
            results.push(result);

            // Вывод результата
            const status = result.passed ? '  PASS' : '❌ FAIL';
            console.log(`${status} ${result.testName}`);

            if (!result.passed) {
                console.log('  Expected:', result.expected);
                console.log('  Actual:  ', result.actual);
                if (result.error) {
                    console.log('  Error:   ', result.error);
                }
            }
        }

        const summary: TestSummary = {
            total: results.length,
            passed: results.filter(r => r.passed).length,
            failed: results.filter(r => !r.passed).length,
            results
        };

        console.log('\n=== TEST SUMMARY ===');
        console.log(`Total:  ${summary.total}`);
        console.log(`Passed: ${summary.passed}`);
        console.log(`Failed: ${summary.failed}`);
        console.log(`Success rate: ${((summary.passed / summary.total) * 100).toFixed(1)}%\n`);

        return summary;
    }

    /**
     * Запустить один тест-кейс
     */
    private static runTestCase(testCase: TestCase): TestResult {
        try {
            const actual = DataProcessingService.calculateLoadInterval({
                tiles: testCase.tiles,
                originalRange: testCase.originalRange,
                requestedFrom: testCase.requestedFrom,
                requestedTo: testCase.requestedTo,
                bucketMs: testCase.bucketMs
            });

            const expected = testCase.expected.shouldLoad
                ? {
                    fromMs: testCase.expected.fromMs!,
                    toMs: testCase.expected.toMs!
                }
                : null;

            const passed = intervalsMatch(actual, expected, testCase.bucketMs);

            return {
                testName: testCase.name,
                passed,
                actual,
                expected
            };

        } catch (error) {
            return {
                testName: testCase.name,
                passed: false,
                actual: null,
                expected: testCase.expected.shouldLoad
                    ? {
                        fromMs: testCase.expected.fromMs!,
                        toMs: testCase.expected.toMs!
                    }
                    : null,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    /**
     * Запустить конкретный тест по номеру
     */
    static runSingleTest(testNumber: number): void {
        const testCases = getTestCases();
        const testCase = testCases.find(tc => tc.name.startsWith(`${testNumber.toString().padStart(2, '0')}.`));

        if (!testCase) {
            console.error(`Test ${testNumber} not found`);
            return;
        }

        console.log(`\n=== Running: ${testCase.name} ===\n`);

        const result = this.runTestCase(testCase);

        console.log(`Status: ${result.passed ? '  PASS' : '❌ FAIL'}`);
        console.log(`Expected:`, result.expected);
        console.log(`Actual:  `, result.actual);

        if (result.error) {
            console.log(`Error:   `, result.error);
        }
    }

    /**
     * Запустить группу тестов по категории
     */
    static runTestCategory(category: string): void {
        const categories: Record<string, readonly number[]> = {
            'basic': [1, 2, 3, 4],
            'alignment': [5],
            'boundaries': [6, 7, 8],
            'neighbors': [9, 10, 11, 12],
            'minimum': [13],
            'combined': [14, 15, 16],
            'edge': [17, 18, 19, 20]
        };

        const testNumbers = categories[category.toLowerCase()];

        if (!testNumbers) {
            console.error(`Category "${category}" not found`);
            console.log('Available categories:', Object.keys(categories).join(', '));
            return;
        }

        console.log(`\n=== Running ${category.toUpperCase()} tests ===\n`);

        for (const num of testNumbers) {
            this.runSingleTest(num);
        }
    }
}