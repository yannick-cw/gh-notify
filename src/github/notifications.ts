import z from "zod";
import { Result } from "../errors.js";
import { getGithub } from "./api.js";


const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
export const defaultSince = new Date(Date.now() - THREE_DAYS_MS).toISOString();

function notificationsUrl(since: string): string {
    return `https://api.github.com/notifications?all=true&since=${since}`;
}

const notificationSchema = z.object({
    id: z.string(),
    subject: z.object({
        title: z.string(),
        url: z.string(),
        latest_comment_url: z.string().nullable(),
        type: z.string(),
    }),
    reason: z.string(),
    unread: z.boolean(),
    updated_at: z.string(),
    last_read_at: z.string().nullable(),
    repository: z.object({
        full_name: z.string(),
        owner: z.object({
            login: z.string(),
        }),
    }),
});

export const notificationsSchema = z.array(notificationSchema)

export type GitNotification = z.infer<typeof notificationSchema>;

export const enrichedNotificationSchema = notificationSchema.extend({
    requested_reviewers: z.array(z.object({ login: z.string() })).optional(),
    requested_teams: z.array(z.object({ name: z.string(), slug: z.string() })).optional(),
    latest_comment: z.object({
        body: z.string().nullable(),
        user: z.object({ login: z.string() }),
        state: z.string().optional(),
    }).optional(),
});

export const enrichedNotificationsSchema = z.array(enrichedNotificationSchema);
export type EnrichedNotification = z.infer<typeof enrichedNotificationSchema>;

export async function fetchNotifications(token: string, since: string): Promise<Result<GitNotification[]>> {
    return await getGithub(token, notificationsUrl(since), notificationsSchema)
}
