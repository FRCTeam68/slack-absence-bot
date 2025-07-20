import type { Trigger } from "deno-slack-sdk/types.ts";
import { TriggerContextData, TriggerTypes } from "deno-slack-api/mod.ts";
import DailyAbsenceSummaryWorkflow from "../workflows/daily_absence_summary.ts";

/**
 * Manual trigger for testing daily absence summary
 * This creates a shortcut button that can be used to test the daily summary manually
 * https://api.slack.com/automation/triggers/shortcut
 */
const manualAbsenceSummaryTrigger: Trigger<typeof DailyAbsenceSummaryWorkflow.definition> = {
  type: TriggerTypes.Shortcut,
  name: "Test Daily Absence Summary",
  description: "Manually trigger the daily absence summary for testing",
  workflow: `#/workflows/${DailyAbsenceSummaryWorkflow.definition.callback_id}`,
  inputs: {
    channel: {
      value: "C09617PT0N8", // Same channel as the scheduled trigger
    },
  },
};

export default manualAbsenceSummaryTrigger;
