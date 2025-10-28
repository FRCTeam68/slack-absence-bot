import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";

export const ReportAbsenceFunctionDefinition = DefineFunction({
  callback_id: "report_absence",
  title: "Report Absence",
  description: "Store absence in a Google sheet",
  source_file: "functions/report_absence.ts",
  input_parameters: {
    properties: {
      interactivity: { type: Schema.slack.types.interactivity },
      googleAccessTokenId: {
        type: Schema.slack.types.oauth2,
        oauth2_provider_key: "google",
      },
    },
    required: ["interactivity", "googleAccessTokenId"],
  },
  output_parameters: {
    properties: {
      success: { type: Schema.types.boolean },
    },
    required: ["success"],
  },
});

export default SlackFunction(
  ReportAbsenceFunctionDefinition,
  async ({ inputs, client, env }) => {
    // Step 1: Show the first modal (recurring or not)
    const result = await client.views.open({
      interactivity_pointer: inputs.interactivity.interactivity_pointer,
      view: {
        type: "modal",
        callback_id: "absence_type_modal",
        title: { type: "plain_text", text: "Report Absence" },
        submit: { type: "plain_text", text: "Next" },
        blocks: [
          {
            type: "input",
            block_id: "recurring_block",
            label: { type: "plain_text", text: "Is this a recurring absence?" },
            element: {
              type: "static_select",
              action_id: "recurring_select",
              options: [
                { text: { type: "plain_text", text: "Yes" }, value: "yes" },
                { text: { type: "plain_text", text: "No" }, value: "no" },
              ],
            },
          },
        ],
      },
    });

    if (!result.ok) {
      return { error: `Failed to open modal: ${result.error}` };
    }

    return { completed: false }; // Wait for user input
  }
)
.addViewSubmissionHandler("absence_type_modal", async ({ view }) => {
  const recurring = view.state.values.recurring_block.recurring_select.selected_option.value;
  let nextModal;
  const absenceTypeBlock = {
    type: "input",
    block_id: "absence_type_block",
    label: { type: "plain_text", text: "Absence Type" },
    element: {
      type: "static_select",
      action_id: "absence_type",
      options: [
        { text: { type: "plain_text", text: "Full Meeting" }, value: "full" },
        { text: { type: "plain_text", text: "Late Arrival / Early Departure" }, value: "partial" },
      ],
    },
  };
  const arrivalTimeBlock = {
    type: "input",
    block_id: "arrival_time_block",
    label: { type: "plain_text", text: "Arrival Time" },
    optional: true,
    element: {
      type: "timepicker",
      action_id: "arrival_time",
      placeholder: { type: "plain_text", text: "Select time" },
    },
  };
  const departureTimeBlock = {
    type: "input",
    block_id: "departure_time_block",
    label: { type: "plain_text", text: "Departure Time" },
    optional: true,
    element: {
      type: "timepicker",
      action_id: "departure_time",
      placeholder: { type: "plain_text", text: "Select time" },
    },
  };

  if (recurring === "yes") {
    nextModal = {
      type: "modal",
      callback_id: "recurring_absence_modal",
      title: { type: "plain_text", text: "Recurring Absence" },
      submit: { type: "plain_text", text: "Submit" },
      blocks: [
        {
          type: "input",
          block_id: "start_block",
          label: { type: "plain_text", text: "Start Date" },
          element: {
            type: "datepicker",
            action_id: "start",
          },
        },
        {
          type: "input",
          block_id: "end_block",
          label: { type: "plain_text", text: "End Date" },
          element: {
            type: "datepicker",
            action_id: "end",
          },
        },
        {
          type: "input",
          block_id: "weekdays_block",
          label: { type: "plain_text", text: "Which days of the week?" },
          element: {
            type: "multi_static_select",
            action_id: "weekdays",
            options: [
              { text: { type: "plain_text", text: "Monday" }, value: "1" },
              { text: { type: "plain_text", text: "Tuesday" }, value: "2" },
              { text: { type: "plain_text", text: "Wednesday" }, value: "3" },
              { text: { type: "plain_text", text: "Thursday" }, value: "4" },
              { text: { type: "plain_text", text: "Friday" }, value: "5" },
              { text: { type: "plain_text", text: "Saturday" }, value: "6" },
            ],
          },
        },
        absenceTypeBlock,
        arrivalTimeBlock,
        departureTimeBlock,
        {
          type: "input",
          block_id: "reason_block_rec",
          label: { type: "plain_text", text: "Reason" },
          element: {
            type: "plain_text_input",
            action_id: "reason_rec",
            hint: { type: "plain_text", text: "This will be kept confidential" },
          },
        },
        {
          type: "input",
          block_id: "notes_block_rec",
          label: { type: "plain_text", text: "Notes" },
          optional: true,
          element: {
            type: "plain_text_input",
            action_id: "notes_rec",
            multiline: true,
            placeholder: { type: "plain_text", text: "Additional notes (optional)" },
          },
        },
      ],
    };
  } else {
    nextModal = {
      type: "modal",
      callback_id: "one_time_absence_modal",
      title: { type: "plain_text", text: "One-Time Absence" },
      submit: { type: "plain_text", text: "Submit" },
      blocks: [
        {
          type: "input",
          block_id: "date_block",
          label: { type: "plain_text", text: "Date" },
          element: {
            type: "datepicker",
            action_id: "date",
          },
        },
        absenceTypeBlock,
        arrivalTimeBlock,
        departureTimeBlock,
        {
          type: "input",
          block_id: "reason_block_one",
          label: { type: "plain_text", text: "Reason" },
          hint: { type: "plain_text", text: "This will be kept confidential" }, // <-- move here
          element: {
            type: "plain_text_input",
            action_id: "reason_one",
          },
        },
        {
          type: "input",
          block_id: "notes_block_one",
          label: { type: "plain_text", text: "Notes" },
          optional: true,
          element: {
            type: "plain_text_input",
            action_id: "notes_one",
            multiline: true,
            placeholder: { type: "plain_text", text: "Additional notes (optional)" },
          },
        },
      ],
    };
  }
  return {
    response_action: "update",
    view: nextModal,
  };
})
.addViewSubmissionHandler("recurring_absence_modal", async ({ view, client, inputs, env }) => {
  console.log("recurring_absence_modal handler called");
  try {
    // Gather values
    const employee = inputs.interactivity.interactor.id;
    const start = view.state.values.start_block.start.selected_date;
    const end = view.state.values.end_block.end.selected_date;
    const reason = view.state.values.reason_block_rec.reason_rec.value;
    const notes = view.state.values.notes_block_rec?.notes_rec?.value || "";
    const weekdays = view.state.values.weekdays_block.weekdays.selected_options.map(opt => parseInt(opt.value, 10));
    const absenceType = view.state.values.absence_type_block.absence_type.selected_option.value;
    const arrivalTime = view.state.values.arrival_time_block?.arrival_time?.selected_time || "";
    const departureTime = view.state.values.departure_time_block?.departure_time?.selected_time || "";
    console.log("Parsed values:", { employee, start, end, reason, notes, weekdays, absenceType, arrivalTime, departureTime });

    // Get user info
    const user = await client.users.profile.get({ user: employee });
    const name = user.ok ? user.profile.real_name : employee;
    console.log("Fetched user profile:", name);

    // Get Google token
    const auth = await client.apps.auth.external.get({
      external_token_id: inputs.googleAccessTokenId,
    });
    if (!auth.ok) {
      console.error("Failed to collect Google auth token:", auth.error);
      return { error: `Failed to collect Google auth token: ${auth.error}` };
    }
    console.log("Google auth token acquired");

    // Prepare rows for each matching date
    const rows: string[][] = [];
    let current = new Date(start);
    const endDate = new Date(end);
    while (current <= endDate) {
      const jsDay = current.getDay();
      if (weekdays.includes(jsDay === 0 ? 7 : jsDay)) {
        const dateStr = current.toISOString().slice(0, 10);
        rows.push([name, employee, dateStr, absenceType, arrivalTime, departureTime, reason, notes]);
      }
      current.setDate(current.getDate() + 1);
    }
    console.log("Rows to write:", rows);

    if (rows.length === 0) {
      console.warn("No dates in the range match the selected weekdays.");
      return { error: "No dates in the range match the selected weekdays." };
    }

    // Write all rows to Google Sheets
    const url =
      `https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SPREADSHEET_ID}/values/Absence%20Responses!A2:H2:append?valueInputOption=USER_ENTERED`;
    const sheets = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${auth.external_token}`,
      },
      body: JSON.stringify({
        range: "Absence Responses!A2:H2",
        majorDimension: "ROWS",
        values: rows,
      }),
    });
    console.log("Sheets API response status:", sheets.status);

    if (!sheets.ok) {
      const text = await sheets.text();
      console.error("Failed to save absence to the sheet:", sheets.statusText, text);
      return {
        error: `Failed to save absence to the sheet: ${sheets.statusText}`,
      };
    }
    console.log("Successfully wrote to Google Sheets. Returning Done modal.");
    return {
      response_action: "update",
      view: {
        type: "modal",
        title: { type: "plain_text", text: "Done" },
        close: { type: "plain_text", text: "Close" },
        blocks: [
          {
            type: "section",
            text: { type: "plain_text", text: "Absence recorded successfully!" },
          },
        ],
      },
    };
  } catch (e) {
    console.error("Error in recurring_absence_modal handler:", e);
    return { error: "An unexpected error occurred." };
  }
})

.addViewSubmissionHandler("one_time_absence_modal", async ({ view, client, inputs, env }) => {
  console.log("one_time_absence_modal handler called");
  try {
    const employee = inputs.interactivity.interactor.id;
    const date = view.state.values.date_block?.date?.selected_date;
    const absenceType = view.state.values.absence_type_block.absence_type.selected_option.value;
    const arrivalTime = view.state.values.arrival_time_block?.arrival_time?.selected_time || "";
    const departureTime = view.state.values.departure_time_block?.departure_time?.selected_time || "";
    const reason = view.state.values.reason_block_one?.reason_one?.value;
    const notes = view.state.values.notes_block_one?.notes_one?.value || "";
    console.log("Parsed values:", { employee, date, absenceType, arrivalTime, departureTime, reason, notes });

    if (!date || !reason) {
      console.warn("Missing required fields:", { date, reason });
      return { error: "Please fill out all required fields." };
    }

    const user = await client.users.profile.get({ user: employee });
    const name = user.ok ? user.profile.real_name : employee;
    console.log("Fetched user profile:", name);

    const auth = await client.apps.auth.external.get({
      external_token_id: inputs.googleAccessTokenId,
    });
    if (!auth.ok) {
      console.error("Failed to collect Google auth token:", auth.error);
      return { error: `Failed to collect Google auth token: ${auth.error}` };
    }
    console.log("Google auth token acquired");

    const url =
      `https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SPREADSHEET_ID}/values/Absence%20Responses!A2:H2:append?valueInputOption=USER_ENTERED`;
    const sheets = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${auth.external_token}`,
      },
      body: JSON.stringify({
        range: "Absence Responses!A2:H2",
        majorDimension: "ROWS",
        values: [[name, employee, date, absenceType, arrivalTime, departureTime, reason, notes]],
      }),
    });
    console.log("Sheets API response status:", sheets.status);

    if (!sheets.ok) {
      const text = await sheets.text();
      console.error("Failed to save absence to the sheet:", sheets.statusText, text);
      return {
        error: `Failed to save absence to the sheet: ${sheets.statusText}`,
      };
    }

    // Send a DM with the absence details to a specific user (set NOTIFY_USER_ID in workflow/env)
    try {
      const notifyUserId = "U6D1F95R6";
      if (notifyUserId) {
        const dmOpen = await client.conversations.open({ users: notifyUserId });
        if (dmOpen.ok && dmOpen.channel?.id) {
          const channelId = dmOpen.channel.id;

          const absenceTypeText = absenceType === "full"
            ? "Full Meeting Absence"
            : (arrivalTime && departureTime)
              ? "Late Arrival / Early Departure"
              : arrivalTime
              ? "Late Arrival"
              : departureTime
              ? "Early Departure"
              : "Late Arrival / Early Departure";

          const dmBlocks: any[] = [];

          dmBlocks.push({
            type: "header",
            text: { type: "plain_text", text: `📝 Absence reported for ${date}`, emoji: true },
          });

          dmBlocks.push({ type: "divider" });

          dmBlocks.push({
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*${name}* <@${employee}>\n*Type:* ${absenceTypeText}`,
            },
          });

          const timeElements: any[] = [];
          if (arrivalTime) {
            timeElements.push({ type: "mrkdwn", text: `🕐 Arriving: ${arrivalTime}` });
          }
          if (departureTime) {
            timeElements.push({ type: "mrkdwn", text: `🕐 Departing: ${departureTime}` });
          }
          if (timeElements.length > 0) {
            dmBlocks.push({ type: "context", elements: timeElements });
          }

          dmBlocks.push({
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Reason:* ${reason}${notes ? `\n*Notes:* ${notes}` : ""}`,
            },
          });

          dmBlocks.push({ type: "divider" });

          await client.chat.postMessage({
            channel: channelId,
            blocks: dmBlocks,
            text: `Absence reported for ${name} on ${date}`,
            unfurl_links: false,
            unfurl_media: false,
          });
        } else {
          console.error("Failed to open DM channel to notify user:", dmOpen.error);
        }
      } else {
        console.warn("Skipping DM: NOTIFY_USER_ID not set in env/workflow inputs");
      }
    } catch (dmErr) {
      console.error("Error sending DM notification:", dmErr);
      // do not fail the flow for DM errors — still return success modal
    }

    console.log("Successfully wrote to Google Sheets. Returning Done modal.");
    return {
      response_action: "update",
      view: {
        type: "modal",
        title: { type: "plain_text", text: "Done" },
        close: { type: "plain_text", text: "Close" },
        blocks: [
          {
            type: "section",
            text: { type: "plain_text", text: "Absence recorded successfully!" },
          },
        ],
      },
    };
  } catch (e) {
    console.error("Error in recurring_absence_modal handler:", e);
    return { error: "An unexpected error occurred." };
  }
}); 