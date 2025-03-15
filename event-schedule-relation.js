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

  // Method to get all events
  async getEvents() {
    return this.request('resource/Event');
  },

  // Method to get a specific schedule
  async getSchedule(id) {
    return this.request(`resource/Schedule/${id}`);
  }
};

// Test the relationship between Events and Schedules
async function testEventScheduleRelation() {
  console.log('Testing Event-Schedule Relationship...');
  
  try {
    // Get all events
    const events = await deputyClient.getEvents();
    console.log(`Found ${events.data.length} events`);
    
    // For each event, get its associated schedule
    for (let i = 0; i < Math.min(events.data.length, 5); i++) {
      const event = events.data[i];
      console.log(`\n--- Event ${i+1}: ${event.Title} (ID: ${event.Id}) ---`);
      console.log('Event Details:', JSON.stringify(event, null, 2));
      
      if (event.Schedule) {
        try {
          const schedule = await deputyClient.getSchedule(event.Schedule);
          console.log(`Associated Schedule (ID: ${event.Schedule}):`, JSON.stringify(schedule.data, null, 2));
        } catch (error) {
          console.error(`Error getting schedule ${event.Schedule}:`, error.message);
        }
      } else {
        console.log('No associated schedule for this event.');
      }
    }
  } catch (error) {
    console.error('Test Failed:', error.message);
  }
}

// Run the test
testEventScheduleRelation().catch(err => {
  console.error('Error running test:', err.message);
}); 