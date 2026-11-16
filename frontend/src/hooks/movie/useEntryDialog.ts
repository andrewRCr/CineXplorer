import { useContext } from "react";
import { EntryDialogContext } from "@/contexts/EntryDialogContext";

export function useEntryDialog() {
    return useContext(EntryDialogContext);
}
