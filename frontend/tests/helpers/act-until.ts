import { act } from "@testing-library/react";

export async function actUntil<T>(
    description: string,
    action: () => Promise<T>,
    timeout = 2000,
): Promise<T> {
    const outcome = await act(async () => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
            return await Promise.race([
                action().then((value) => ({ value })),
                new Promise<{ error: Error }>((resolve) => {
                    timer = setTimeout(
                        () =>
                            resolve({
                                error: new Error(
                                    `Timed out waiting for ${description}`,
                                ),
                            }),
                        timeout,
                    );
                }),
            ]);
        } catch (error) {
            return { error };
        } finally {
            clearTimeout(timer);
        }
    });

    // Let React drain the act queue before a failed wait leaves the test.
    if ("error" in outcome) throw outcome.error;
    return outcome.value;
}
