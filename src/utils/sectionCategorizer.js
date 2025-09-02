/**
 * Categorizes sections into ticket types based on section name
 * @param {string} section - The section name to categorize
 * @returns {string} - The categorized ticket type
 */
export const categorizeSection = (section) => {
  if (!section) return 'uncategorized';
  
  // Convert to lowercase and trim whitespace for consistent comparison
  const sectionLower = section.toLowerCase().trim();
  
  // Check for shuttle sections (case insensitive)
  if (sectionLower.includes('shuttle')) {
    return 'SHUTTLE';
  }
  
  // Check for VIP sections (case insensitive)
  if (sectionLower.includes('vip')) {
    return 'VIP';
  }
  
  // Check for GA+ or GA Plus sections (case insensitive)
  if (sectionLower.includes('ga plus') || sectionLower.includes('ga+')) {
    return 'GA_PLUS';
  }
  
  // Check for general GA sections (case insensitive)
  // Look for "ga" but exclude "ga+" and "ga plus" variations
  if (sectionLower.includes('ga') && 
      !sectionLower.includes('ga+') && 
      !sectionLower.includes('ga plus') &&
      !sectionLower.includes('gaplus')) {
    return 'GA';
  }
  
  // Check for "general admission" variations
  if (sectionLower.includes('general admission') || 
      sectionLower.includes('general')) {
    return 'GA';
  }
  
  // Check for section numbers (like "SECTION 101", "101", etc.)
  // These are typically general admission
  if (/^section\s+\d+/i.test(section) || 
      /^\d+$/i.test(section) ||
      /^[a-z]+\s+\d+/i.test(section)) {
    return 'GA';
  }
  
  // Check for common GA section patterns
  if (sectionLower.includes('pit') || 
      sectionLower.includes('lawn') || 
      sectionLower.includes('floor') ||
      sectionLower.includes('standing') ||
      sectionLower.includes('general')) {
    return 'GA';
  }
  
  // Default to uncategorized if no match
  return 'uncategorized';
};

/**
 * Groups inventory by ticket type categories and counts ticket quantities
 * @param {Array} inventory - Array of inventory items
 * @returns {Object} - Object with categorized inventory counts and uncategorized details
 */
export const groupInventoryByType = (inventory) => {
  const categories = {
    CONCERN: 0,
    SHUTTLE: 0,
    VIP: 0,
    GA_PLUS: 0,
    GA: 0,
    uncategorized: 0
  };
  
  if (!inventory || !Array.isArray(inventory)) {
    return { categories, uncategorizedSections: [] };
  }
  
  // Track uncategorized sections for debugging and display
  const uncategorizedSections = [];
  
  inventory.forEach(item => {
    // Normalize tags
    const tags = (item.tags || []).map(tagItem => tagItem.replace(/[-\s]/g, '').toLowerCase());
    // Exclude pre-sale, presale, presell
    if (tags.some(t => t === 'presale' || t === 'presell' || t === 'presale')) return;
    // Concern logic
    if (tags.some(t => t === 'concern' || t === 'concerned')) {
      categories.CONCERN += item.availableNow || 0;
      return;
    }
    const category = categorizeSection(item.section);
    const quantity = item.availableNow || 0;
    categories[category] += quantity;
    if (category === 'uncategorized' && item.section) {
      uncategorizedSections.push({
        section: item.section,
        quantity: quantity
      });
    }
  });
  return { categories, uncategorizedSections };
};

/**
 * Groups sales by ticket type categories and counts ticket quantities
 * @param {Array} sales - Array of sales items
 * @param {Object} manualCategories - Optional manual section-to-category mapping
 * @returns {Object} - Object with categorized sales counts and uncategorized details
 */
export const groupSalesByType = (sales, manualCategories = {}) => {
  const categories = {
    CONCERN: 0,
    SHUTTLE: 0,
    VIP: 0,
    GA_PLUS: 0,
    GA: 0,
    uncategorized: 0
  };
  if (!sales || !Array.isArray(sales)) {
    return { categories, uncategorizedSections: [] };
  }
  // Flatten all sale items
  const allItems = sales.flatMap(sale => Array.isArray(sale.items) ? sale.items.map(item => ({ ...item, tags: sale.tags })) : []);
  const uncategorizedSections = [];
  allItems.forEach(item => {
    // Normalize tags
    const tags = (item.tags || []).map(tagItem => tagItem.replace(/[-\s]/g, '').toLowerCase());
    // Exclude pre-sale, presale, presell
    if (tags.some(t => t === 'presale' || t === 'presell' || t === 'presale')) return;
    // Concern logic
    if (tags.some(t => t === 'concern' || t === 'concerned')) {
      categories.CONCERN += item.quantity || item.ticketQuantity || item.availableNow || 1;
      return;
    }
    // Use manualCategories if present
    const section = item.section;
    const category = manualCategories && manualCategories[section] ? manualCategories[section] : categorizeSection(section);
    const quantity = item.quantity || item.ticketQuantity || item.availableNow || 1;
    categories[category] += quantity;
    if (category === 'uncategorized' && item.section) {
      uncategorizedSections.push({
        section: item.section,
        quantity: quantity
      });
    }
  });
  return { categories, uncategorizedSections };
};

/**
 * Gets the display name for a ticket type
 * @param {string} type - The ticket type
 * @returns {string} - The display name
 */
export const getTicketTypeDisplayName = (type) => {
  const displayNames = {
    CONCERN: 'Concern',
    SHUTTLE: 'Shuttle',
    VIP: 'VIP',
    GA_PLUS: 'GA+',
    GA: 'General Admission',
    uncategorized: 'Uncategorized'
  };
  
  return displayNames[type] || type;
};

/**
 * Gets the color for a ticket type
 * @param {string} type - The ticket type
 * @returns {string} - The color class
 */
export const getTicketTypeColor = (type) => {
  const colors = {
    CONCERN: 'bg-red-500',
    SHUTTLE: 'bg-blue-500',
    VIP: 'bg-purple-500',
    GA_PLUS: 'bg-green-500',
    GA: 'bg-gray-500',
    uncategorized: 'bg-orange-500'
  };
  
  return colors[type] || 'bg-gray-400';
}; 