# Deputy API Testing Script

This project contains a script to test various endpoints of the Deputy API. It demonstrates how to authenticate with the API and make requests to different endpoints.

## Setup

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file in the root directory with the following variables:
   ```
   DEPUTY_INSTALL=your_deputy_install_id
   DEPUTY_ACCESS_TOKEN=your_deputy_access_token
   DEPUTY_GEO=your_deputy_geo_region (e.g., na, au, eu)
   ```

## Authentication

Deputy API offers two authentication methods:

### 1. Using a Permanent Token

To set up a permanent token for development purposes:

1. Log in to your Deputy account
2. Navigate to `https://{installname}.{geo}.deputy.com/exec/devapp/oauth_clients`
3. Click the "New OAuth Client" button
4. Fill in the required details:
   - **Name**: A name for your client application
   - **Description**: A brief description of your application
   - **Logo URL**: (Optional) URL to your application's logo
   - **Redirect URI**: For permanent tokens, you can use `http://localhost`
5. Click "Save this OAuth Client"
6. On the client details page, click "Get an Access Token"
7. A modal dialog will appear displaying your permanent token - **save this token securely as it will only be shown once**
8. Use this token in your API requests with the `Authorization: Bearer YOUR_TOKEN` header

> **IMPORTANT**: The permanent token will only be displayed once. It is not possible to see the permanent token again once the dialog is closed. Ensure you save it somewhere secure before clicking OK.

### 2. Using OAuth 2.0

For applications that need to access Deputy on behalf of users, OAuth 2.0 is recommended:

1. Register your application with Deputy (same steps 1-5 as above)
2. Implement the OAuth 2.0 flow:
   - Direct users to the Deputy authorization endpoint
   - Receive the authorization code
   - Exchange the code for an access token
   - Use the token for API requests

For more details on authentication, refer to the [Deputy API documentation](https://developer.deputy.com/docs/getting-started-with-the-deputy-api).

## API Endpoint Structure

Every Deputy customer runs on their own subdomain. The API endpoint is based on this subdomain:

```
https://{subdomain}.{region}.deputy.com/api/v1/
```

For example, if your Deputy installation is at `https://mycompany.na.deputy.com`, then your API endpoint would be `https://mycompany.na.deputy.com/api/v1/`.

## Testing Your Connection

To verify your connection is working correctly, you can use the "Who Am I" endpoint:

```javascript
const response = await axios({
  url: `https://${process.env.DEPUTY_INSTALL}.${process.env.DEPUTY_GEO}.deputy.com/api/v1/me`,
  method: "GET",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.DEPUTY_ACCESS_TOKEN}`,
  },
});
console.log(response.data);
```

This will return information about the user associated with your access token.

## Running the Tests

To run the tests, simply execute:

```
node index.js
```

## API Endpoints Tested

The script tests the following Deputy API endpoints:

1. **Search for Events (Roster)** - Searches for roster events with a specific ID
2. **Search for Events (Event endpoint)** - Searches for events using the Event endpoint
3. **Get All Events** - Retrieves a list of all events
4. **Get All Schedules** - Retrieves a list of all schedules
5. **Get All Employees** - Retrieves a list of all employees
6. **Get Specific Employee** - Retrieves details for a specific employee by ID
7. **Get Timesheets** - Retrieves recent timesheets
8. **Get Operational Units** - Retrieves a list of all operational units
9. **Get Leave Requests** - Retrieves leave requests
10. **Get Companies** - Retrieves a list of all companies

## API Client Structure

The script includes a simple API client with the following methods:

- `auth(token)` - Sets the authentication token
- `request(endpoint, method, data)` - Makes a request to the specified endpoint
- `searchforEvents(searchParams)` - Searches for roster events (using Roster endpoint)
- `searchEvents(searchParams)` - Searches for events (using Event endpoint)
- `getEvents()` - Gets all events
- `getSchedules()` - Gets all schedules
- `searchSchedules(searchParams)` - Searches for schedules with specific criteria
- `getSchedule(id)` - Gets a specific schedule by ID
- `getEmployees()` - Gets all employees
- `getEmployee(id)` - Gets a specific employee by ID
- `getTimesheets(params)` - Gets timesheets with optional filtering
- `getOperationalUnits()` - Gets all operational units
- `getLeaveRequests(params)` - Gets leave requests with optional filtering
- `getCompanies()` - Gets all companies

## Event and Schedule Relationship

In the Deputy API, Events and Schedules are closely related:

1. **Event Object Structure**:

   ```json
   {
     "fields": {
       "Id": "Integer",
       "Title": "Blob",
       "Schedule": "Integer",
       "Colour": "VarChar",
       "ShowOnRoster": "Bit",
       "AddToBudget": "Float",
       "BlockTimeOff": "Bit",
       "Creator": "Integer",
       "Created": "DateTime",
       "Modified": "DateTime"
     },
     "joins": {
       "ScheduleObject": "Schedule"
     },
     "assocs": {
       "OperationalUnit": "OperationalUnit"
     }
   }
   ```

2. **Schedule Object Structure**:

   ```json
   {
     "fields": {
       "Id": "Integer",
       "Name": "VarChar",
       "StartDate": "Date",
       "StartTime": "Time",
       "EndTime": "Time",
       "RepeatType": "Integer",
       "RepeatEvery": "Integer",
       "WeeklyOnDays": "VarChar",
       "MonthlyOnDates": "VarChar",
       "MonthlyOnDays": "VarChar",
       "EndDate": "Date",
       "Exception": "VarChar",
       "Saved": "Bit",
       "Orm": "VarChar",
       "Template": "Bit",
       "Creator": "Integer",
       "Created": "DateTime",
       "Modified": "DateTime"
     }
   }
   ```

