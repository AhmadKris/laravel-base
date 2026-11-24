import { apiClient } from './api-client';

type AvatarRef = { version: string } | null | undefined;

/**
 * The version in the URL changes with every upload, so a new photo shows even when the old one is cached.
 */
export function ownAvatarUrl(avatar: AvatarRef): string | undefined {
    return avatar
        ? `${apiClient.defaults.baseURL ?? ''}/account/avatar?v=${avatar.version}`
        : undefined;
}

export function userAvatarUrl(userId: string, avatar: AvatarRef): string | undefined {
    return avatar
        ? `${apiClient.defaults.baseURL ?? ''}/users/${userId}/avatar?v=${avatar.version}`
        : undefined;
}
