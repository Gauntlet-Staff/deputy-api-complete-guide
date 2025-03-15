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

  // Method to search for events by date range using the Event endpoint
  async searchEventsByDateRange(startDate, endDate) {
    // First, get all events
    const allEvents = await this.request('resource/Event');
    
    // Then filter events by checking their associated schedules
    const filteredEvents = [];
    
    for (const event of allEvents.data) {
      if (event.Schedule) {
        try {
          const scheduleResponse = await this.getSchedule(event.Schedule);
          const schedule = scheduleResponse.data;
          
          // Check if the schedule's start date is within our range
          const scheduleDate = new Date(schedule.StartDate);
          const startDateObj = new Date(startDate);
          const endDateObj = new Date(endDate);
          
          if (scheduleDate >= startDateObj && scheduleDate <= endDateObj) {
            // Add event details along with its schedule
            filteredEvents.push({
              ...event,
              scheduleDetails: schedule
            });
          }
        } catch (error) {
          console.log(`Could not retrieve schedule ${event.Schedule}: ${error.message}`);
        }
      }
    }
    
    return { data: filteredEvents };
  },

  // Method to search for schedules by date range
  async searchSchedulesByDateRange(startDate, endDate) {
    // Get all schedules
    const allSchedules = await this.request('resource/Schedule');
    
    // Filter schedules by date range
    const filteredSchedules = allSchedules.data.filter(schedule => {
      const scheduleDate = new Date(schedule.StartDate);
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      
      return scheduleDate >= startDateObj && scheduleDate <= endDateObj;
    });
    
    return { data: filteredSchedules };
  },

  // Method to search for roster events by date range
  async searchRosterEventsByDateRange(startDate, endDate) {
    // For Roster, we'll use individual queries for each date in the range
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    let allRosterEvents = [];
    const currentDate = new Date(startDateObj);
    
    // Loop through each date in the range
    while (currentDate <= endDateObj) {
      const dateString = currentDate.toISOString().split('T')[0];
      
      try {
        // Query for this specific date
        const searchParams = {
          search: {
            Date: dateString
          },
          max: 100
        };
        
        const response = await this.request('resource/Roster/QUERY', 'POST', searchParams);
        allRosterEvents = [...allRosterEvents, ...response.data];
      } catch (error) {
        console.log(`Error retrieving roster events for ${dateString}: ${error.message}`);
      }
      
      // Move to the next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return { data: allRosterEvents };
  },

  // Method to get a specific schedule by ID
  async getSchedule(id) {
    return this.request(`resource/Schedule/${id}`);
  }
};

// Test retrieving events by date range
async function testEventsByDateRange() {
  try {
    console.log('Testing retrieval of events by date range...');
    
    // Define date range (use a range where we know events exist)
    // For this example, let's use a range that includes 2023-10-09 (the date of SoapEvent with ID 1001)
    const startDate = '2023-09-01';
    const endDate = '2023-12-31';
    
    console.log(`Date range: ${startDate} to ${endDate}`);
    
    // Test 1: Get events by date range using Event endpoint
    try {
      console.log('\n--- Test 1: Get Events by Date Range (Event endpoint) ---');
      const events = await deputyClient.searchEventsByDateRange(startDate, endDate);
      
      console.log(`Found ${events.data.length} events in the date range`);
      
      if (events.data.length > 0) {
        console.log('\nEvents:');
        events.data.slice(0, 10).forEach(event => {
          console.log(`ID: ${event.Id}, Title: ${event.Title}, Schedule ID: ${event.Schedule}`);
          if (event.scheduleDetails) {
            console.log(`  Schedule: ${event.scheduleDetails.Name || 'No Name'}, StartDate: ${event.scheduleDetails.StartDate}, StartTime: ${event.scheduleDetails.StartTime}, EndTime: ${event.scheduleDetails.EndTime}`);
          }
        });
        
        if (events.data.length > 10) {
          console.log(`... and ${events.data.length - 10} more events`);
        }
      }
    } catch (error) {
      console.error('Test 1 Failed:', error.message);
    }
    
    // Test 2: Get schedules by date range
    try {
      console.log('\n--- Test 2: Get Schedules by Date Range ---');
      const schedules = await deputyClient.searchSchedulesByDateRange(startDate, endDate);
      
      console.log(`Found ${schedules.data.length} schedules in the date range`);
      
      if (schedules.data.length > 0) {
        console.log('\nSchedules:');
        schedules.data.slice(0, 10).forEach(schedule => {
          console.log(`ID: ${schedule.Id}, Name: ${schedule.Name || 'No Name'}, StartDate: ${schedule.StartDate}, StartTime: ${schedule.StartTime}, EndTime: ${schedule.EndTime}`);
        });
        
        if (schedules.data.length > 10) {
          console.log(`... and ${schedules.data.length - 10} more schedules`);
        }
      }
    } catch (error) {
      console.error('Test 2 Failed:', error.message);
    }
    
    // Test 3: Get roster events by date range (using a shorter range to avoid too many API calls)
    try {
      console.log('\n--- Test 3: Get Roster Events by Date Range (using a shorter range) ---');
      // Use just a 7-day range for the roster test to avoid too many API calls
      const rosterStartDate = '2023-10-09';
      const rosterEndDate = '2023-10-15';
      console.log(`Roster date range: ${rosterStartDate} to ${rosterEndDate}`);
      
      const rosterEvents = await deputyClient.searchRosterEventsByDateRange(rosterStartDate, rosterEndDate);
      
      console.log(`Found ${rosterEvents.data.length} roster events in the date range`);
      
      if (rosterEvents.data.length > 0) {
        console.log('\nRoster Events:');
        rosterEvents.data.slice(0, 10).forEach(event => {
          console.log(`ID: ${event.Id}, Date: ${event.Date}, StartTime: ${event.StartTime}, EndTime: ${event.EndTime}, Employee: ${event.Employee}`);
        });
        
        if (rosterEvents.data.length > 10) {
          console.log(`... and ${rosterEvents.data.length - 10} more roster events`);
        }
      }
    } catch (error) {
      console.error('Test 3 Failed:', error.message);
    }
    
  } catch (error) {
    console.error('Error testing events by date range:', error.message);
  }
}

// Run the tests
testEventsByDateRange().catch(err => {
  console.error('Error running tests:', err.message);
}); 