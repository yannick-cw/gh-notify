import z from "zod";

const filterRuleSchema = z.object({
    reason: z.enum(["mention", "team_mention", "review_requested", "author", "subscribed"]),
    kind: z.enum(["INCLUDE", "EXCLUDE"]),
});
export const filterRulesSchema = z.array(filterRuleSchema)

export type FilterRule = z.infer<typeof filterRuleSchema>;

