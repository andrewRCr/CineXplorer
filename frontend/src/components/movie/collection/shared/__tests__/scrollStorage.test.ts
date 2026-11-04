/**
 * Tests for scroll position persistence utilities.
 *
 * These utilities handle sessionStorage-based scroll position saving and
 * restoration for back-navigation UX. Tests verify:
 * - Deterministic key generation from filter params
 * - Scroll position save/retrieve round-trips
 * - Cleanup logic when storage limit exceeded
 * - Graceful error handling when sessionStorage fails
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
    getScrollStorageKey,
    getSavedScrollPosition,
    saveScrollPosition,
    getScrollKeys,
    cleanupOldScrollPositions,
} from "../scrollStorage";

/** Helper to create JSON storage entry format */
const createStorageEntry = (position: number, timestamp = Date.now()) =>
    JSON.stringify({ position, timestamp });

describe("scrollStorage", () => {
    beforeEach(() => {
        // Clear sessionStorage before each test
        sessionStorage.clear();
    });

    describe("getScrollStorageKey", () => {
        describe("basic key generation", () => {
            it("generates key with prefix and source when no params", () => {
                const key = getScrollStorageKey("discover", {});

                expect(key).toBe("scroll-discover-");
            });

            it("generates key with single param", () => {
                const key = getScrollStorageKey("browse", { minYear: "2020" });

                expect(key).toBe("scroll-browse-minYear=2020");
            });

            it("generates key with source embedded in result", () => {
                const key = getScrollStorageKey("search", { minRating: "7" });

                expect(key).toContain("search");
                expect(key.startsWith("scroll-")).toBe(true);
            });
        });

        describe("param sorting for determinism", () => {
            it("sorts params alphabetically for deterministic keys", () => {
                // Pass params in non-alphabetical order
                const key = getScrollStorageKey("browse", {
                    sortBy: "popularity.desc",
                    minYear: "2020",
                    language: "en",
                });

                // Should be sorted: language, minYear, sortBy
                expect(key).toBe(
                    "scroll-browse-language=en&minYear=2020&sortBy=popularity.desc",
                );
            });

            it("produces same key regardless of param insertion order", () => {
                const key1 = getScrollStorageKey("browse", {
                    minYear: "2020",
                    maxYear: "2024",
                    minRating: "7",
                });

                const key2 = getScrollStorageKey("browse", {
                    minRating: "7",
                    minYear: "2020",
                    maxYear: "2024",
                });

                expect(key1).toBe(key2);
            });
        });

        describe("array param handling", () => {
            it("joins array values with commas", () => {
                const key = getScrollStorageKey("browse", {
                    genres: [28, 12, 878],
                });

                expect(key).toBe("scroll-browse-genres=28,12,878");
            });

            it("handles string arrays (certifications)", () => {
                const key = getScrollStorageKey("browse", {
                    certifications: ["PG", "PG-13", "R"],
                });

                expect(key).toBe("scroll-browse-certifications=PG,PG-13,R");
            });

            it("filters out empty arrays", () => {
                const key = getScrollStorageKey("browse", {
                    genres: [],
                    minYear: "2020",
                });

                // Empty genres should not appear in key
                expect(key).toBe("scroll-browse-minYear=2020");
                expect(key).not.toContain("genres");
            });

            it("includes non-empty arrays alongside other params", () => {
                const key = getScrollStorageKey("browse", {
                    genres: [28],
                    minYear: "2020",
                });

                expect(key).toContain("genres=28");
                expect(key).toContain("minYear=2020");
            });
        });

        describe("falsy value filtering", () => {
            it("filters out undefined values", () => {
                const key = getScrollStorageKey("browse", {
                    minYear: "2020",
                    maxYear: undefined,
                });

                expect(key).toBe("scroll-browse-minYear=2020");
                expect(key).not.toContain("maxYear");
            });

            it("filters out null values", () => {
                const key = getScrollStorageKey("browse", {
                    minYear: "2020",
                    maxYear: null as unknown as string,
                });

                expect(key).toBe("scroll-browse-minYear=2020");
                expect(key).not.toContain("maxYear");
            });

            it("filters out empty string values", () => {
                const key = getScrollStorageKey("browse", {
                    minYear: "2020",
                    maxYear: "",
                });

                expect(key).toBe("scroll-browse-minYear=2020");
                expect(key).not.toContain("maxYear");
            });

            it("keeps zero as a valid value", () => {
                // Zero is a valid numeric value that shouldn't be filtered
                const key = getScrollStorageKey("browse", {
                    minRating: "0",
                });

                expect(key).toBe("scroll-browse-minRating=0");
            });
        });

        describe("special character handling", () => {
            it("handles param values with special characters", () => {
                const key = getScrollStorageKey("browse", {
                    sortBy: "vote_average.desc",
                });

                expect(key).toContain("sortBy=vote_average.desc");
            });

            it("creates unique keys for different filter combinations", () => {
                const actionKey = getScrollStorageKey("browse", {
                    genres: [28],
                });
                const comedyKey = getScrollStorageKey("browse", {
                    genres: [35],
                });

                expect(actionKey).not.toBe(comedyKey);
            });
        });
    });

    describe("getSavedScrollPosition", () => {
        it("returns saved position for existing key", () => {
            const key = "scroll-browse-test";
            sessionStorage.setItem(key, createStorageEntry(500));

            const position = getSavedScrollPosition(key);

            expect(position).toBe(500);
        });

        it("returns 0 for non-existent key", () => {
            const position = getSavedScrollPosition("scroll-nonexistent-key");

            expect(position).toBe(0);
        });

        it("returns 0 when key has empty string value", () => {
            sessionStorage.setItem("scroll-empty", "");

            const position = getSavedScrollPosition("scroll-empty");

            expect(position).toBe(0);
        });

        it("handles position 0 correctly (top of page)", () => {
            const key = "scroll-top";
            sessionStorage.setItem(key, createStorageEntry(0));

            const position = getSavedScrollPosition(key);

            expect(position).toBe(0);
        });

        it("handles very large positions", () => {
            const key = "scroll-large";
            const largePosition = 999999;
            sessionStorage.setItem(key, createStorageEntry(largePosition));

            const position = getSavedScrollPosition(key);

            expect(position).toBe(largePosition);
        });

        it("returns 0 for malformed JSON", () => {
            const key = "scroll-malformed";
            sessionStorage.setItem(key, "not-valid-json");

            const position = getSavedScrollPosition(key);

            expect(position).toBe(0);
        });

        it("returns 0 for JSON missing required fields", () => {
            const key = "scroll-incomplete";
            sessionStorage.setItem(key, JSON.stringify({ position: 500 })); // missing timestamp

            const position = getSavedScrollPosition(key);

            expect(position).toBe(0);
        });
    });

    describe("saveScrollPosition", () => {
        it("saves position to sessionStorage", () => {
            const key = "scroll-save-test";

            saveScrollPosition(key, 750);

            // Verify via round-trip (tests behavior, not storage format)
            expect(getSavedScrollPosition(key)).toBe(750);
        });

        it("overwrites existing position", () => {
            const key = "scroll-overwrite";
            saveScrollPosition(key, 100);

            saveScrollPosition(key, 500);

            // Verify via round-trip (tests behavior, not storage format)
            expect(getSavedScrollPosition(key)).toBe(500);
        });

        it("saves position 0 correctly", () => {
            const key = "scroll-zero";

            saveScrollPosition(key, 0);

            // Verify via round-trip (tests behavior, not storage format)
            expect(getSavedScrollPosition(key)).toBe(0);
        });

        it("triggers cleanup after save", () => {
            // Fill storage to max capacity with entries having ascending timestamps
            const baseTime = Date.now() - 30000; // Start 30 seconds ago
            for (let i = 0; i < 25; i++) {
                sessionStorage.setItem(
                    `scroll-old-${i}`,
                    createStorageEntry(i * 100, baseTime + i * 1000),
                );
            }

            // Save new position - should trigger cleanup
            saveScrollPosition("scroll-new-key", 1000);

            // Verify cleanup happened (total keys should be at or under limit)
            const keys = getScrollKeys();
            expect(keys.length).toBeLessThanOrEqual(21); // MAX + 1 for the new key
        });
    });

    describe("getScrollKeys", () => {
        it("returns empty array when no scroll keys exist", () => {
            const keys = getScrollKeys();

            expect(keys).toEqual([]);
        });

        it("returns only keys with scroll prefix", () => {
            sessionStorage.setItem(
                "scroll-browse-test",
                createStorageEntry(100),
            );
            sessionStorage.setItem(
                "scroll-search-query",
                createStorageEntry(200),
            );
            sessionStorage.setItem("other-key", "300");
            sessionStorage.setItem("auth-token", "abc");

            const keys = getScrollKeys();

            expect(keys).toContain("scroll-browse-test");
            expect(keys).toContain("scroll-search-query");
            expect(keys).not.toContain("other-key");
            expect(keys).not.toContain("auth-token");
            expect(keys).toHaveLength(2);
        });

        it("handles mixed storage content", () => {
            sessionStorage.setItem("scroll-a", createStorageEntry(1));
            sessionStorage.setItem("not-scroll", "2");
            sessionStorage.setItem("scroll-b", createStorageEntry(3));

            const keys = getScrollKeys();

            expect(keys).toHaveLength(2);
            expect(keys).toContain("scroll-a");
            expect(keys).toContain("scroll-b");
        });
    });

    describe("cleanupOldScrollPositions", () => {
        it("does not remove keys when under limit", () => {
            // Add 5 keys (well under the 20 limit)
            for (let i = 0; i < 5; i++) {
                sessionStorage.setItem(
                    `scroll-key-${i}`,
                    createStorageEntry(i * 100),
                );
            }

            cleanupOldScrollPositions("scroll-current");

            const keys = getScrollKeys();
            expect(keys).toHaveLength(5);
        });

        it("removes oldest keys when at limit", () => {
            // Add exactly MAX_STORED_POSITIONS keys with ascending timestamps
            const baseTime = Date.now() - 30000;
            for (let i = 0; i < 20; i++) {
                sessionStorage.setItem(
                    `scroll-key-${i}`,
                    createStorageEntry(i * 100, baseTime + i * 1000),
                );
            }

            cleanupOldScrollPositions("scroll-current");

            const keys = getScrollKeys();
            // Should have removed 1 to make room (20 - 1 = 19, plus current = 20)
            expect(keys.length).toBeLessThanOrEqual(20);
        });

        it("never removes the current key during cleanup", () => {
            // Fill storage with ascending timestamps
            const baseTime = Date.now() - 30000;
            for (let i = 0; i < 25; i++) {
                sessionStorage.setItem(
                    `scroll-key-${i}`,
                    createStorageEntry(i * 100, baseTime + i * 1000),
                );
            }

            const currentKey = "scroll-key-10";
            cleanupOldScrollPositions(currentKey);

            // Current key should still exist
            expect(sessionStorage.getItem(currentKey)).not.toBeNull();
        });

        it("removes oldest entries first (by timestamp)", () => {
            // Add 25 keys with explicit timestamps - older entries have lower timestamps
            const baseTime = Date.now() - 30000;
            for (let i = 0; i < 25; i++) {
                sessionStorage.setItem(
                    `scroll-key-${i}`,
                    createStorageEntry(i * 100, baseTime + i * 1000),
                );
            }

            cleanupOldScrollPositions("scroll-current");

            const keys = getScrollKeys();

            // Oldest keys (key-0, key-1, etc.) should have been removed
            // Newer keys (key-20+) should remain
            expect(keys).not.toContain("scroll-key-0");
            expect(keys).not.toContain("scroll-key-1");
            expect(keys).toContain("scroll-key-24"); // Newest should remain
        });
    });

    describe("error handling", () => {
        // Store original sessionStorage to restore after tests
        let originalSessionStorage: Storage;
        let mockStorage: {
            getItem: ReturnType<typeof vi.fn>;
            setItem: ReturnType<typeof vi.fn>;
            removeItem: ReturnType<typeof vi.fn>;
            clear: ReturnType<typeof vi.fn>;
            key: ReturnType<typeof vi.fn>;
            length: number;
        };

        beforeEach(() => {
            // Save original sessionStorage
            originalSessionStorage = window.sessionStorage;

            // Create mock that can throw errors
            mockStorage = {
                getItem: vi.fn(),
                setItem: vi.fn(),
                removeItem: vi.fn(),
                clear: vi.fn(),
                key: vi.fn(),
                length: 0,
            };

            // Replace sessionStorage with mock
            Object.defineProperty(window, "sessionStorage", {
                value: mockStorage,
                writable: true,
                configurable: true,
            });
        });

        afterEach(() => {
            // Restore original sessionStorage
            Object.defineProperty(window, "sessionStorage", {
                value: originalSessionStorage,
                writable: true,
                configurable: true,
            });
        });

        it("returns 0 when getItem throws", () => {
            mockStorage.getItem.mockImplementation(() => {
                throw new Error("Storage access denied");
            });

            const position = getSavedScrollPosition("scroll-test");

            expect(position).toBe(0);
        });

        it("fails silently when setItem throws", () => {
            mockStorage.setItem.mockImplementation(() => {
                throw new Error("QuotaExceededError");
            });
            mockStorage.length = 0;
            mockStorage.key.mockReturnValue(null);

            // Should not throw
            expect(() => saveScrollPosition("scroll-test", 500)).not.toThrow();
        });

        it("handles quota exceeded gracefully", () => {
            mockStorage.setItem.mockImplementation(() => {
                const error = new Error("QuotaExceededError");
                error.name = "QuotaExceededError";
                throw error;
            });
            mockStorage.length = 0;

            // Should not throw, just silently fail
            expect(() => saveScrollPosition("scroll-test", 500)).not.toThrow();
        });

        it("returns empty array when iterating storage throws", () => {
            mockStorage.key.mockImplementation(() => {
                throw new Error("Storage iteration failed");
            });
            mockStorage.length = 5;

            const keys = getScrollKeys();

            expect(keys).toEqual([]);
        });

        it("handles cleanup errors gracefully", () => {
            mockStorage.length = 25;
            mockStorage.key.mockImplementation(() => {
                throw new Error("Storage error");
            });

            // Should not throw
            expect(() =>
                cleanupOldScrollPositions("scroll-current"),
            ).not.toThrow();
        });
    });

    describe("integration scenarios", () => {
        it("round-trips save and retrieve correctly", () => {
            const key = getScrollStorageKey("browse", {
                genres: [28, 12],
                minYear: "2020",
            });
            const position = 1500;

            saveScrollPosition(key, position);
            const retrieved = getSavedScrollPosition(key);

            expect(retrieved).toBe(position);
        });

        it("differentiates positions by filter combination", () => {
            const actionKey = getScrollStorageKey("browse", { genres: [28] });
            const comedyKey = getScrollStorageKey("browse", { genres: [35] });

            saveScrollPosition(actionKey, 1000);
            saveScrollPosition(comedyKey, 2000);

            expect(getSavedScrollPosition(actionKey)).toBe(1000);
            expect(getSavedScrollPosition(comedyKey)).toBe(2000);
        });

        it("maintains correct position after multiple saves to same key", () => {
            const key = getScrollStorageKey("discover", {});

            saveScrollPosition(key, 100);
            saveScrollPosition(key, 500);
            saveScrollPosition(key, 250);

            expect(getSavedScrollPosition(key)).toBe(250);
        });
    });
});
