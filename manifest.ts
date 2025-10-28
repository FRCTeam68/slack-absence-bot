import { Manifest } from "deno-slack-sdk/mod.ts";
import ReportAbsenceWorkflow from "./workflows/report_absence.ts";
import GoogleProvider from "./external_auth/google_provider.ts";
import { DailyAbsenceSummaryFunctionDefinition } from "./functions/daily_absence_summary.ts"; // <-- import your function

/**
 * The app manifest contains the app's configuration. This
 * file defines attributes like app name and description.
 * https://api.slack.com/automation/manifest
 */
export default Manifest({
  name: "Absence Bot",
  description: "A bot for reporting student absences",
  icon: "assets/ORANGE-blue-bkgrd.png",
  workflows: [ReportAbsenceWorkflow],
  functions: [DailyAbsenceSummaryFunctionDefinition], // <-- add your function here
  externalAuthProviders: [GoogleProvider],
  outgoingDomains: ["sheets.googleapis.com"],
  botScopes: [
    "commands",
    "users.profile:read",
    "chat:write",
    "conversations:write",
    "conversations:read",
  ],
});
