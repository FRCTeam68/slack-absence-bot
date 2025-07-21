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

      // Get today's date for the header
      const today = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'numeric', 
        day: 'numeric',
        timeZone: 'America/New_York' // <-- set your desired timezone
      });

      let blocks: any[] = [];
      
      // Header section - using header block type like in example
      blocks.push({
        type: "header",
        text: {
          type: "plain_text",
          text: `📝 Absences for ${today}`,
          emoji: true
        }
      });

      blocks.push({
        type: "divider"
      });

      if (absenceRows.length === 0) {
        // No absences - celebration message
        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: "🎉 *Great news!*\nNo absences reported for today."
          }
        });
      } else {
        // Add each absence following the example format
        absenceRows.forEach((row) => {
          const [name, employeeId, date, absenceType, arrivalTime, departureTime, reason, notes] = row;
          
          // Determine absence type text
          const absenceTypeText = absenceType === "full" ? "Full Meeting Absence" : "Late Arrival / Early Departure";
          
          // Main absence section - @mention user and type
          blocks.push({
            type: "section",
            text: {
              type: "mrkdwn",
              text: `<@${employeeId}>\n${absenceTypeText}`
            }
          });

          // Add time context only if there are arrival/departure times
          const timeElements: any[] = [];
          if (arrivalTime) {
            timeElements.push({
              type: "mrkdwn",
              text: `🕐 Arriving: ${arrivalTime}`
            });
          }
          if (departureTime) {
            timeElements.push({
              type: "mrkdwn", 
              text: `🕐 Departing: ${departureTime}`
            });
          }

          // Only add context block if there are time elements
          if (timeElements.length > 0) {
            blocks.push({
              type: "context",
              elements: timeElements
            });
          }
        });

        // Add footer - divider and summary
        blocks.push({
          type: "divider"
        });

        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `📊 *Total absences: ${absenceRows.length}*`
          }
        });
      }

      // Send message with blocks to the specified channel
      const result = await client.chat.postMessage({
        channel: inputs.channel,
        blocks: blocks,
        text: `Absences for ${today}`, // Fallback text for notifications
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
