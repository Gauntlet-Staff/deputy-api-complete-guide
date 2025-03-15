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

// Helper function to format date and time
function formatDateTime(dateTimeStr) {
  if (!dateTimeStr) return 'N/A';
  
  const date = new Date(dateTimeStr);
  return date.toLocaleString();
}

// Helper function to format Unix timestamp
function formatUnixTimestamp(timestamp) {
  if (!timestamp) return 'N/A';
  
  const date = new Date(timestamp * 1000);
  return date.toLocaleString();
}

// Helper function to print a divider
function printDivider(char = '-', length = 80) {
  console.log(char.repeat(length));
}

// Function to get events for the next 7 days
async function getNextSevenDaysEvents() {
  try {
    console.log('\n📅 DEPUTY API: RETRIEVING EVENTS FOR THE NEXT 7 DAYS 📅\n');
    printDivider('=');
    
    // Calculate today's date and 7 days from now
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to beginning of day
    
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    // Format dates as YYYY-MM-DD
    const startDate = today.toISOString().split('T')[0];
    const endDate = nextWeek.toISOString().split('T')[0];
    
    console.log(`Date Range: ${startDate} to ${endDate}`);
    printDivider('-');
    
    // 1. Get events using Event endpoint
    try {
      console.log('\n📋 EVENTS (via Event Endpoint)');
      const events = await deputyClient.searchEventsByDateRange(startDate, endDate);
      
      console.log(`Found ${events.data.length} events in the next 7 days`);
      
      if (events.data.length > 0) {
        printDivider('-');
        console.log('EVENT ID | TITLE                  | SCHEDULE ID | SCHEDULE DATE       | SCHEDULE TIME');
        printDivider('-');
        
        events.data.forEach(event => {
          const scheduleDate = event.scheduleDetails ? formatDateTime(event.scheduleDetails.StartDate).split(',')[0] : 'N/A';
          const scheduleTime = event.scheduleDetails ? 
            `${formatDateTime(event.scheduleDetails.StartTime).split(',')[1]} - ${formatDateTime(event.scheduleDetails.EndTime).split(',')[1]}` : 'N/A';
          
          console.log(`${event.Id.toString().padEnd(8)} | ${(event.Title || 'No Title').padEnd(22)} | ${(event.Schedule?.toString() || 'N/A').padEnd(11)} | ${scheduleDate.padEnd(19)} | ${scheduleTime}`);
        });
      }
    } catch (error) {
      console.error('Failed to retrieve events:', error.message);
    }
    
    // 2. Get schedules
    try {
      console.log('\n📋 SCHEDULES (via Schedule Endpoint)');
      const schedules = await deputyClient.searchSchedulesByDateRange(startDate, endDate);
      
      console.log(`Found ${schedules.data.length} schedules in the next 7 days`);
      
      if (schedules.data.length > 0) {
        printDivider('-');
        console.log('SCHEDULE ID | NAME                    | START DATE         | TIME RANGE');
        printDivider('-');
        
        schedules.data.forEach(schedule => {
          const startDate = formatDateTime(schedule.StartDate).split(',')[0];
          const timeRange = `${formatDateTime(schedule.StartTime).split(',')[1]} - ${formatDateTime(schedule.EndTime).split(',')[1]}`;
          
          console.log(`${schedule.Id.toString().padEnd(11)} | ${(schedule.Name || 'No Name').padEnd(24)} | ${startDate.padEnd(19)} | ${timeRange}`);
        });
      }
    } catch (error) {
      console.error('Failed to retrieve schedules:', error.message);
    }
    
    // 3. Get roster events
    try {
      console.log('\n📋 ROSTER EVENTS (via Roster Endpoint)');
      const rosterEvents = await deputyClient.searchRosterEventsByDateRange(startDate, endDate);
      
      console.log(`Found ${rosterEvents.data.length} roster events in the next 7 days`);
      
      if (rosterEvents.data.length > 0) {
        printDivider('-');
        console.log('ROSTER ID | DATE             | START TIME         | END TIME           | EMPLOYEE ID');
        printDivider('-');
        
        // Display roster events
        rosterEvents.data.forEach((event, index) => {
          const date = formatDateTime(event.Date).split(',')[0];
          const startTime = formatUnixTimestamp(event.StartTime).split(',')[1];
          const endTime = formatUnixTimestamp(event.EndTime).split(',')[1];
          
          console.log(`${event.Id.toString().padEnd(9)} | ${date.padEnd(16)} | ${startTime.padEnd(19)} | ${endTime.padEnd(19)} | ${event.Employee}`);
          
          // Display the full structure of the first roster event
          if (index === 0) {
            console.log('\n📝 SAMPLE ROSTER EVENT OBJECT STRUCTURE:');
            console.log(JSON.stringify(event, null, 2));
            printDivider('-');
          }
        });
      }
    } catch (error) {
      console.error('Failed to retrieve roster events:', error.message);
    }
    
    printDivider('=');
    console.log('\n✅ SUMMARY');
    console.log('Retrieved all events, schedules, and roster events for the next 7 days.');
    
  } catch (error) {
    console.error('Error retrieving events for the next 7 days:', error.message);
  }
}

// Run the function to get events for the next 7 days
getNextSevenDaysEvents().catch(err => {
  console.error('Error running script:', err.message);
}); 