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

// Get all schedule IDs
async function getAllScheduleIds() {
  try {
    console.log('Compiling comprehensive list of schedule IDs...');
    
    // Get schedule metadata to know the total count
    const metadata = await deputyClient.request('resource/Schedule/INFO');
    const totalCount = metadata.data.count;
    console.log(`Total schedules according to metadata: ${totalCount}`);
    
    // Collect all schedules using pagination
    let allSchedules = [];
    let offset = 0;
    const limit = 500;
    let hasMore = true;
    
    // Fetch schedules in batches
    while (hasMore) {
      const response = await deputyClient.searchSchedules({
        max: limit,
        offset: offset,
        sort: { Id: 'ASC' }
      });
      
      const schedules = response.data;
      console.log(`Retrieved ${schedules.length} schedules (offset: ${offset})`);
      
      allSchedules = [...allSchedules, ...schedules];
      offset += limit;
      
      // Check if we've retrieved all schedules
      hasMore = schedules.length === limit && allSchedules.length < totalCount;
    }
    
    // Check for high ID schedules (1000+)
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
    
    // Add high ID schedules to the list if they're not already included
    for (const highSchedule of highIdSchedules.data) {
      if (!allSchedules.some(s => s.Id === highSchedule.Id)) {
        allSchedules.push(highSchedule);
      }
    }
    
    // Check specific high IDs that we know exist
    const specificHighIds = [1001, 1002, 1082, 1084, 1086, 1088, 1090];
    
    for (const id of specificHighIds) {
      if (!allSchedules.some(s => s.Id === id)) {
        try {
          const schedule = await deputyClient.getSchedule(id);
          allSchedules.push(schedule.data);
        } catch (error) {
          console.log(`Could not retrieve schedule with ID ${id}: ${error.message}`);
        }
      }
    }
    
    // Sort all schedules by ID
    allSchedules.sort((a, b) => a.Id - b.Id);
    
    // Remove duplicates (just in case)
    const uniqueSchedules = [];
    const seenIds = new Set();
    
    for (const schedule of allSchedules) {
      if (!seenIds.has(schedule.Id)) {
        seenIds.add(schedule.Id);
        uniqueSchedules.push(schedule);
      }
    }
    
    console.log(`\nTotal unique schedules found: ${uniqueSchedules.length}`);
    
    // Group schedules by ID range
    const idRanges = [];
    let currentRange = { start: uniqueSchedules[0].Id, end: uniqueSchedules[0].Id, count: 1 };
    
    for (let i = 1; i < uniqueSchedules.length; i++) {
      const currentId = uniqueSchedules[i].Id;
      const prevId = uniqueSchedules[i-1].Id;
      
      if (currentId === prevId + 1) {
        // Continue the current range
        currentRange.end = currentId;
        currentRange.count++;
      } else {
        // End the current range and start a new one
        idRanges.push(currentRange);
        currentRange = { start: currentId, end: currentId, count: 1 };
      }
    }
    
    // Add the last range
    idRanges.push(currentRange);
    
    // Display the ID ranges
    console.log('\nSchedule ID Ranges:');
    console.log('=================');
    
    idRanges.forEach(range => {
      if (range.start === range.end) {
        console.log(`ID: ${range.start}`);
      } else {
        console.log(`IDs: ${range.start} - ${range.end} (${range.count} schedules)`);
      }
    });
    
    // Display summary of named schedules
    const namedSchedules = uniqueSchedules.filter(s => s.Name && s.Name !== 'No Name');
    
    console.log(`\nNamed Schedules (${namedSchedules.length}/${uniqueSchedules.length}):`);
    console.log('=======================================');
    
    namedSchedules.forEach(schedule => {
      console.log(`ID: ${schedule.Id.toString().padEnd(6)} | Name: ${schedule.Name}`);
    });
    
    // Display summary of high ID schedules
    const highSchedules = uniqueSchedules.filter(s => s.Id >= 1000);
    
    console.log(`\nHigh ID Schedules (1000+) (${highSchedules.length}):`);
    console.log('=======================================');
    
    highSchedules.forEach(schedule => {
      console.log(`ID: ${schedule.Id.toString().padEnd(6)} | Name: ${schedule.Name || 'No Name'} | Created: ${schedule.Created}`);
    });
    
  } catch (error) {
    console.error('Error compiling schedule IDs:', error.message);
  }
}

// Run the function
getAllScheduleIds().catch(err => {
  console.error('Error running script:', err.message);
}); 