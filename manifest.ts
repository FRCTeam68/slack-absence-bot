import { Manifest } from "deno-slack-sdk/mod.ts";
import ReportAbsenceWorkflow from "./workflows/report_absence.ts";
import DailyAbsenceSummaryWorkflow from "./workflows/daily_absence_summary.ts";
import GoogleProvider from "./external_auth/google_provider.ts";

/**
 * The app manifest contains the app's configuration. This
 * file defines attributes like app name and description.
 * https://api.slack.com/automation/manifest
 */
export default Manifest({
  name: "absence-bot",
  description: "A bot for reporting student and mentor absences",
  icon: "assets/ORANGE-blue-bkgrd.png",
  workflows: [ReportAbsenceWorkflow, DailyAbsenceSummaryWorkflow],
  externalAuthProviders: [GoogleProvider],
  outgoingDomains: ["sheets.googleapis.com"],
  botScopes: [
    "commands",
    "users.profile:read",
    "chat:write",
  ],
});
