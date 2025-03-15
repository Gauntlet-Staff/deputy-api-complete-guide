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

  // Method to get all schedules
  async getSchedules() {
    return this.request('resource/Schedule');
  },

  // Method to search for schedules
  async searchSchedules(searchParams) {
    return this.request('resource/Schedule/QUERY', 'POST', searchParams);
  },

  // Method to get a specific schedule
  async getSchedule(id) {
    return this.request(`resource/Schedule/${id}`);
  }
};

// Test the Schedule API
async function testSchedules() {
  console.log('Testing Deputy Schedule API...');
  
  // Test 1: Get all schedules
  try {
    console.log('\n--- Test 1: Get All Schedules ---');
    const schedules = await deputyClient.getSchedules();
    console.log(`Found ${schedules.data.length} schedules`);
    console.log('First few schedules:', JSON.stringify(schedules.data.slice(0, 3), null, 2));
  } catch (error) {
    console.error('Test 1 Failed:', error.message);
  }

  // Test 2: Get schedule metadata
  try {
    console.log('\n--- Test 2: Get Schedule Metadata ---');
    const metadata = await deputyClient.request('resource/Schedule/INFO');
    console.log('Schedule Metadata:', JSON.stringify(metadata.data, null, 2));
  } catch (error) {
    console.error('Test 2 Failed:', error.message);
  }

  // Test 3: Get a specific schedule (using ID 1001 as an example)
  try {
    console.log('\n--- Test 3: Get Specific Schedule ---');
    const schedule = await deputyClient.getSchedule(1001);
    console.log('Schedule Details:', JSON.stringify(schedule.data, null, 2));
  } catch (error) {
    console.error('Test 3 Failed:', error.message);
  }

  // Test 4: Search for schedules
  try {
    console.log('\n--- Test 4: Search for Schedules ---');
    const searchResult = await deputyClient.searchSchedules({
      max: 5,
      sort: {
        Id: 'ASC'
      }
    });
    console.log('Search Results:', JSON.stringify(searchResult.data, null, 2));
  } catch (error) {
    console.error('Test 4 Failed:', error.message);
  }
}

// Run the tests
testSchedules().catch(err => {
  console.error('Error running tests:', err.message);
}); 