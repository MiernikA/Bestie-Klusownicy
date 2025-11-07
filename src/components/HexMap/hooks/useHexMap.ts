import {ref} from "vue";
import {entities} from "@/data/entities";
import type {Entity} from "@/types/entities.types";
import {findPath, getReachableByPath} from "../utils/pathfinding/pathfinding";

export function useHexMap() {
    const entitiesData = ref<Entity[]>(entities);
    const selectedPlayer = ref<Entity | null>(null);
    const reachable = ref<{ col: number; row: number }[]>([]);
    const hoveredPath = ref<{ col: number; row: number }[]>([]);

    const selectPlayer = (entity: Entity) => {
        selectedPlayer.value = entity;
        const blocked = new Set(
            entitiesData.value
                .filter(
                    (e) =>
                        e.type === "obstacle" ||
                        (e.type === "player" && e !== entity)
                )
                .map((e) => `${e.col},${e.row}`)
        );

        reachable.value = getReachableByPath(
            { col: entity.col, row: entity.row },
            4,
            blocked
        );
        hoveredPath.value = [];
    };

    const onHexHover = (col: number, row: number) => {
        if (!selectedPlayer.value) return;
        hoveredPath.value = findPath(
            {col: selectedPlayer.value.col, row: selectedPlayer.value.row},
            {col, row},
            reachable.value
        );
    };

    const onHexClick = (col: number, row: number) => {
        if (!selectedPlayer.value) return;
        const target = reachable.value.find((h) => h.col === col && h.row === row);
        if (target) {
            const path = findPath(
                { col: selectedPlayer.value.col, row: selectedPlayer.value.row },
                { col, row },
                reachable.value
            );
            if (path.length > 0 && path.length <= 5) {
                selectedPlayer.value.col = col;
                selectedPlayer.value.row = row;
                selectedPlayer.value = null;
                reachable.value = [];
                hoveredPath.value = [];
            }
        }
    };

    const isReachable = (col: number, row: number) =>
        reachable.value.some((h) => h.col === col && h.row === row);

    const isPath = (col: number, row: number) =>
        hoveredPath.value.some((h) => h.col === col && h.row === row);

    return {
        entitiesData,
        selectPlayer,
        onHexHover,
        onHexClick,
        isReachable,
        isPath,
    };
}
