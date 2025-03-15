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
  async searchRosterEventsByDateRange(startDate, endDate, maxDays = 7) {
    // For Roster, we'll use individual queries for each date in the range
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    // Limit the number of days to query to avoid too many API calls
    const limitedEndDate = new Date(startDateObj);
    limitedEndDate.setDate(startDateObj.getDate() + maxDays - 1);
    
    const actualEndDate = limitedEndDate < endDateObj ? limitedEndDate : endDateObj;
    
    let allRosterEvents = [];
    const currentDate = new Date(startDateObj);
    
    // Loop through each date in the range
    while (currentDate <= actualEndDate) {
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

// Test retrieving events by date range
async function demonstrateEventsByDateRange() {
  try {
    console.log('\n📅 DEPUTY API: RETRIEVING EVENTS BY DATE RANGE 📅\n');
    printDivider('=');
    
    // Define date ranges for our tests
    const ranges = [
      {
        name: 'Recent Events (Last 3 Months)',
        startDate: '2023-09-01',
        endDate: '2023-12-31'
      },
      {
        name: 'Current Month Events',
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
      },
      {
        name: 'Specific Week (Oct 9-15, 2023)',
        startDate: '2023-10-09',
        endDate: '2023-10-15'
      }
    ];
    
    // Test each date range
    for (const range of ranges) {
      console.log(`\n🔍 TESTING DATE RANGE: ${range.name}`);
      console.log(`   From ${range.startDate} to ${range.endDate}`);
      printDivider('-');
      
      // Method 1: Get events by date range using Event endpoint
      try {
        console.log('\n📋 METHOD 1: Events via Event Endpoint');
        const events = await deputyClient.searchEventsByDateRange(range.startDate, range.endDate);
        
        console.log(`Found ${events.data.length} events in the date range`);
        
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
        console.error('Method 1 Failed:', error.message);
      }
      
      // Method 2: Get schedules by date range
      try {
        console.log('\n📋 METHOD 2: Schedules via Schedule Endpoint');
        const schedules = await deputyClient.searchSchedulesByDateRange(range.startDate, range.endDate);
        
        console.log(`Found ${schedules.data.length} schedules in the date range`);
        
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
        console.error('Method 2 Failed:', error.message);
      }
      
      // Method 3: Get roster events by date range (only for the specific week range)
      if (range.name === 'Specific Week (Oct 9-15, 2023)') {
        try {
          console.log('\n📋 METHOD 3: Roster Events via Roster Endpoint');
          const rosterEvents = await deputyClient.searchRosterEventsByDateRange(range.startDate, range.endDate);
          
          console.log(`Found ${rosterEvents.data.length} roster events in the date range`);
          
          if (rosterEvents.data.length > 0) {
            printDivider('-');
            console.log('ROSTER ID | DATE             | START TIME         | END TIME           | EMPLOYEE ID');
            printDivider('-');
            
            // Display first 10 roster events
            rosterEvents.data.slice(0, 10).forEach(event => {
              const date = formatDateTime(event.Date).split(',')[0];
              const startTime = formatUnixTimestamp(event.StartTime).split(',')[1];
              const endTime = formatUnixTimestamp(event.EndTime).split(',')[1];
              
              console.log(`${event.Id.toString().padEnd(9)} | ${date.padEnd(16)} | ${startTime.padEnd(19)} | ${endTime.padEnd(19)} | ${event.Employee}`);
            });
            
            if (rosterEvents.data.length > 10) {
              console.log(`... and ${rosterEvents.data.length - 10} more roster events`);
            }
          }
        } catch (error) {
          console.error('Method 3 Failed:', error.message);
        }
      }
      
      printDivider('=');
    }
    
    console.log('\n📝 SUMMARY OF FINDINGS');
    console.log('1. Event Endpoint: Allows retrieving events by filtering on associated schedule dates');
    console.log('2. Schedule Endpoint: Allows direct filtering by schedule start date');
    console.log('3. Roster Endpoint: Provides detailed roster events for specific dates');
    console.log('\n✅ RECOMMENDATION');
    console.log('- For calendar events/holidays: Use the Event endpoint');
    console.log('- For schedule templates: Use the Schedule endpoint');
    console.log('- For employee shifts/rosters: Use the Roster endpoint');
    
  } catch (error) {
    console.error('Error demonstrating events by date range:', error.message);
  }
}

// Run the demonstration
demonstrateEventsByDateRange().catch(err => {
  console.error('Error running demonstration:', err.message);
}); 