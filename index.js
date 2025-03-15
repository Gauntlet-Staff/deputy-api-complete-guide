// Import required dependencies
require('dotenv').config();
const axios = require('axios');

// Create a deputy API client
const deputyClient = {
  baseURL: `https://${process.env.DEPUTY_INSTALL}.${process.env.DEPUTY_GEO}.deputy.com/api/v1`,
  accessToken: process.env.DEPUTY_ACCESS_TOKEN,

  // Authentication method
  auth(token) {
    this.accessToken = token || this.accessToken;
    return this;
  },

  // Helper method to make API requests
  async request(endpoint, method = 'GET', data = null) {
    try {
      const response = await axios({
        url: `${this.baseURL}/${endpoint}`,
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        },
        data
      });
      return response;
    } catch (error) {
      console.error('API Request Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Method to search for events (using Roster endpoint)
  async searchforEvents(searchParams) {
    return this.request('resource/Roster/QUERY', 'POST', searchParams);
  },

  // Method to search for events using the Event endpoint
  async searchEvents(searchParams) {
    return this.request('resource/Event/QUERY', 'POST', searchParams);
  },

  // Method to get all events
  async getEvents() {
    return this.request('resource/Event');
  },

  // Method to get all employees
  async getEmployees() {
    return this.request('resource/Employee');
  },

  // Method to get a specific employee
  async getEmployee(id) {
    return this.request(`resource/Employee/${id}`);
  },

  // Method to get timesheets
  async getTimesheets(params = {}) {
    return this.request('resource/Timesheet/QUERY', 'POST', params);
  },

  // Method to get operational units
  async getOperationalUnits() {
    return this.request('resource/OperationalUnit');
  },

  // Method to get leave requests
  async getLeaveRequests(params = {}) {
    return this.request('resource/Leave/QUERY', 'POST', params);
  },

  // Method to get companies
  async getCompanies() {
    return this.request('resource/Company');
  },

  // Method to get all schedules
  async getSchedules() {
    return this.request('resource/Schedule');
  },

  // Method to search for schedules
  async searchSchedules(searchParams) {
    return this.request('resource/Schedule/QUERY', 'POST', searchParams);
  }
};

// Test the API
async function runTests() {
  console.log('Testing Deputy API...');
  
  // Test 1: Using the provided example to search for events (Roster)
  try {
    console.log('\n--- Test 1: Search for Events (Roster) ---');
    const searchResult = await deputyClient
      .auth('1eddafd4aee96f2fdf5def5e594bb5ed')
      .searchforEvents({search: {s1: {field: 'Id', data: 1003, type: 'Integer'}}});
    
    console.log('Search Results:', JSON.stringify(searchResult.data, null, 2));
  } catch (error) {
    console.error('Test 1 Failed:', error.message);
  }

  // Test 2: Search for events using the Event endpoint
  try {
    console.log('\n--- Test 2: Search for Events (Event endpoint) ---');
    const searchResult = await deputyClient
      .searchEvents({
        search: {
          s1: {field: 'Id', data: 1, type: 'Integer'}
        },
        max: 5
      });
    
    console.log('Search Results:', JSON.stringify(searchResult.data, null, 2));
  } catch (error) {
    console.error('Test 2 Failed:', error.message);
  }

  // Test 3: Get all events
  try {
    console.log('\n--- Test 3: Get All Events ---');
    const events = await deputyClient.getEvents();
    console.log(`Found ${events.data.length} events`);
    console.log('First few events:', JSON.stringify(events.data.slice(0, 3), null, 2));
  } catch (error) {
    console.error('Test 3 Failed:', error.message);
  }

  // Test 3b: Get all schedules
  try {
    console.log('\n--- Test 3b: Get All Schedules ---');
    const schedules = await deputyClient.getSchedules();
    console.log(`Found ${schedules.data.length} schedules`);
    console.log('First few schedules:', JSON.stringify(schedules.data.slice(0, 3), null, 2));
  } catch (error) {
    console.error('Test 3b Failed:', error.message);
  }

  // Test 4: Get all employees
  try {
    console.log('\n--- Test 4: Get All Employees ---');
    const employees = await deputyClient.getEmployees();
    console.log(`Found ${employees.data.length} employees`);
    console.log('First few employees:', JSON.stringify(employees.data.slice(0, 3), null, 2));
  } catch (error) {
    console.error('Test 4 Failed:', error.message);
  }

  // Test 5: Get a specific employee (using ID 1 as an example)
  try {
    console.log('\n--- Test 5: Get Specific Employee ---');
    const employee = await deputyClient.getEmployee(1);
    console.log('Employee Details:', JSON.stringify(employee.data, null, 2));
  } catch (error) {
    console.error('Test 5 Failed:', error.message);
  }

  // Test 6: Get recent timesheets
  try {
    console.log('\n--- Test 6: Get Recent Timesheets ---');
    // Try a simpler approach - just get the most recent timesheets without date filtering
    const timesheets = await deputyClient.getTimesheets({
      max: 5,
      sort: {
        Date: 'DESC'
      }
    });
    console.log(`Found ${timesheets.data.length} timesheets`);
    console.log('Timesheets:', JSON.stringify(timesheets.data, null, 2));
  } catch (error) {
    console.error('Test 6 Failed:', error.message);
  }

  // Test 7: Get operational units
  try {
    console.log('\n--- Test 7: Get Operational Units ---');
    const units = await deputyClient.getOperationalUnits();
    console.log(`Found ${units.data.length} operational units`);
    console.log('First few units:', JSON.stringify(units.data.slice(0, 3), null, 2));
  } catch (error) {
    console.error('Test 7 Failed:', error.message);
  }

  // Test 8: Get Leave Requests
  try {
    console.log('\n--- Test 8: Get Leave Requests ---');
    // Simplify the query to avoid potential errors
    const leaveRequests = await deputyClient.getLeaveRequests({
      max: 5
    });
    console.log(`Found ${leaveRequests.data.length} leave requests`);
    console.log('Leave Requests:', JSON.stringify(leaveRequests.data, null, 2));
  } catch (error) {
    console.error('Test 8 Failed:', error.message);
  }

  // Test 9: Get Companies
  try {
    console.log('\n--- Test 9: Get Companies ---');
    const companies = await deputyClient.getCompanies();
    console.log(`Found ${companies.data.length} companies`);
    console.log('Companies:', JSON.stringify(companies.data, null, 2));
  } catch (error) {
    console.error('Test 9 Failed:', error.message);
  }
}

// Run the tests
runTests().catch(err => {
  console.error('Error running tests:', err.message);
});
