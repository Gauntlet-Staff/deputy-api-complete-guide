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

  // Method to search for schedules with specific criteria
  async searchSchedules(params = {}) {
    return this.request('resource/Schedule/QUERY', 'POST', params);
  },

  // Method to get a specific schedule by ID
  async getSchedule(id) {
    return this.request(`resource/Schedule/${id}`);
  }
};

// Get schedules with high IDs
async function getHighScheduleIds() {
  try {
    console.log('Searching for schedules with high IDs (1000+)...');
    
    // First, try to get schedule with ID 1001 directly (we know this exists)
    try {
      const schedule1001 = await deputyClient.getSchedule(1001);
      console.log('\nSchedule with ID 1001:');
      console.log(JSON.stringify(schedule1001.data, null, 2));
    } catch (error) {
      console.error('Error getting schedule 1001:', error.message);
    }
    
    // Try to search for schedules with IDs >= 1000
    try {
      const highIdSchedules = await deputyClient.searchSchedules({
        search: {
          s1: {
            field: 'Id',
            data: 1000,
            type: 'Integer',
            operator: '>='
          }
        },
        max: 100,
        sort: { Id: 'ASC' }
      });
      
      console.log(`\nFound ${highIdSchedules.data.length} schedules with IDs >= 1000`);
      
      if (highIdSchedules.data.length > 0) {
        console.log('\nHigh ID Schedules:');
        console.log('=================');
        
        highIdSchedules.data.forEach(schedule => {
          console.log(`ID: ${schedule.Id.toString().padEnd(6)} | Name: ${schedule.Name || 'No Name'} | Created: ${schedule.Created}`);
        });
      }
    } catch (error) {
      console.error('Error searching for high ID schedules:', error.message);
    }
    
    // Try a range of specific high IDs
    console.log('\nChecking specific high IDs...');
    const highIds = [1000, 1001, 1002, 1082, 1084, 1086, 1088, 1090];
    
    for (const id of highIds) {
      try {
        const schedule = await deputyClient.getSchedule(id);
        console.log(`ID: ${id.toString().padEnd(6)} | Name: ${schedule.data.Name || 'No Name'} | Created: ${schedule.data.Created}`);
      } catch (error) {
        console.log(`ID: ${id.toString().padEnd(6)} | Not found or error: ${error.response?.status || error.message}`);
      }
    }
    
  } catch (error) {
    console.error('Error retrieving high schedule IDs:', error.message);
  }
}

// Run the function
getHighScheduleIds().catch(err => {
  console.error('Error running script:', err.message);
}); 