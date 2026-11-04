import { useCallback, useState } from "react";

/** Keep typing local until an external value changes, without remounting the input. */
export default function useInputDraft(
    externalValue: string,
    resetKey = externalValue,
) {
    const [draft, setDraft] = useState({ resetKey, value: externalValue });
    // The key records raw external transitions even when normalized values are equal.
    const changed = draft.resetKey !== resetKey;
    if (changed) setDraft({ resetKey, value: externalValue });
    const setValue = useCallback((value: string) => {
        setDraft((current) =>
            current.value === value ? current : { ...current, value },
        );
    }, []);
    return [changed ? externalValue : draft.value, setValue] as const;
}
