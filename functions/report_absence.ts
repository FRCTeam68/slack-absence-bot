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
.addViewSubmissionHandler("absence_type_modal", async ({ view, client, inputs }) => {
  const recurring = view.state.values.recurring_block.recurring_select.selected_option.value;

  if (recurring === "yes") {
    // Show recurring absence modal
    await client.views.open({
      interactivity_pointer: inputs.interactivity.interactivity_pointer,
      view: {
        type: "modal",
        callback_id: "recurring_absence_modal",
        title: { type: "plain_text", text: "Recurring Absence" },
        submit: { type: "plain_text", text: "Submit" },
        blocks: [
          {
            type: "input",
            block_id: "employee_block",
            label: { type: "plain_text", text: "Employee" },
            element: {
              type: "users_select",
              action_id: "employee",
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
            block_id: "reason_block",
            label: { type: "plain_text", text: "Reason" },
            element: {
              type: "plain_text_input",
              action_id: "reason",
            },
          },
        ],
      },
    });
  } else {
    // Show one-time absence modal
    await client.views.open({
      interactivity_pointer: inputs.interactivity.interactivity_pointer,
      view: {
        type: "modal",
        callback_id: "one_time_absence_modal",
        title: { type: "plain_text", text: "One-Time Absence" },
        submit: { type: "plain_text", text: "Submit" },
        blocks: [
          {
            type: "input",
            block_id: "employee_block",
            label: { type: "plain_text", text: "Employee" },
            element: {
              type: "users_select",
              action_id: "employee",
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
            block_id: "reason_block",
            label: { type: "plain_text", text: "Reason" },
            element: {
              type: "plain_text_input",
              action_id: "reason",
            },
          },
        ],
      },
    });
  }

  return { completed: false }; // Wait for next modal submission
})
.addViewSubmissionHandler("recurring_absence_modal", async ({ view, client, inputs, env }) => {
  // Gather values
  const employee = view.state.values.employee_block.employee.selected_user;
  const start = view.state.values.start_block.start.selected_date;
  const end = view.state.values.end_block.end.selected_date;
  const reason = view.state.values.reason_block.reason.value;

  // Get user info
  const user = await client.users.profile.get({ user: employee });
  const name = user.ok ? user.profile.real_name : employee;

  // Get Google token
  const auth = await client.apps.auth.external.get({
    external_token_id: inputs.googleAccessTokenId,
  });
  if (!auth.ok) {
    return { error: `Failed to collect Google auth token: ${auth.error}` };
  }

  // Write to Google Sheets (for simplicity, just log start/end/reason)
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
      values: [[name, employee, `${start} to ${end}`, reason]],
    }),
  });

  if (!sheets.ok) {
    return {
      error: `Failed to save absence to the sheet: ${sheets.statusText}`,
    };
  }

  return { completed: true };
})
.addViewSubmissionHandler("one_time_absence_modal", async ({ view, client, inputs, env }) => {
  // Gather values
  const employee = view.state.values.employee_block.employee.selected_user;
  const date = view.state.values.date_block.date.selected_date;
  const reason = view.state.values.reason_block.reason.value;

  // Get user info
  const user = await client.users.profile.get({ user: employee });
  const name = user.ok ? user.profile.real_name : employee;

  // Get Google token
  const auth = await client.apps.auth.external.get({
    external_token_id: inputs.googleAccessTokenId,
  });
  if (!auth.ok) {
    return { error: `Failed to collect Google auth token: ${auth.error}` };
  }

  // Write to Google Sheets
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

  if (!sheets.ok) {
    return {
      error: `Failed to save absence to the sheet: ${sheets.statusText}`,
    };
  }

  return { completed: true };
});