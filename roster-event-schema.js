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

  // Method to get resource schema
  async getResourceSchema(resourceName) {
    try {
      const response = await this.request(`resource/${resourceName}/INFO`);
      return response.data;
    } catch (error) {
      console.error(`Failed to get schema for ${resourceName}:`, error.message);
      throw error;
    }
  },

  // Method to get a sample roster event
  async getSampleRosterEvent() {
    try {
      // Get today's date
      const today = new Date();
      const dateString = today.toISOString().split('T')[0];
      
      // Query for a specific date to get a sample event
      const searchParams = {
        search: {
          Date: dateString
        },
        max: 1
      };
      
      const response = await this.request('resource/Roster/QUERY', 'POST', searchParams);
      
      // If no events found for today, try tomorrow
      if (response.data.length === 0) {
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const tomorrowString = tomorrow.toISOString().split('T')[0];
        
        searchParams.search.Date = tomorrowString;
        const nextResponse = await this.request('resource/Roster/QUERY', 'POST', searchParams);
        
        // If still no events, try the next 7 days
        if (nextResponse.data.length === 0) {
          const nextWeek = new Date(today);
          nextWeek.setDate(today.getDate() + 7);
          
          let currentDate = new Date(today);
          
          while (currentDate <= nextWeek && nextResponse.data.length === 0) {
            currentDate.setDate(currentDate.getDate() + 1);
            const dateStr = currentDate.toISOString().split('T')[0];
            
            searchParams.search.Date = dateStr;
            const dayResponse = await this.request('resource/Roster/QUERY', 'POST', searchParams);
            
            if (dayResponse.data.length > 0) {
              return dayResponse.data[0];
            }
          }
          
          throw new Error('No roster events found in the next 7 days');
        }
        
        return nextResponse.data[0];
      }
      
      return response.data[0];
    } catch (error) {
      console.error('Failed to get sample roster event:', error.message);
      throw error;
    }
  }
};

// Helper function to print a divider
function printDivider(char = '-', length = 100) {
  console.log(char.repeat(length));
}

// Function to analyze and display the schema of an object
function analyzeObjectSchema(obj, prefix = '') {
  const schema = {};
  
  for (const key in obj) {
    const value = obj[key];
    const type = Array.isArray(value) ? 'array' : typeof value;
    
    if (type === 'object' && value !== null) {
      schema[key] = {
        type,
        properties: analyzeObjectSchema(value, `${prefix}${key}.`)
      };
    } else if (type === 'array' && value.length > 0) {
      const firstItem = value[0];
      const itemType = typeof firstItem;
      
      if (itemType === 'object' && firstItem !== null) {
        schema[key] = {
          type,
          items: {
            type: itemType,
            properties: analyzeObjectSchema(firstItem, `${prefix}${key}[].`)
          }
        };
      } else {
        schema[key] = {
          type,
          items: {
            type: itemType
          }
        };
      }
    } else {
      schema[key] = {
        type,
        example: value
      };
    }
  }
  
  return schema;
}

// Function to display schema in a readable format
function displaySchema(schema, indent = 0) {
  const indentStr = ' '.repeat(indent);
  
  for (const key in schema) {
    const field = schema[key];
    
    if (field.type === 'object' && field.properties) {
      console.log(`${indentStr}${key} (Object):`);
      displaySchema(field.properties, indent + 2);
    } else if (field.type === 'array' && field.items) {
      if (field.items.type === 'object' && field.items.properties) {
        console.log(`${indentStr}${key} (Array of Objects):`);
        displaySchema(field.items.properties, indent + 2);
      } else {
        console.log(`${indentStr}${key} (Array of ${field.items.type})`);
      }
    } else {
      const example = field.example !== undefined ? ` = ${JSON.stringify(field.example)}` : '';
      console.log(`${indentStr}${key} (${field.type})${example}`);
    }
  }
}

