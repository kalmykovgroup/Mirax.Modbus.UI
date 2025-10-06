// src/features/chartsPage/charts/core/store/tile-system.slice.ts

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Tile, TileSystem, OriginalRange } from './tile-system.types';
import { TileSystemCore } from './TileSystemCore';
import type {BucketsMs, CoverageInterval, FieldName} from "@chartsPage/charts/core/store/types/chart.types.ts";

/**
 * State для системы тайлов
 * Хранит TileSystem для каждого поля и bucket-уровня
 */
interface TileSystemState {
    // field -> bucketMs -> TileSystem
    readonly systems: Record<FieldName, Record<BucketsMs, TileSystem>>;
}

const initialState: TileSystemState = {
    systems: {}
};

const tileSystemSlice = createSlice({
    name: 'tileSystem',
    initialState,
    reducers: {
        /**
         * Инициализировать систему для поля и bucket
         */
        initSystem(
            state,
            action: PayloadAction<{
                field: FieldName;
                bucketMs: BucketsMs;
                originalRange: OriginalRange;
            }>
        ) {
            const { field, bucketMs, originalRange } = action.payload;

            if (!state.systems[field]) {
                state.systems[field] = {};
            }

            state.systems[field]![bucketMs] = TileSystemCore.create(originalRange);
        },

        /**
         * Добавить тайл
         */
        addTile(
            state,
            action: PayloadAction<{
                field: FieldName;
                bucketMs: BucketsMs;
                tile: Tile;
            }>
        ) {
            const { field, bucketMs, tile } = action.payload;
            const system = state.systems[field]?.[bucketMs];

            if (!system) {
                console.error('[TileSystem] System not found:', { field, bucketMs });
                return;
            }

            const result = TileSystemCore.addTile(system, tile);

            state.systems[field]![bucketMs] = {
                ...system,
                tiles: result.tiles,
                totalBins: result.tiles.reduce(
                    (sum, t) => sum + (t.status === 'ready' ? t.bins.length : 0),
                    0
                ),
                lastUpdated: Date.now()
            };

            console.log('[TileSystem] Tile added:', {
                field,
                bucketMs,
                wasAdded: result.wasAdded,
                wasMerged: result.wasMerged,
                totalTiles: result.tiles.length
            });
        },

        /**
         * Удалить тайл по индексу
         */
        removeTile(
            state,
            action: PayloadAction<{
                field: FieldName;
                bucketMs: BucketsMs;
                index: number;
            }>
        ) {
            const { field, bucketMs, index } = action.payload;
            const system = state.systems[field]?.[bucketMs];

            if (!system) {
                console.error('[TileSystem] System not found:', { field, bucketMs });
                return;
            }

            const tiles = TileSystemCore.removeTile(system, index);

            state.systems[field]![bucketMs] = {
                ...system,
                tiles,
                totalBins: tiles.reduce(
                    (sum, t) => sum + (t.status === 'ready' ? t.bins.length : 0),
                    0
                ),
                lastUpdated: Date.now()
            };
        },

        /**
         * Обновить статус тайла
         */
        updateTileStatus(
            state,
            action: PayloadAction<{
                field: FieldName;
                bucketMs: BucketsMs;
                interval: CoverageInterval;
                status: Tile['status'];
                error?: string | undefined;
            }>
        ) {
            const { field, bucketMs, interval, status, error } = action.payload;
            const system = state.systems[field]?.[bucketMs];

            if (!system) {
                console.error('[TileSystem] System not found:', { field, bucketMs });
                return;
            }

            const tiles = TileSystemCore.updateTileStatus(system, interval, status, error);

            state.systems[field]![bucketMs] = {
                ...system,
                tiles,
                lastUpdated: Date.now()
            };
        },

        /**
         * Заменить все тайлы
         */
        replaceTiles(
            state,
            action: PayloadAction<{
                field: FieldName;
                bucketMs: BucketsMs;
                tiles: readonly Tile[];
            }>
        ) {
            const { field, bucketMs, tiles } = action.payload;
            const system = state.systems[field]?.[bucketMs];

            if (!system) {
                console.error('[TileSystem] System not found:', { field, bucketMs });
                return;
            }

            state.systems[field]![bucketMs] = {
                ...system,
                tiles,
                totalBins: tiles.reduce(
                    (sum, t) => sum + (t.status === 'ready' ? t.bins.length : 0),
                    0
                ),
                lastUpdated: Date.now()
            };
        },

        /**
         * Очистить систему для поля
         */
        clearField(state, action: PayloadAction<FieldName>) {
            delete state.systems[action.payload];
        },

        /**
         * Очистить всё
         */
        clearAll(state) {
            state.systems = {};
        }
    }
});

export const tileSystemReducer = tileSystemSlice.reducer;

export const {
    initSystem,
    addTile,
    removeTile,
    updateTileStatus,
    replaceTiles,
    clearField,
    clearAll
} = tileSystemSlice.actions;