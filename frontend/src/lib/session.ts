import { isCancel, CanceledError } from "axios";
import { siteOrigin } from "@/config/baseUrls";
import { isRecord } from "@/utilities/typeGuards";
import {
    getAuthTokens,
    areTokensExpired,
    clearAuthTokens,
} from "@/utilities/tokenUtils";
import {
    getAuthSessionVersion,
    refreshAccessToken,
} from "@/services/apiClient";
import * as authService from "@/services/authService";
import type { components } from "@/types/api";
import type { QueryClient } from "@tanstack/react-query";
import { toaster } from "@/components/core/chakra/toaster";

/** A tab's save ownership changes whenever its signed-in user changes. */
let changeCount = 0;
let toastSequence = 0;
const saveToastPrefix = "movie-save:";

export const getChangeCount = () => changeCount;
export const createSaveToastId = () =>
    `${saveToastPrefix}${changeCount}:${++toastSequence}`;
export const sessionKey = ["session"] as const;

export function beginUserChange(client: QueryClient) {
    changeCount++;
    client.getMutationCache().clear();
    for (const toast of toaster.getVisibleToasts()) {
        if (toast.id?.startsWith(saveToastPrefix)) toaster.remove(toast.id);
    }
}
export const resetUserQueries = (client: QueryClient) =>
    client.resetQueries({
        predicate: (query) => query.queryKey[0] !== sessionKey[0],
    });
export function changeOfUser(client: QueryClient) {
    beginUserChange(client);
    return resetUserQueries(client);
}

type UserProfile = components["schemas"]["UserProfileSchema"];
export const ALLAUTH_SESSION_URL = `${siteOrigin}/_allauth/browser/v1/auth/session`;

const isUserProfile = (value: unknown): value is UserProfile => {
    if (!isRecord(value) || typeof value.username !== "string") return false;

    const nullableStrings = ["email", "first_name", "last_name", "full_name"];
    return (
        nullableStrings.every(
            (key) =>
                value[key] === undefined ||
                value[key] === null ||
                typeof value[key] === "string",
        ) &&
        (value.id === undefined ||
            value.id === null ||
            typeof value.id === "number") &&
        (value.email_verified === undefined ||
            value.email_verified === null ||
            typeof value.email_verified === "boolean")
    );
};

/**
 * Check OAuth session status via allauth session endpoint.
 * Used for both initial mount detection and OAuth callback handling.
 * @returns User profile if authenticated, null otherwise
 */
export async function checkOAuthSession(): Promise<UserProfile | null> {
    try {
        const response = await fetch(ALLAUTH_SESSION_URL, {
            method: "GET",
            credentials: "include",
        });

        if (response.ok) {
            const data: unknown = await response.json();
            if (
                isRecord(data) &&
                isRecord(data.meta) &&
                data.meta.is_authenticated === true &&
                isRecord(data.data) &&
                isUserProfile(data.data.user)
            ) {
                return data.data.user;
            }
        }
        return null;
    } catch {
        return null;
    }
}

export async function readSession(): Promise<UserProfile | null> {
    const version = getAuthSessionVersion();
    const assertCurrent = () => {
        if (version !== getAuthSessionVersion())
            throw new CanceledError("Authentication session changed");
    };
    const { access_token } = getAuthTokens();
    if (!access_token) {
        const user = await checkOAuthSession();
        assertCurrent();
        return user;
    }
    try {
        if (areTokensExpired()) await refreshAccessToken();
        assertCurrent();
        const user = await authService.getUserProfile();
        assertCurrent();
        return user;
    } catch (error) {
        if (isCancel(error) || version !== getAuthSessionVersion()) throw error;
        clearAuthTokens();
        return null;
    }
}