3. **Relationship**:

   - Each Event has a `Schedule` field that references a Schedule ID
   - The Schedule contains timing information (StartDate, StartTime, EndTime, etc.)
   - The Event contains display information (Title, Colour, ShowOnRoster, etc.)
   - To get all schedules available to you, use the `getSchedules()` method

4. **Additional Scripts**:
   - `schedule-test.js` - Tests the Schedule endpoints
   - `event-schedule-relation.js` - Shows the relationship between Events and Schedules
   - `events-by-date-range.js` - Demonstrates retrieving events by date range

## Event Endpoints

According to the [Deputy API documentation](https://developer.deputy.com/reference/getevents), there are specific endpoints for working with events:

1. **GET /resource/Event** - Retrieves all events
2. **POST /resource/Event/QUERY** - Searches for events with specific criteria

These endpoints are implemented in the `getEvents()` and `searchEvents()` methods respectively.

## Schedule Endpoints

The following endpoints are available for working with schedules:

1. **GET /resource/Schedule** - Retrieves all schedules
2. **POST /resource/Schedule/QUERY** - Searches for schedules with specific criteria
3. **GET /resource/Schedule/{id}** - Retrieves a specific schedule by ID

These endpoints are implemented in the `getSchedules()`, `searchSchedules()`, and `getSchedule(id)` methods respectively.

## Retrieving Events by Date Range

The Deputy API allows you to retrieve events by date range using different approaches:

### 1. Using the Event Endpoint

To retrieve events by date range using the Event endpoint, you need to:

1. Get all events
2. Get the associated schedule for each event
3. Filter events based on the schedule's start date

```javascript
async function searchEventsByDateRange(startDate, endDate) {
  // Get all events
  const allEvents = await deputyClient.request("resource/Event");

  // Filter events by checking their associated schedules
  const filteredEvents = [];

  for (const event of allEvents.data) {
    if (event.Schedule) {
      const scheduleResponse = await deputyClient.getSchedule(event.Schedule);
      const schedule = scheduleResponse.data;

      // Check if the schedule's start date is within our range
      const scheduleDate = new Date(schedule.StartDate);
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);

      if (scheduleDate >= startDateObj && scheduleDate <= endDateObj) {
        filteredEvents.push({
          ...event,
          scheduleDetails: schedule,
        });
      }
    }
  }

  return { data: filteredEvents };
}
```

### 2. Using the Schedule Endpoint

To retrieve schedules by date range:

```javascript
async function searchSchedulesByDateRange(startDate, endDate) {
  // Get all schedules
  const allSchedules = await deputyClient.request("resource/Schedule");

  // Filter schedules by date range
  const filteredSchedules = allSchedules.data.filter((schedule) => {
    const scheduleDate = new Date(schedule.StartDate);
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    return scheduleDate >= startDateObj && scheduleDate <= endDateObj;
  });

  return { data: filteredSchedules };
}
```

### 3. Using the Roster Endpoint

To retrieve roster events by date range:

```javascript
async function searchRosterEventsByDateRange(startDate, endDate) {
  // Query for each date in the range
  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);

  let allRosterEvents = [];
  const currentDate = new Date(startDateObj);

  while (currentDate <= endDateObj) {
    const dateString = currentDate.toISOString().split("T")[0];

    const searchParams = {
      search: {
        Date: dateString,
      },
      max: 100,
    };

    const response = await deputyClient.request(
      "resource/Roster/QUERY",
      "POST",
      searchParams
    );
    allRosterEvents = [...allRosterEvents, ...response.data];

    // Move to the next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return { data: allRosterEvents };
}
```

### Recommendations

- For calendar events/holidays: Use the Event endpoint
- For schedule templates: Use the Schedule endpoint
- For employee shifts/rosters: Use the Roster endpoint

## API Limitations and Best Practices

- The maximum number of records included in a single response is 500
- POST data is generally included as a string
- Returned data is always in JSON format
- There are two versions of Deputy - Premium and Enterprise. Enterprise is customized for specific clients and may have additional custom data
- The API endpoint for both Premium and Enterprise products is the same

## Developer Sandbox

If you're interested in using a sandbox for development, sign up for a Deputy account and contact [api@deputy.com](mailto:api@deputy.com) to request an extension of your trial period for the duration of your development phase.

## Reference

This script was created based on the following reference code:

```javascript
import deputyDocumentation from "@api/deputy-documentation";

deputyDocumentation.auth("1eddafd4aee96f2fdf5def5e594bb5ed");
deputyDocumentation
  .searchforEvents({
    search: { s1: { field: "Schedule", data: 1003, type: "Integer" } },
  })
  .then(({ data }) => console.log(data))
  .catch((err) => console.error(err));
```

## Notes

- The script uses environment variables from the `.env` file to configure the API client
- Some endpoints may return empty results if there is no data available
- The Leave Requests endpoint may return a 500 error due to server-side issues
- The original reference code used `Schedule` as the field name, but we found that `Id` works better with the Roster endpoint
- We've implemented both the Roster-based event search and the dedicated Event endpoint search for comparison
