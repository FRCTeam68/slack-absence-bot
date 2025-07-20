// FILE: report_absence_workflow.ts
import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { ReportAbsenceFunctionDefinition } from "../functions/report_absence.ts";

const ReportAbsenceWorkflow = DefineWorkflow({
  callback_id: "report_absence_workflow",
  title: "Report Absence",
  description: "Report a student absence",
  input_parameters: {
    properties: {
      interactivity: { type: Schema.slack.types.interactivity },
      googleAccessTokenId: { type: Schema.types.string }, // or Schema.slack.types.oauth2 if using OAuth2
    },
    required: ["interactivity", "googleAccessTokenId"],
  },
});

ReportAbsenceWorkflow.addStep(ReportAbsenceFunctionDefinition, {
  interactivity: ReportAbsenceWorkflow.inputs.interactivity,
  googleAccessTokenId: ReportAbsenceWorkflow.inputs.googleAccessTokenId,
});

export default ReportAbsenceWorkflow;
