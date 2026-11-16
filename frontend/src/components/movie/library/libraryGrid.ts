import { GAP } from "@/components/movie/collection/shared/gridConstants";

export const libraryColumnCount = (width: number): number =>
    Math.max(1, Math.floor((width + GAP) / (150 + GAP)));
