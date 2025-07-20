// FILE: report_absence_workflow.ts
import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { ReportAbsenceFunctionDefinition } from "../functions/report_absence.ts";

const ReportAbsenceWorkflow = DefineWorkflow({
  callback_id: "report_absence_workflow",
  title: "Report Absence",
  description: "Prompt user to report absence and choose between recurring or one-time",
  input_parameters: {
    properties: {
      interactivity: { type: Schema.slack.types.interactivity },
      // Optionally, add googleAccessTokenId if you want to pass it in
      // googleAccessTokenId: { type: Schema.slack.types.oauth2, oauth2_provider_key: "google" },
    },
    required: ["interactivity"],
  },
});

// Add your custom function as a step
ReportAbsenceWorkflow.addStep(ReportAbsenceFunctionDefinition, {
  interactivity: ReportAbsenceWorkflow.inputs.interactivity,
  googleAccessTokenId: { credential_source: "DEVELOPER" }, // or use workflow input if you add it above
});

export default ReportAbsenceWorkflow;
