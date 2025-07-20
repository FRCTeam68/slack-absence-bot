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
  if (recurring === "yes") {
    nextModal = {
      type: "modal",
      callback_id: "recurring_absence_modal",
      title: { type: "plain_text", text: "Recurring Absence" },
      submit: { type: "plain_text", text: "Submit" },
      blocks: [
        {
          type: "input",
          block_id: "employee_block_rec",
          label: { type: "plain_text", text: "Employee" },
          element: {
            type: "users_select",
            action_id: "employee_rec",
          },
        },
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
        {
          type: "input",
          block_id: "reason_block_rec",
          label: { type: "plain_text", text: "Reason" },
          element: {
            type: "plain_text_input",
            action_id: "reason_rec",
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
          block_id: "employee_block_one",
          label: { type: "plain_text", text: "Employee" },
          element: {
            type: "users_select",
            action_id: "employee_one",
          },
        },
        {
          type: "input",
          block_id: "date_block",
          label: { type: "plain_text", text: "Date" },
          element: {
            type: "datepicker",
            action_id: "date",
          },
        },
        {
          type: "input",
          block_id: "reason_block_one",
          label: { type: "plain_text", text: "Reason" },
          element: {
            type: "plain_text_input",
            action_id: "reason_one",
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
    const employee = view.state.values.employee_block_rec.employee_rec.selected_user;
    const start = view.state.values.start_block.start.selected_date;
    const end = view.state.values.end_block.end.selected_date;
    const reason = view.state.values.reason_block_rec.reason_rec.value;
    const weekdays = view.state.values.weekdays_block.weekdays.selected_options.map(opt => parseInt(opt.value, 10));
    console.log("Parsed values:", { employee, start, end, reason, weekdays });

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
        rows.push([name, employee, dateStr, reason]);
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
      `https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SPREADSHEET_ID}/values/Absences!A2:D2:append?valueInputOption=USER_ENTERED`;
    const sheets = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${auth.external_token}`,
      },
      body: JSON.stringify({
        range: "Absences!A2:D2",
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
    const employee = view.state.values.employee_block_one?.employee_one?.selected_user;
    const date = view.state.values.date_block?.date?.selected_date;
    const reason = view.state.values.reason_block_one?.reason_one?.value;
    console.log("Parsed values:", { employee, date, reason });

    if (!employee || !date || !reason) {
      console.warn("Missing required fields:", { employee, date, reason });
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
      `https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SPREADSHEET_ID}/values/Absences!A2:D2:append?valueInputOption=USER_ENTERED`;
    const sheets = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${auth.external_token}`,
      },
      body: JSON.stringify({
        range: "Absences!A2:D2",
        majorDimension: "ROWS",
        values: [[name, employee, date, reason]],
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
    console.error("Error in one_time_absence_modal handler:", e);
    return { error: "An unexpected error occurred." };
  }
});