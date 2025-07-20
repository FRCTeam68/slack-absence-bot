import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { ReportAbsenceFunctionDefinition } from "../functions/report_absence.ts";

const ReportAbsenceWorkflow = DefineWorkflow({
  callback_id: "report_absence",
  title: "Report Absence",
  description: "Lets a user report an absence",
  input_parameters: {
    properties: {
      interactivity: {
        type: Schema.slack.types.interactivity,
      },
    },
    required: ["interactivity"],
  },
});

ReportAbsenceWorkflow.addStep(ReportAbsenceFunctionDefinition, {
  interactivity: ReportAbsenceWorkflow.inputs.interactivity,
  googleAccessTokenId: { credential_source: "DEVELOPER" },
});

export default ReportAbsenceWorkflow;
