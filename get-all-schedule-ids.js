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

  // Method to search for schedules with pagination
  async searchSchedules(params = {}) {
    return this.request('resource/Schedule/QUERY', 'POST', params);
  }
};

// Get all schedule IDs using pagination
async function getAllScheduleIds() {
  try {
    console.log('Retrieving all schedule IDs using pagination...');
    
    let allSchedules = [];
    let offset = 0;
    const limit = 500;
    let hasMore = true;
    
    // Get schedule metadata to know the total count
    const metadata = await deputyClient.request('resource/Schedule/INFO');
    const totalCount = metadata.data.count;
    console.log(`Total schedules according to metadata: ${totalCount}`);
    
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
    
    console.log(`\nTotal Schedules Retrieved: ${allSchedules.length}`);
    
    // Sort schedules by ID for easier reading
    allSchedules.sort((a, b) => a.Id - b.Id);
    
    // Find the highest and lowest IDs
    const lowestId = allSchedules[0].Id;
    const highestId = allSchedules[allSchedules.length - 1].Id;
    
    console.log('\nSchedule ID Summary:');
    console.log('===================');
    console.log(`Lowest ID: ${lowestId}`);
    console.log(`Highest ID: ${highestId}`);
    
    // Display ID ranges
    console.log('\nSchedule ID Ranges:');
    console.log('=================');
    
    // Group IDs into ranges for cleaner display
    const ranges = [];
    let currentRange = { start: allSchedules[0].Id, end: allSchedules[0].Id };
    
    for (let i = 1; i < allSchedules.length; i++) {
      const currentId = allSchedules[i].Id;
      const prevId = allSchedules[i-1].Id;
      
      if (currentId === prevId + 1) {
        // Continue the current range
        currentRange.end = currentId;
      } else {
        // End the current range and start a new one
        ranges.push(currentRange);
        currentRange = { start: currentId, end: currentId };
      }
    }
    
    // Add the last range
    ranges.push(currentRange);
    
    // Display the ranges
    ranges.forEach(range => {
      if (range.start === range.end) {
        console.log(`ID: ${range.start}`);
      } else {
        console.log(`IDs: ${range.start} - ${range.end}`);
      }
    });
    
    // Display the highest IDs
    console.log('\nHighest Schedule IDs:');
    console.log('====================');
    const highestIds = allSchedules.slice(-20);
    highestIds.forEach(schedule => {
      console.log(`ID: ${schedule.Id.toString().padEnd(6)} | Name: ${schedule.Name || 'No Name'}`);
    });
    
  } catch (error) {
    console.error('Error retrieving schedule IDs:', error.message);
  }
}

// Run the function
getAllScheduleIds().catch(err => {
  console.error('Error running script:', err.message);
}); 