// Main function to get and display the roster event schema
async function getRosterEventSchema() {
  try {
    console.log('\n📊 DEPUTY API: ROSTER EVENT SCHEMA 📊\n');
    printDivider('=');
    
    // Method 1: Get schema from API INFO endpoint
    console.log('\n📋 METHOD 1: SCHEMA FROM API INFO ENDPOINT');
    try {
      const apiSchema = await deputyClient.getResourceSchema('Roster');
      console.log('API Schema Response:');
      console.log(JSON.stringify(apiSchema, null, 2));
    } catch (error) {
      console.log('Could not retrieve schema from API INFO endpoint. Continuing with Method 2...');
    }
    
    // Method 2: Analyze a sample roster event
    console.log('\n📋 METHOD 2: SCHEMA FROM SAMPLE ROSTER EVENT');
    const sampleEvent = await deputyClient.getSampleRosterEvent();
    
    console.log('Sample Roster Event:');
    console.log(JSON.stringify(sampleEvent, null, 2));
    
    console.log('\nAnalyzed Schema:');
    const schema = analyzeObjectSchema(sampleEvent);
    displaySchema(schema);
    
    // Method 3: Provide a documented schema based on observations
    console.log('\n📋 METHOD 3: DOCUMENTED SCHEMA');
    printDivider('-');
    
    console.log(`
ROSTER EVENT SCHEMA:

Id (Number) - Unique identifier for the roster event
Date (String) - ISO date string for the event date
StartTime (Number) - Unix timestamp for the start time
EndTime (Number) - Unix timestamp for the end time
Mealbreak (String) - ISO date string for mealbreak time
Slots (Array of Objects) - Contains information about break periods or segments within the shift
  blnEmptySlot (Boolean) - Whether the slot is empty
  strType (String) - Type code for the slot
  intStart (Number) - Start offset
  intEnd (Number) - End offset
  intUnixStart (Number) - Unix timestamp for slot start
  intUnixEnd (Number) - Unix timestamp for slot end
  mixedActivity (Object) - Activity details
    intState (Number) - State code
    blnCanStartEarly (Number) - Whether activity can start early
    blnCanEndEarly (Number) - Whether activity can end early
    blnIsMandatory (Number) - Whether activity is mandatory
    strBreakType (String) - Break type code
  strTypeName (String) - Human-readable type name
  strState (String) - Human-readable state
TotalTime (Number) - Duration in hours
Cost (Number) - Cost value
OperationalUnit (Number) - Department or unit ID
Employee (Number) - ID of the employee assigned to this event
Comment (String) - Details about the event, often contains title and description
Warning (String) - Warning message if any
WarningOverrideComment (String) - Comment for warning override
Published (Boolean) - Whether the event is published and visible
MatchedByTimesheet (Number) - Timesheet matching status
CustomFieldData (Number) - Custom field data ID
Open (Boolean) - Whether it's an open shift
ApprovalRequired (Boolean) - Whether approval is needed
ConfirmStatus (Number) - Confirmation status code
ConfirmComment (String) - Comment for confirmation
ConfirmBy (Number) - ID of person who confirmed
ConfirmTime (Number) - Unix timestamp of confirmation time
SwapStatus (Number) - Swap status code
SwapManageBy (Null/Number) - ID of person managing swap
ShiftTemplate (Number) - Template ID used for this shift
ConnectStatus (Null/Number) - Connection status
ParentId (Null/Number) - Parent event ID if applicable
Creator (Number) - ID of the person who created this event
Created (String) - ISO datetime when the event was created
Modified (String) - ISO datetime when the event was last modified
OnCost (Number) - On-cost value
StartTimeLocalized (String) - Start time in local timezone
EndTimeLocalized (String) - End time in local timezone
ExternalId (Null/String) - External identifier if any
ConnectCreator (Null/Number) - Connect creator ID
_DPMetaData (Object) - Additional metadata
  System (String) - System name
  CreatorInfo (Object) - Details about the creator
    Id (Number) - Creator ID
    DisplayName (String) - Creator name
    EmployeeProfile (Number) - Creator profile ID
    Employee (Number) - Creator employee ID
    Photo (String) - URL to creator's photo
    Pronouns (Number) - Pronouns code
    CustomPronouns (String) - Custom pronouns if any
  OperationalUnitInfo (Object) - Details about the department
    Id (Number) - Department ID
    OperationalUnitName (String) - Department name
    Company (Number) - Company ID
    CompanyName (String) - Company name
    LabelWithCompany (String) - Combined label
  EmployeeInfo (Object) - Details about the employee
    Id (Number) - Employee ID
    DisplayName (String) - Employee name
    EmployeeProfile (Number) - Employee profile ID
    Employee (Number) - Employee ID (duplicate)
    Photo (String) - URL to employee's photo
    Pronouns (Number) - Pronouns code
    CustomPronouns (Null/String) - Custom pronouns if any
  SwapManageByInfo (Array) - Information about swap managers
BidsCount (Null/Number) - Count of bids if applicable
`);
    
    printDivider('=');
    console.log('\n✅ SUMMARY');
    console.log('Retrieved and analyzed the schema of a roster event from the Deputy API.');
    
  } catch (error) {
    console.error('Error retrieving roster event schema:', error.message);
  }
}

// Run the function to get the roster event schema
getRosterEventSchema().catch(err => {
  console.error('Error running script:', err.message);
}); 