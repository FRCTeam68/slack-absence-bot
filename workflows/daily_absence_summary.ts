import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { DailyAbsenceSummaryFunctionDefinition } from "../functions/daily_absence_summary.ts";

/**
 * A workflow is a set of steps that are executed in order.
 * Each step in a workflow is a function.
 * https://api.slack.com/automation/workflows
 */
const DailyAbsenceSummaryWorkflow = DefineWorkflow({
  callback_id: "daily_absence_summary_workflow",
  title: "Daily Absence Summary Workflow",
  description: "Send a daily summary of absences to a channel",
  input_parameters: {
    properties: {
      channel: {
        type: Schema.slack.types.channel_id,
        description: "Channel to send the summary to",
      },
    },
    required: ["channel"],
  },
});

/**
 * The workflow has only one step: sending the daily absence summary
 */
DailyAbsenceSummaryWorkflow.addStep(DailyAbsenceSummaryFunctionDefinition, {
  channel: DailyAbsenceSummaryWorkflow.inputs.channel,
  googleAccessTokenId: { credential_source: "DEVELOPER" },
});

export default DailyAbsenceSummaryWorkflow;
