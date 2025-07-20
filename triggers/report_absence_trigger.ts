import { Trigger } from "deno-slack-api/types.ts";
import ReportAbsenceWorkflow from "../workflows/report_absence.ts";

const trigger: Trigger = {
  type: "shortcut",
  name: "Report Absence",
  workflow: "#/workflows/report_absence", // MATCHES callback_id in report_absence.ts
  inputs: {
    interactivity: {
      value: "{{data.interactivity}}",
    },
  },
};

export default trigger;