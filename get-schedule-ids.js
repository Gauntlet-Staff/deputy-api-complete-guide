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
  }
};

// Get all schedule IDs
async function getAllScheduleIds() {
  try {
    console.log('Retrieving all schedule IDs...');
    const response = await deputyClient.getSchedules();
    const schedules = response.data;
    
    console.log(`\nTotal Schedules: ${schedules.length}`);
    console.log('\nSchedule IDs and Names:');
    console.log('=======================');
    
    // Sort schedules by ID for easier reading
    schedules.sort((a, b) => a.Id - b.Id);
    
    // Display all schedule IDs and names
    schedules.forEach(schedule => {
      console.log(`ID: ${schedule.Id.toString().padEnd(6)} | Name: ${schedule.Name || 'No Name'}`);
    });
    
    console.log('\nSchedule ID Summary:');
    console.log('===================');
    console.log(`Lowest ID: ${schedules[0].Id}`);
    console.log(`Highest ID: ${schedules[schedules.length - 1].Id}`);
    
    // Count schedules by repeat type
    const repeatTypes = {
      0: 'No Repeat',
      1: 'Daily',
      2: 'Weekly',
      3: 'Monthly',
      4: 'Yearly'
    };
    
    const repeatTypeCounts = {};
    schedules.forEach(schedule => {
      const type = repeatTypes[schedule.RepeatType] || `Unknown (${schedule.RepeatType})`;
      repeatTypeCounts[type] = (repeatTypeCounts[type] || 0) + 1;
    });
    
    console.log('\nSchedules by Repeat Type:');
    console.log('========================');
    Object.entries(repeatTypeCounts).forEach(([type, count]) => {
      console.log(`${type}: ${count}`);
    });
    
  } catch (error) {
    console.error('Error retrieving schedule IDs:', error.message);
  }
}

// Run the function
getAllScheduleIds().catch(err => {
  console.error('Error running script:', err.message);
}); 