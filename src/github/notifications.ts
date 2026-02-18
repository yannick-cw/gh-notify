import z from "zod";
import { Result } from "../errors.js";
import { getGithub } from "./api.js";


const notificationsUrl = "https://api.github.com/notifications"

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
    repository: z.object({
        full_name: z.string(),
    }),
});

const notificationsSchema = z.array(notificationSchema)

type GitNotification = z.infer<typeof notificationSchema>;

export async function fetchNotifications(token: string): Promise<Result<GitNotification[]>> {
    return await getGithub(token, notificationsUrl, notificationsSchema)
}
