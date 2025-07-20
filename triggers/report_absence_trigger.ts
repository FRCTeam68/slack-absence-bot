import type { Trigger } from "deno-slack-sdk/types.ts";
import { TriggerContextData, TriggerTypes } from "deno-slack-api/mod.ts";
import ReportAbsenceWorkflow from "../workflows/report_absence.ts";

/**
 * Triggers determine when workflows are executed. A trigger
 * file describes a scenario in which a workflow should be run,
 * such as a user pressing a button or when a specific event occurs.
 * https://api.slack.com/automation/triggers
 */
const reportAbsenceTrigger: Trigger<typeof ReportAbsenceWorkflow.definition> = {
  type: TriggerTypes.Shortcut,
  name: "Report Absence",
  description: "Report a student or mentor absence",
  workflow: `#/workflows/${ReportAbsenceWorkflow.definition.callback_id}`,
  inputs: {
    interactivity: {
      value: TriggerContextData.Shortcut.interactivity,
    },
    // If your workflow requires googleAccessTokenId as input, add it here
    // googleAccessTokenId: {
    //   value: { credential_source: "DEVELOPER" },
    // },
  },
};

export default reportAbsenceTrigger;
