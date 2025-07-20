import { Manifest } from "deno-slack-sdk/mod.ts";
import CollectHoursWorkflow from "./workflows/collect_hours.ts";
import GoogleProvider from "./external_auth/google_provider.ts";

/**
 * The app manifest contains the app's configuration. This
 * file defines attributes like app name and description.
 * https://api.slack.com/automation/manifest
 */
export default Manifest({
  name: "absence-bot",
  description: "A form for collecting hours worked",
  icon: "assets/ORANGE-blue-bkgrd.png",
  workflows: [CollectHoursWorkflow],
  externalAuthProviders: [GoogleProvider],
  outgoingDomains: ["sheets.googleapis.com"],
  botScopes: [
    "commands",
    "users.profile:read",
  ],
});
