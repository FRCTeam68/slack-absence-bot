import type { Trigger } from "deno-slack-sdk/types.ts";
import { TriggerContextData, TriggerTypes } from "deno-slack-api/mod.ts";
import DailyAbsenceSummaryWorkflow from "../workflows/daily_absence_summary.ts";

/**
 * Scheduled trigger for daily absence summary
 * This trigger will run every weekday at 8:00 AM
 * https://api.slack.com/automation/triggers/scheduled
 */
const dailyAbsenceSummaryTrigger: Trigger<typeof DailyAbsenceSummaryWorkflow.definition> = {
  type: TriggerTypes.Scheduled,
  name: "Daily Absence Summary",
  description: "Send daily absence summary every weekday at 8 AM",
  workflow: `#/workflows/${DailyAbsenceSummaryWorkflow.definition.callback_id}`,
  schedule: {
    start_time: "2025-01-01T17:55:00Z", // Start date - adjusted to 5:55 PM
    timezone: "America/New_York", // Adjust to your timezone
    frequency: { type: "weekly", on_days: ["Tuesday", "Thursday", "Saturday"] },
  },
  inputs: {
    channel: {
      value: "C09617PT0N8", // Replace with your actual channel ID
    },
  },
};

export default dailyAbsenceSummaryTrigger;
