import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";

export const DailyAbsenceSummaryFunctionDefinition = DefineFunction({
  callback_id: "daily_absence_summary",
  title: "Daily Absence Summary",
  description: "Send a summary of today's absences to a channel",
  source_file: "functions/daily_absence_summary.ts",
  input_parameters: {
    properties: {
      channel: { type: Schema.slack.types.channel_id },
      googleAccessTokenId: { type: Schema.slack.types.oauth2, oauth2_provider_key: "google" },
    },
    required: ["channel", "googleAccessTokenId"],
  },
  output_parameters: {
    properties: {
      success: { type: Schema.types.boolean },
    },
    required: [],
  },
});

export default SlackFunction(
  DailyAbsenceSummaryFunctionDefinition,
  async ({ inputs, client, env }) => {
    try {
      console.log("Daily absence summary function started");

      // Get Google auth token - this will be provided by the workflow
      const auth = await client.apps.auth.external.get({
        external_token_id: inputs.googleAccessTokenId,
      });
      if (!auth.ok) {
        console.error("Failed to collect Google auth token:", auth.error);
        return { success: false };
      }
      console.log("Google auth token acquired");

      // Read today's absences from the filtered sheet
      // Assuming your filtered data is on a sheet called "Today's Absences" or similar
      // Adjust the sheet name and range as needed
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SPREADSHEET_ID}/values/Today's%20Absences!A:H?valueRenderOption=FORMATTED_VALUE`;
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${auth.external_token}`,
        },
      });

      if (!response.ok) {
        console.error("Failed to fetch today's absences:", response.statusText);
        return { success: false };
      }

      const data = await response.json();
      const rows = data.values || [];
      
      // Skip header row if it exists
      const absenceRows = rows.slice(1);
      
      console.log(`Found ${absenceRows.length} absences for today`);

      let message = "";
      
      if (absenceRows.length === 0) {
        message = "🎉 Great news! No absences reported for today.";
      } else {
        message = `📅 *Today's Absences (${absenceRows.length} total)*\n\n`;
        
        absenceRows.forEach((row, index) => {
          const [name, employeeId, date, absenceType, arrivalTime, departureTime, reason, notes] = row;
          
          message += `${index + 1}. *${name || 'Unknown'}*\n`;
          message += `   • Type: ${absenceType || 'Not specified'}\n`;
          
          if (arrivalTime) {
            message += `   • Arrival: ${arrivalTime}\n`;
          }
          if (departureTime) {
            message += `   • Departure: ${departureTime}\n`;
          }
          
          message += `   • Reason: ${reason || 'Not specified'}\n`;
          
          if (notes) {
            message += `   • Notes: ${notes}\n`;
          }
          
          message += "\n";
        });
      }

      // Send message to the specified channel
      const result = await client.chat.postMessage({
        channel: inputs.channel,
        text: message,
        unfurl_links: false,
        unfurl_media: false,
      });

      if (!result.ok) {
        console.error("Failed to send message:", result.error);
        return { success: false };
      }

      console.log("Daily absence summary sent successfully");
      return { success: true };

    } catch (error) {
      console.error("Error in daily absence summary:", error);
      return { success: false };
    }
  },
);
