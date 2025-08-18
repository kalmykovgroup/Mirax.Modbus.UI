import type {RootState} from "@/store/store.ts";


export const selectFormattedLastActive = (state: RootState) => {
    const ts = state.users.lastActive;
    if (!ts) return "—";
    return new Date(ts).toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
};
