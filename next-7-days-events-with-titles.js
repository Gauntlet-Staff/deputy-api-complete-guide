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
function printDivider(char = '-', length = 100) {
  console.log(char.repeat(length));
}

// Function to extract title from comment
function extractTitle(comment) {
  if (!comment) return 'No Title';
  
  // Get the first line of the comment as the title
  const firstLine = comment.split('\n')[0].trim();
  return firstLine || 'No Title';
}

// Function to get events for the next 7 days with titles
async function getNextSevenDaysEventsWithTitles() {
  try {
    console.log('\n📅 DEPUTY API: RETRIEVING ROSTER EVENTS FOR THE NEXT 7 DAYS WITH TITLES 📅\n');
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
    
    // Get roster events
    try {
      console.log('\n📋 ROSTER EVENTS WITH TITLES');
      const rosterEvents = await deputyClient.searchRosterEventsByDateRange(startDate, endDate);
      
      console.log(`Found ${rosterEvents.data.length} roster events in the next 7 days`);
      
      if (rosterEvents.data.length > 0) {
        printDivider('-');
        console.log('DATE       | TIME                | INSTRUCTOR           | TITLE');
        printDivider('-');
        
        // Group events by date
        const eventsByDate = {};
        
        rosterEvents.data.forEach(event => {
          const date = formatDateTime(event.Date).split(',')[0];
          if (!eventsByDate[date]) {
            eventsByDate[date] = [];
          }
          eventsByDate[date].push(event);
        });
        
        // Sort dates
        const sortedDates = Object.keys(eventsByDate).sort((a, b) => {
          return new Date(a) - new Date(b);
        });
        
        // Display events by date
        for (const date of sortedDates) {
          console.log(`\n📆 ${date} (${eventsByDate[date].length} events):`);
          printDivider('-');
          
          // Sort events by start time
          const sortedEvents = eventsByDate[date].sort((a, b) => {
            return a.StartTime - b.StartTime;
          });
          
          sortedEvents.forEach(event => {
            const startTime = formatUnixTimestamp(event.StartTime).split(',')[1].trim();
            const endTime = formatUnixTimestamp(event.EndTime).split(',')[1].trim();
            const timeRange = `${startTime} - ${endTime}`;
            
            const employeeName = event._DPMetaData?.EmployeeInfo?.DisplayName || `Employee ID: ${event.Employee}`;
            const title = extractTitle(event.Comment);
            
            console.log(`${date.padEnd(10)} | ${timeRange.padEnd(20)} | ${employeeName.padEnd(20)} | ${title}`);
          });
        }
        
        // Display events in a tabular format
        console.log('\n📊 ALL EVENTS (TABULAR FORMAT):');
        printDivider('-');
        console.log('DATE       | TIME                | INSTRUCTOR           | TITLE');
        printDivider('-');
        
        // Sort all events by date and time
        const allEvents = [...rosterEvents.data].sort((a, b) => {
          if (a.Date !== b.Date) {
            return new Date(a.Date) - new Date(b.Date);
          }
          return a.StartTime - b.StartTime;
        });
        
        allEvents.forEach(event => {
          const date = formatDateTime(event.Date).split(',')[0];
          const startTime = formatUnixTimestamp(event.StartTime).split(',')[1].trim();
          const endTime = formatUnixTimestamp(event.EndTime).split(',')[1].trim();
          const timeRange = `${startTime} - ${endTime}`;
          
          const employeeName = event._DPMetaData?.EmployeeInfo?.DisplayName || `Employee ID: ${event.Employee}`;
          const title = extractTitle(event.Comment);
          
          console.log(`${date.padEnd(10)} | ${timeRange.padEnd(20)} | ${employeeName.padEnd(20)} | ${title}`);
        });
      }
    } catch (error) {
      console.error('Failed to retrieve roster events:', error.message);
    }
    
    printDivider('=');
    console.log('\n✅ SUMMARY');
    console.log('Retrieved all roster events with titles for the next 7 days.');
    
  } catch (error) {
    console.error('Error retrieving events for the next 7 days:', error.message);
  }
}

// Run the function to get events for the next 7 days with titles
getNextSevenDaysEventsWithTitles().catch(err => {
  console.error('Error running script:', err.message);
}); 