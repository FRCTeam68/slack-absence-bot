import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";

export const ReportAbsenceFunctionDefinition = DefineFunction({
  callback_id: "report_absence_function",
  title: "Report Absence (with branching)",
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

function parseDate(str: string): Date {
  return new Date(`${str}T00:00:00`);
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export default SlackFunction(
  ReportAbsenceFunctionDefinition,
  async ({ inputs, client, env }) => {
    const result = await client.views.open({
      interactivity_pointer: inputs.interactivity.interactivity_pointer,
      view: {
        type: "modal",
        callback_id: "choose_absence_type",
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

    console.log("First modal opened:", result);
    return { completed: false };
  }
)
.addViewSubmissionHandler("choose_absence_type", async ({ view, client }) => {
  console.log("✅ choose_absence_type inline handler triggered");

  const choice = view.state.values.recurring_block.recurring_select.selected_option.value;
  const isRecurring = choice === "yes";

  const secondModal = {
    type: "modal",
    callback_id: "submit_absence",
    title: { type: "plain_text", text: "Absence Details" },
    submit: { type: "plain_text", text: "Submit" },
    blocks: isRecurring
      ? [
          {
            type: "input",
            block_id: "start_block",
            label: { type: "plain_text", text: "Start Date" },
            element: { type: "datepicker", action_id: "start" },
          },
          {
            type: "input",
            block_id: "end_block",
            label: { type: "plain_text", text: "End Date" },
            element: { type: "datepicker", action_id: "end" },
          },
          {
            type: "input",
            block_id: "weekdays_block",
            label: { type: "plain_text", text: "Which days of the week?" },
            element: {
              type: "checkboxes",
              action_id: "weekdays",
              options: [
                { text: { type: "plain_text", text: "Monday" }, value: "mon" },
                { text: { type: "plain_text", text: "Tuesday" }, value: "tue" },
                { text: { type: "plain_text", text: "Wednesday" }, value: "wed" },
                { text: { type: "plain_text", text: "Thursday" }, value: "thu" },
                { text: { type: "plain_text", text: "Friday" }, value: "fri" },
                { text: { type: "plain_text", text: "Saturday" }, value: "sat" },
              ],
            },
          },
          {
            type: "input",
            block_id: "reason_block",
            label: { type: "plain_text", text: "Reason" },
            element: { type: "plain_text_input", action_id: "reason", multiline: true },
          },
          {
            type: "input",
            block_id: "absence_type_block",
            label: { type: "plain_text", text: "Type of Absence" },
            element: {
              type: "static_select",
              action_id: "absence_type_select",
              options: [
                { text: { type: "plain_text", text: "Full Day" }, value: "full_day" },
                { text: { type: "plain_text", text: "Late Arrival" }, value: "late" },
                { text: { type: "plain_text", text: "Early Departure" }, value: "early" },
              ],
            },
          },
          {
            type: "input",
            block_id: "arrival_time_block",
            optional: true,
            label: { type: "plain_text", text: "Arrival Time" },
            element: { type: "timepicker", action_id: "arrival_time" },
          },
          {
            type: "input",
            block_id: "departure_time_block",
            optional: true,
            label: { type: "plain_text", text: "Departure Time" },
            element: { type: "timepicker", action_id: "departure_time" },
          },
          {
            type: "input",
            block_id: "notes_block",
            optional: true,
            label: { type: "plain_text", text: "Notes" },
            element: { type: "plain_text_input", action_id: "notes", multiline: true },
          },
        ]
      : [
          {
            type: "input",
            block_id: "date_block",
            label: { type: "plain_text", text: "Date" },
            element: { type: "datepicker", action_id: "date" },
          },
          {
            type: "input",
            block_id: "reason_block",
            label: { type: "plain_text", text: "Reason" },
            element: { type: "plain_text_input", action_id: "reason", multiline: true },
          },
          {
            type: "input",
            block_id: "absence_type_block",
            label: { type: "plain_text", text: "Type of Absence" },
            element: {
              type: "static_select",
              action_id: "absence_type_select",
              options: [
                { text: { type: "plain_text", text: "Full Day" }, value: "full_day" },
                { text: { type: "plain_text", text: "Late Arrival" }, value: "late" },
                { text: { type: "plain_text", text: "Early Departure" }, value: "early" },
              ],
            },
          },
          {
            type: "input",
            block_id: "arrival_time_block",
            optional: true,
            label: { type: "plain_text", text: "Arrival Time" },
            element: { type: "timepicker", action_id: "arrival_time" },
          },
          {
            type: "input",
            block_id: "departure_time_block",
            optional: true,
            label: { type: "plain_text", text: "Departure Time" },
            element: { type: "timepicker", action_id: "departure_time" },
          },
          {
            type: "input",
            block_id: "notes_block",
            optional: true,
            label: { type: "plain_text", text: "Notes" },
            element: { type: "plain_text_input", action_id: "notes", multiline: true },
          },
        ],
  };
  
  return { completed: false };
})
.addViewSubmissionHandler("submit_absence", async ({ view, client, inputs, env }) => {
  console.log("submit_absence triggered");

  const values = view.state.values;
  const user = inputs.interactivity.interactor.name;

  const getValue = (blockId, actionId) => {
    const value = values?.[blockId]?.[actionId]?.value;
    if (!value) console.warn(`Missing value for ${blockId}/${actionId}`);
    return value || "";
  };

  const getSelected = (blockId, actionId) => {
    const selected = values?.[blockId]?.[actionId]?.selected_option?.value;
    if (!selected) console.warn(`Missing selected option for ${blockId}/${actionId}`);
    return selected || "";
  };

  const isRecurring = values.start_block !== undefined;
  const rows: string[][] = [];

  if (isRecurring) {
    const startDate = new Date(getValue("start_block", "start") + "T00:00:00");
    const endDate = new Date(getValue("end_block", "end") + "T00:00:00");
    const selectedDays = values.weekdays_block.weekdays.selected_options.map(opt => opt.value);

    const type = getSelected("absence_type_block", "absence_type_select");
    const arrival = getValue("arrival_time_block", "arrival_time");
    const departure = getValue("departure_time_block", "departure_time");
    const reason = getValue("reason_block", "reason");
    const notes = getValue("notes_block", "notes");

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const weekday = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][d.getDay()];
      if (selectedDays.includes(weekday)) {
        rows.push([
          user,
          d.toISOString().slice(0, 10),
          type,
          arrival,
          departure,
          reason,
          notes,
        ]);
      }
    }
  } else {
    const date = getValue("date_block", "date");
    const type = getSelected("absence_type_block", "absence_type_select");
    const arrival = getValue("arrival_time_block", "arrival_time");
    const departure = getValue("departure_time_block", "departure_time");
    const reason = getValue("reason_block", "reason");
    const notes = getValue("notes_block", "notes");

    rows.push([
      user,
      date,
      type,
      arrival,
      departure,
      reason,
      notes,
    ]);
  }

  console.log("Absence rows to write:", JSON.stringify(rows, null, 2));

  const auth = await client.apps.auth.external.get({
    external_token_id: inputs.googleAccessTokenId,
  });

  if (!auth.ok) {
    console.error("Failed to get external token:", auth.error);
    return {
      response_action: "errors",
      errors: {
        reason_block: `Token resolution failed: ${auth.error}`,
      },
    };
  }

  const token = auth.external_token;
  console.log("Resolved token:", token);

  const sheetId = "YOUR_GOOGLE_SHEET_ID";
  const GOOGLE_SPREADSHEET_RANGE = "A2:G2";

  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SPREADSHEET_ID}/values/${GOOGLE_SPREADSHEET_RANGE}:append?valueInputOption=USER_ENTERED`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          values: rows,
          majorDimension: "ROWS",
        }),
      }
    );

    const json = await response.json();

    if (!response.ok) {
      console.error("Failed to write to Google Sheets:", json);
      return {
        response_action: "errors",
        errors: {
          reason_block: `Sheets error: ${json?.error?.message || "Unknown error"}`,
        },
      };
    }
  } catch (e) {
    console.error("Unexpected error posting to Google Sheets:", e);
    return {
      response_action: "errors",
      errors: {
        reason_block: `Unexpected error: ${e.message}`,
      },
    };
  }

  return { completed: true };
});
