import { categorizeSection, groupInventoryByType } from './sectionCategorizer';

// Test the categorization function
console.log('Testing section categorization...');

const testSections = [
  // Original test cases
  'SHUTTLE A',
  'VIP LOUNGE',
  'GA PLUS',
  'GA+',
  'GENERAL ADMISSION',
  'GA PIT',
  'SECTION 101',
  'VIP PARKING',
  'SHUTTLE B',
  'GA LAWN',
  
  // Case variations
  'shuttle a',
  'Shuttle A',
  'SHUTTLE',
  'vip lounge',
  'Vip Lounge',
  'VIP',
  'ga plus',
  'Ga Plus',
  'ga+',
  'GA+',
  'general admission',
  'General Admission',
  'ga pit',
  'Ga Pit',
  'ga lawn',
  'Ga Lawn',
  
  // Edge cases
  '  GA  ',  // with whitespace
  'gaplus',  // no space
  'GAPLUS',
  'gaplus',
  'VIPVIP',  // multiple occurrences
  'SHUTTLEVIP',  // combined
  'GENADM',  // abbreviated
  'General admission',  // mixed case
  'general admission',
  'GENERAL ADMISSION'
];

testSections.forEach(section => {
  const category = categorizeSection(section);
  console.log(`${section} -> ${category}`);
});

// Test inventory grouping
const testInventory = [
  { section: 'SHUTTLE A', ticketStatus: 'Active', availableNow: 2 },
  { section: 'vip lounge', ticketStatus: 'Active', availableNow: 3 },
  { section: 'GA PLUS', ticketStatus: 'Active', availableNow: 1 },
  { section: 'ga+', ticketStatus: 'Active', availableNow: 4 },
  { section: 'General Admission', ticketStatus: 'Active', availableNow: 5 },
  { section: 'SECTION 101', ticketStatus: 'Active', availableNow: 2 },
  { section: 'VIP PARKING', ticketStatus: 'Active', availableNow: 1 },
  { section: 'ga pit', ticketStatus: 'Active', availableNow: 3 }
];

const grouped = groupInventoryByType(testInventory);
console.log('Grouped inventory:', grouped); 