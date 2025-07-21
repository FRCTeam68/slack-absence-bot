import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { ReportAbsenceFunctionDefinition } from "../functions/report_absence.ts";

const ReportAbsenceWorkflow = DefineWorkflow({
  callback_id: "report_absence_workflow",
  title: "Excused Absence Form",
  description: "Prompt user to report absence and choose between recurring or one-time",
  input_parameters: {
    properties: {
      interactivity: { type: Schema.slack.types.interactivity },
    },
    required: ["interactivity"],
  },
});

ReportAbsenceWorkflow.addStep(ReportAbsenceFunctionDefinition, {
  interactivity: ReportAbsenceWorkflow.inputs.interactivity,
  googleAccessTokenId: { credential_source: "DEVELOPER" },
});

export default ReportAbsenceWorkflow;