import React, { useState, useEffect } from 'react';
import { PieChart, Tag, TrendingUp, AlertTriangle, Package, DollarSign } from 'lucide-react';
import { 
  groupInventoryByType, 
  groupSalesByType,
  getTicketTypeDisplayName, 
  getTicketTypeColor,
  categorizeSection
} from '../utils/sectionCategorizer';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import ListedForSaleAndSalesBreakdown from './ListedForSaleAndSalesBreakdown';
import { userDataService } from '../services/userDataService';

const CATEGORY_OPTIONS = [
  { value: 'GA', label: 'General Admission' },
  { value: 'GA_PLUS', label: 'GA Plus' },
  { value: 'VIP', label: 'VIP' },
  { value: 'SHUTTLE', label: 'Shuttle' },
  { value: 'CONCERN', label: 'Concern' },
];

function renderPrivateNote(note) {
  if (typeof note !== 'string') note = note ? String(note) : '';
  if (!note) return <span className="italic text-gray-400">(none)</span>;
  // Match key: value pairs (including empty values)
  const pairRegex = /\b(\w+):\s*([^\n]*)/g;
  let match;
  let parsedPairs = [];
  let keysSeen = new Set();
  let usedText = '';
  while ((match = pairRegex.exec(note)) !== null) {
    const key = match[1]?.trim();
    const value = match[2]?.trim();
    // Only add if value is non-empty and key not already seen
    if (key && value && !keysSeen.has(key)) {
      parsedPairs.push({ key, value });
      keysSeen.add(key);
      usedText += `${key}: ${value}\n`;
    }
  }
  // Remove all parsed pairs and all keys (even empty) from the note for additional notes
  let additional = note;
  // Remove all 'key:' and 'key: value' patterns
  const allKeys = Array.from(keysSeen);
  allKeys.forEach(key => {
    // Remove 'key:' and 'key: value' (with or without value)
    additional = typeof additional === 'string' ? additional.replace(new RegExp(`${key}: ?[^\n]*`, 'g'), '') : '';
  });
  // Remove all values
  parsedPairs.forEach(({ value }) => {
    additional = typeof additional === 'string' ? additional.replace(new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '') : '';
  });
  additional = typeof additional === 'string' ? additional.replace(/^[\n\s:]+|[\n\s:]+$/g, '') : '';
  // Only show Additional Notes if there is truly extra, non-key-value content
  return (
    <div>
      {parsedPairs.length > 0 && (
        <dl>
          {parsedPairs.map((pair, idx) => (
            <div key={idx} className="flex">
              <dt className="font-semibold mr-1">{pair.key}:</dt>
              <dd className="break-all">{pair.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {additional && additional.trim() && (
        <div className="mt-1">
          <span className="font-semibold">Additional Notes:</span> <span className="break-all">{additional.trim()}</span>
        </div>
      )}
    </div>
  );
}

function extractTrackingNumber(note) {
  if (typeof note !== 'string') note = note ? String(note) : '';
  // Match after trackingNumber: up to next key (e.g., subId:) or line break
  const match = note.match(/trackingNumber:\s*([A-Za-z0-9\s]+?)(?=\s+\w+:|$)/i);
  if (match) {
    const value = match[1].replace(/\s+/g, '');
    // If the value contains 'sub' (case-insensitive), treat as not a tracking number
    if (/sub/i.test(value)) {
      return null;
    }
    // Only return if it's at least 12 alphanumeric characters and not just another field label
    if (/^[A-Za-z0-9]{12,}$/.test(value) && !/^subid$/i.test(value)) {
      return value;
    }
  }
  // Fallback: look for a standalone 12+ alphanumeric string
  const fallback = note.match(/\b([A-Za-z0-9]{12,})\b/);
  if (fallback) {
    // If fallback value contains 'sub', ignore
    if (/sub/i.test(fallback[1])) {
      return null;
    }
    return fallback[1];
  }
  return null;
}

function getTrackingLink(trackingNumber) {
  if (!trackingNumber) return null;
  
  // UPS tracking numbers (1Z followed by 16 characters)
  if (/^1Z[A-Z0-9]{16}$/i.test(trackingNumber)) {
    return `https://www.ups.com/track?tracknum=${trackingNumber}`;
  }
  
  // FedEx tracking numbers (12 digits)
  if (/^\d{12}$/.test(trackingNumber)) {
    return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
  }
  
  // USPS tracking numbers (20 digits or 13 characters starting with 9400)
  if (/^\d{20}$/.test(trackingNumber) || /^9400\d{9}$/.test(trackingNumber)) {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
  }
  
  // DHL tracking numbers (10 digits)
  if (/^\d{10}$/.test(trackingNumber)) {
    return `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`;
  }
  
  return null;
}

function detectCarrier(trackingNumber) {
  if (!trackingNumber) return null;
  if (/^1Z[0-9A-Z]{16}$/i.test(trackingNumber)) return 'UPS';
  if (/^(92|93|94|95|96|97|98|99|9505)\d{16,21}$/.test(trackingNumber) || /^\d{20,22}$/.test(trackingNumber)) return 'USPS';
  if (/^\d{12}$/.test(trackingNumber)) return 'FedEx';
  return null;
}

const SectionBreakdown = ({ inventory, sales }) => {
  // Load manualCategories from backend/localStorage on mount
  const [manualCategories, setManualCategories] = useState({});
  
  useEffect(() => {
    async function loadManualCategories() {
      try {
        const categories = await userDataService.getManualCategories();
        setManualCategories(categories);
      } catch (error) {
        console.error('Failed to load manual categories:', error);
        setManualCategories({});
      }
    }
    loadManualCategories();
  }, []);

  // Save manualCategories to backend/localStorage whenever it changes
  useEffect(() => {
    // This effect will be triggered when manualCategories changes
    // The actual saving is handled by the userDataService when categories are set
  }, [manualCategories]);

  // Local state for manual categorization
  // State for individual listings population
  const [showIndividualListings, setShowIndividualListings] = useState(false);
  // State for filtering individual listings
  const [listingStatusFilter, setListingStatusFilter] = useState('ALL');
  const [listingNoteSearch, setListingNoteSearch] = useState('');
  // State for filtering data type (Inventory vs Ticket Sales)
  const [dataTypeFilter, setDataTypeFilter] = useState('inventory'); // 'inventory' or 'sales'
  const [showMarketplaceModal, setShowMarketplaceModal] = useState(null); // { type: 'stubhub'|'vivid'|'seatgeek', eventId: string }
  const [customMarketplaceLink, setCustomMarketplaceLink] = useState('');
  const [marketplaceEventId, setMarketplaceEventId] = useState('');
  const [trackingModal, setTrackingModal] = useState(null); // { trackingNumber, carrier, link }
  // Add state for per-listing marketplace modal
  const [showListingMarketplaceModal, setShowListingMarketplaceModal] = useState(null); // { type: 'stubhub'|'vivid'|'seatgeek', eventId: string, listingId: string }
  const [customListingMarketplaceLink, setCustomListingMarketplaceLink] = useState('');
  const [listingMarketplaceEventId, setListingMarketplaceEventId] = useState('');
  const [listingMarketplaceListingId, setListingMarketplaceListingId] = useState('');

  if ((!inventory || inventory.length === 0) && (!sales || sales.length === 0)) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <PieChart className="h-6 w-6 text-primary-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Section Breakdown</h3>
        </div>
        <div className="text-center text-gray-500 py-8">
          <Tag className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No inventory or sales data available</p>
        </div>
      </div>
    );
  }

  // Process inventory data
  const inventoryData = inventory && inventory.length > 0 ? groupInventoryByType(inventory, manualCategories) : { categories: {}, uncategorizedSections: [] };
  // Apply manual categorization to inventory
  const adjustedInventoryCategories = { ...inventoryData.categories };
  let adjustedUncategorizedSections = [];
  let manualCategorizedTotal = 0;
  inventoryData.uncategorizedSections.forEach((item) => {
    const manualCat = manualCategories[item.section];
    if (manualCat) {
      adjustedInventoryCategories[manualCat] = (adjustedInventoryCategories[manualCat] || 0) + item.quantity;
      manualCategorizedTotal += item.quantity;
    } else {
      adjustedUncategorizedSections.push(item);
    }
  });
  // Calculate total inventory from original inventory data, excluding pre-sale, presale, presell
  const inventoryTotal = inventory && inventory.length > 0
    ? inventory.filter(item => {
        const tags = (item.tags || []).map(tag => tag.replace(/[-\s]/g, '').toLowerCase());
        return !tags.some(t => t === 'presale' || t === 'presell' || t === 'presale');
      }).reduce((sum, item) => sum + (item.availableNow || 0), 0)
    : 0;
  const activeInventoryCategories = Object.entries(adjustedInventoryCategories).filter(([type, count]) => type !== 'uncategorized' && count > 0);

  // Process sales data (no manual override yet)
  const salesData = sales && sales.length > 0 ? groupSalesByType(sales, manualCategories) : { categories: {}, uncategorizedSections: [] };
  const salesCategories = salesData.categories;

  // --- NEW: Build unfilledSalesCategories for Unfilled Sales and Differential ---
  // Only count sales by type where the status is Unfilled (not concern, not filled pending shipment)
  const unfilledSalesCategories = {};
  if (sales && sales.length > 0) {
    (sales || []).forEach(sale => {
      (sale.items || []).forEach(item => {
        // Find the matching listing in inventory
        const listing = (inventory || []).find(listingItem => String(listingItem.id) === String(item.listingId));
        const listingTags = (listing?.tags || []).map(tag => tag.replace(/[-\s]/g, '').toLowerCase());
        // Use manualCategories if present
        const section = item.section;
        const category = manualCategories && manualCategories[section] ? manualCategories[section] : (listing ? categorizeSection(listing.section) : categorizeSection(section));
        const itemQuantity = item.quantity || item.ticketQuantity || item.availableNow || 1;
        // Determine status for this sale item using listing tags
        let isConcern = listingTags.includes('concern') || listingTags.includes('concerned');
        let isPresale = listingTags.includes('presale') || listingTags.includes('presell') || listingTags.includes('pre-sale');
        // For differential calculation: only count sales that are NOT filled pending shipment
        // (i.e., only count presale sales, since filled pending shipment = anything not presale/concern)
        if (!isConcern && isPresale) {
          unfilledSalesCategories[category] = (unfilledSalesCategories[category] || 0) + itemQuantity;
        }
      });
    });
  }
  // Calculate total sales as total ticket quantity sold (sum of all item quantities in all sales)
  const salesTotal = sales && sales.length > 0
    ? sales.flatMap(sale => Array.isArray(sale.items) ? sale.items : [])
        .reduce((sum, item) => sum + (item.quantity || item.ticketQuantity || item.availableNow || 1), 0)
    : 0;
  const activeSalesCategories = Object.entries(salesCategories).filter(([type, count]) => type !== 'uncategorized' && count > 0);

  // Handler for manual categorization
  const handleManualCategorize = async (section, category) => {
    try {
      if (category) {
        await userDataService.setManualCategory(section, category);
      } else {
        await userDataService.deleteManualCategory(section);
      }
      setManualCategories((prev) => ({ ...prev, [section]: category }));
    } catch (error) {
      console.error('Failed to save manual category:', error);
      // Still update local state even if backend save fails
      setManualCategories((prev) => ({ ...prev, [section]: category }));
    }
  };

  // Get all ticket types (including those with 0 in either inventory or sales)
  const allTicketTypes = ['GA', 'GA_PLUS', 'VIP', 'SHUTTLE', 'CONCERN'];

  // Helper to get differential color classes
  function getDifferentialColor(diff) {
    if (diff > 0) {
      // The higher the diff, the darker the green (up to a point)
      if (diff >= 10) return 'bg-green-200 text-green-800';
      if (diff >= 5) return 'bg-green-100 text-green-700';
      return 'bg-green-50 text-green-600';
    } else if (diff < 0) {
      if (diff <= -10) return 'bg-red-200 text-red-800';
      if (diff <= -5) return 'bg-red-100 text-red-700';
      return 'bg-red-50 text-red-600';
    } else {
      return 'bg-gray-50 text-gray-700';
    }
  }

  // --- Status Breakdown Logic ---
  // Helper to normalize tags
  function normalizeTag(tag) {
    return tag.replace(/[-\s]/g, '').toLowerCase();
  }

  // Inventory Status Buckets
  const statusBuckets = {
    concern: 0,
    inHand: 0,
    tnDelivered: 0,
    enRoute: 0,
    goodTickets: 0,
  };
  // Track which inventory items are in which bucket
  let goodTicketIds = new Set();

  (inventory || []).forEach(item => {
    const tags = (item.tags || []).map(normalizeTag);
    // Exclude shipped/presale
    if (tags.some(t => ['shipped', 'presale', 'presell', 'presale'].includes(t))) return;
    const qty = item.availableNow || 0;
    if (tags.some(t => t === 'concern' || t === 'concerned')) {
      statusBuckets.concern += qty;
    } else if (tags.includes('delivered')) {
      statusBuckets.inHand += qty;
      goodTicketIds.add(item.id);
    } else if ((tags.includes('tndelivered') || tags.includes('tndelivered')) && !tags.includes('delivered')) {
      statusBuckets.tnDelivered += qty;
      goodTicketIds.add(item.id);
    } else if ((tags.includes('tngiven') || tags.includes('tngiven')) && !tags.includes('delivered') && !tags.includes('tndelivered')) {
      statusBuckets.enRoute += qty;
      goodTicketIds.add(item.id);
    } else {
      statusBuckets.goodTickets += qty;
      goodTicketIds.add(item.id);
    }
  });
  // Good Tickets should include all tickets not in concern, and all in inHand, tnDelivered, enRoute
  statusBuckets.goodTickets += statusBuckets.inHand + statusBuckets.tnDelivered + statusBuckets.enRoute;

  // Sales Status Buckets
  const salesStatusBuckets = {
    concern: 0,
    unfilled: 0,
    filledPendingShipment: 0, // New category
  };
  (sales || []).forEach(sale => {
    (sale.items || []).forEach(item => {
      // Find the matching listing in inventory
      const listing = (inventory || []).find(listingItem => String(listingItem.id) === String(item.listingId));
      const listingTags = (listing?.tags || []).map(normalizeTag);
      const itemQuantity = item.quantity || item.ticketQuantity || item.availableNow || 1;
      // Concern: if concern at listing level
      if (listingTags.includes('concern') || listingTags.includes('concerned')) {
        salesStatusBuckets.concern += itemQuantity;
      }
      // Filled Pending Shipment: anything that's not concern and not presale
      else if (!listingTags.includes('presale') && !listingTags.includes('presell') && !listingTags.includes('pre-sale')) {
        salesStatusBuckets.filledPendingShipment += itemQuantity;
      }
      // Unfilled: if presale (this should be rare for sales, but just in case)
      else {
        salesStatusBuckets.unfilled += itemQuantity;
      }
    });
  });

  // Calculate total differential
  const totalDifferential = allTicketTypes.reduce((sum, type) => {
    // Exclude CONCERN from total differential calculation
    if (type === 'CONCERN') return sum;
    
    const inv = adjustedInventoryCategories[type] || 0;
    const sales = unfilledSalesCategories[type] || 0; // Use unfilledSalesCategories
    return sum + (inv - sales);
  }, 0);
  let totalDiffDisplay = totalDifferential > 0 ? `+${totalDifferential}` : totalDifferential < 0 ? `${totalDifferential}` : '0';
  let totalDiffColor = totalDifferential > 0 ? 'text-green-700' : totalDifferential < 0 ? 'text-red-600' : 'text-gray-700';

  // Helper to get or set custom marketplace links in localStorage
  function getCustomMarketplaceLink(eventId, type) {
    try {
      const all = JSON.parse(localStorage.getItem('customMarketplaceLinks') || '{}');
      return all?.[eventId]?.[type] || '';
    } catch { return ''; }
  }
  function setCustomMarketplaceLinkLS(eventId, type, link) {
    let all = {};
    try { all = JSON.parse(localStorage.getItem('customMarketplaceLinks') || '{}'); } catch {}
    if (!all[eventId]) all[eventId] = {};
    all[eventId][type] = link;
    localStorage.setItem('customMarketplaceLinks', JSON.stringify(all));
  }

  // Helper to get/set per-listing marketplace links in localStorage
  function getCustomListingMarketplaceLink(listingId, type) {
    try {
      const all = JSON.parse(localStorage.getItem('customListingMarketplaceLinks') || '{}');
      return all?.[listingId]?.[type] || '';
    } catch { return ''; }
  }
  function setCustomListingMarketplaceLinkLS(listingId, type, link) {
    let all = {};
    try { all = JSON.parse(localStorage.getItem('customListingMarketplaceLinks') || '{}'); } catch {}
    if (!all[listingId]) all[listingId] = {};
    all[listingId][type] = link;
    localStorage.setItem('customListingMarketplaceLinks', JSON.stringify(all));
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <>
      <div className="flex items-center mb-6">
        <PieChart className="h-6 w-6 text-primary-600 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">Section Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[600px] grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Inventory Column */}
            <div>
              <div className="flex items-center mb-4">
                <Package className="h-5 w-5 text-blue-600 mr-2" />
                <h4 className="text-md font-semibold text-blue-900">Inventory ({inventoryTotal})</h4>
      </div>
              {allTicketTypes.map(type => {
                const count = adjustedInventoryCategories[type] || 0;
            const colorClass = getTicketTypeColor(type);
            return (
                  <div key={type} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-2">
                <div className="flex items-center">
                  <div className={`w-4 h-4 rounded-full ${colorClass} mr-3`}></div>
                  <div>
                        <h4 className="font-medium text-gray-900">{getTicketTypeDisplayName(type)}</h4>
                        <p className="text-sm text-gray-500">{count} ticket{count !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Sales Column */}
            <div>
              <div className="flex items-center mb-4">
                <DollarSign className="h-5 w-5 text-green-600 mr-2" />
                <h4 className="text-md font-semibold text-green-900 mb-4">Unfilled Sales ({salesStatusBuckets.unfilled})</h4>
                </div>
              {allTicketTypes.map(type => {
                const count = unfilledSalesCategories[type] || 0; // Use unfilledSalesCategories to exclude Filled Pending Shipment
                const colorClass = getTicketTypeColor(type);
                return (
                  <div key={type} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-2">
                <div className="flex items-center">
                      <div className={`w-4 h-4 rounded-full ${colorClass} mr-3`}></div>
                      <div>
                        <h4 className="font-medium text-gray-900">{getTicketTypeDisplayName(type)}</h4>
                        <p className="text-sm text-gray-500">{count} ticket{count !== 1 ? 's' : ''} sold</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Differential Column */}
            <div>
              <div className="flex items-center mb-4">
                <TrendingUp className="h-5 w-5 text-purple-600 mr-2" />
                <h4 className="text-md font-semibold text-purple-900">Differential</h4>
              </div>
              {allTicketTypes.map(type => {
                const inv = adjustedInventoryCategories[type] || 0;
                const sales = unfilledSalesCategories[type] || 0; // Use unfilledSalesCategories
                const diff = inv - sales;
                let diffDisplay = diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : '0';
                const colorClass = getDifferentialColor(diff);
                return (
                  <div key={type} className={`flex items-center justify-between p-4 rounded-lg mb-2 ${colorClass}`}>
                    <div className="flex items-center">
                      <div className={`w-4 h-4 rounded-full ${getTicketTypeColor(type)} mr-3`}></div>
                      <div>
                        <h4 className="font-medium text-gray-900">{getTicketTypeDisplayName(type)}</h4>
                        <p className={`text-sm font-semibold`}>{diffDisplay}</p>
                      </div>
                </div>
              </div>
            );
          })}
            </div>
          </div>
        </div>
        {/* Uncategorized Inventory Sections */}
        {adjustedUncategorizedSections && adjustedUncategorizedSections.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-5 w-5 text-orange-500 mr-2" />
              <h4 className="text-md font-semibold text-gray-900">Uncategorized Inventory Sections</h4>
              <span className="ml-2 text-sm text-gray-500">
                ({adjustedUncategorizedSections.length} section{adjustedUncategorizedSections.length !== 1 ? 's' : ''})
              </span>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="space-y-2">
                {adjustedUncategorizedSections.map((item, index) => (
                  <div key={index} className="flex flex-col md:flex-row md:justify-between md:items-center text-sm py-2">
                    <span className="font-medium text-orange-800 mb-2 md:mb-0">{item.section}</span>
                    <span className="text-orange-700 mb-2 md:mb-0">{item.quantity} ticket{item.quantity !== 1 ? 's' : ''}</span>
                    <select
                      className="ml-0 md:ml-4 px-2 py-1 border border-gray-300 rounded-md text-sm"
                      value={manualCategories[item.section] || ''}
                      onChange={e => handleManualCategorize(item.section, e.target.value)}
                    >
                      <option value="">Categorize as...</option>
                      {CATEGORY_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {/* Uncategorized Sales Sections */}
        {salesData.uncategorizedSections && salesData.uncategorizedSections.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-5 w-5 text-orange-500 mr-2" />
              <h4 className="text-md font-semibold text-gray-900">Uncategorized Sales Sections</h4>
              <span className="ml-2 text-sm text-gray-500">
                ({salesData.uncategorizedSections.length} section{salesData.uncategorizedSections.length !== 1 ? 's' : ''})
              </span>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="space-y-2">
                {salesData.uncategorizedSections.map((item, index) => (
                  <div key={index} className="flex flex-col md:flex-row md:justify-between md:items-center text-sm py-2">
                    <span className="font-medium text-orange-800 mb-2 md:mb-0">{item.section}</span>
                    <span className="text-orange-700 mb-2 md:mb-0">{item.quantity} ticket{item.quantity !== 1 ? 's' : ''} sold</span>
                    <select
                      className="ml-0 md:ml-4 px-2 py-1 border border-gray-300 rounded-md text-sm"
                      value={manualCategories[item.section] || ''}
                      onChange={e => handleManualCategorize(item.section, e.target.value)}
                    >
                      <option value="">Categorize as...</option>
                      {CATEGORY_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
        </div>
      )}
      {/* Summary Stats */}
      <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{inventoryTotal}</div>
            <div className="text-sm text-gray-500">Total Inventory</div>
          </div>
          <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{salesStatusBuckets.unfilled}</div>
              <div className="text-sm text-gray-500">Total Unfilled Sales</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${totalDiffColor}`}>{totalDiffDisplay}</div>
              <div className="text-sm text-gray-500">Total Differential</div>
            </div>
          </div>
        </div>

        {/* Status Breakdown Section */}
        <div className="mt-10">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Status Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Inventory Status */}
            <div>
              <h4 className="text-md font-semibold text-blue-900 mb-4">Inventory</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-blue-100"
                  onClick={() => { setShowIndividualListings(true); setListingStatusFilter('Concern'); setDataTypeFilter('inventory'); }}>
                  <span className="font-medium text-blue-900">Concern</span>
                  <span className="text-blue-700 font-bold">{statusBuckets.concern}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-blue-100"
                  onClick={() => { setShowIndividualListings(true); setListingStatusFilter('In Hand'); setDataTypeFilter('inventory'); }}>
                  <span className="font-medium text-blue-900">In Hand</span>
                  <span className="text-blue-700 font-bold">{statusBuckets.inHand}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-blue-100"
                  onClick={() => { setShowIndividualListings(true); setListingStatusFilter('TN Delivered'); setDataTypeFilter('inventory'); }}>
                  <span className="font-medium text-blue-900">TN Delivered</span>
                  <span className="text-blue-700 font-bold">{statusBuckets.tnDelivered}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-blue-100"
                  onClick={() => { setShowIndividualListings(true); setListingStatusFilter('En Route'); setDataTypeFilter('inventory'); }}>
                  <span className="font-medium text-blue-900">En Route</span>
                  <span className="text-blue-700 font-bold">{statusBuckets.enRoute}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100"
                  onClick={() => { setShowIndividualListings(true); setListingStatusFilter('Good Tickets'); setDataTypeFilter('inventory'); }}>
                  <span className="font-medium text-green-900">Good Tickets</span>
                  <span className="text-green-700 font-bold">{statusBuckets.goodTickets}</span>
                </div>
              </div>
            </div>
            {/* Sales Status */}
            <div>
              <h4 className="text-md font-semibold text-green-900 mb-4">Ticket Sales ({salesStatusBuckets.unfilled})</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-green-100"
                  onClick={() => { setShowIndividualListings(true); setListingStatusFilter('Concern'); setDataTypeFilter('sales'); }}>
                  <span className="font-medium">Concern</span>
                  <span className="text-green-700 font-bold">{salesStatusBuckets.concern}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg cursor-pointer hover:bg-green-100"
                  onClick={() => { setShowIndividualListings(true); setListingStatusFilter('Unfilled'); setDataTypeFilter('sales'); }}>
                  <span className="font-medium">Unfilled Ticket Sales</span>
                  <span className="text-yellow-700 font-bold">{salesStatusBuckets.unfilled}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100"
                  onClick={() => { setShowIndividualListings(true); setListingStatusFilter('Filled Pending Shipment'); setDataTypeFilter('sales'); }}>
                  <span className="font-medium">Filled Pending Shipment</span>
                  <span className="text-green-700 font-bold">{salesStatusBuckets.filledPendingShipment}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Individual Listings Section */}
        <div className="mt-10 mb-10">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-md font-bold text-gray-900 mb-4">Individual Listings</h3>
            {!showIndividualListings ? (
              <button
                className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700"
                onClick={() => setShowIndividualListings(true)}
              >
                Populate Individual Listings
              </button>
            ) : (
              <>
                {/* Filter Controls */}
                <div className="flex flex-col md:flex-row md:items-center md:space-x-4 mb-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mr-2">Data Type:</label>
                    <select
                      className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                      value={dataTypeFilter}
                      onChange={e => setDataTypeFilter(e.target.value)}
                    >
                      <option value="inventory">Inventory</option>
                      <option value="sales">Ticket Sales</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mr-2">Status:</label>
                    <select
                      className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                      value={listingStatusFilter}
                      onChange={e => setListingStatusFilter(e.target.value)}
                    >
                      <option value="ALL">All</option>
                      <option value="Concern">Concern</option>
                      {dataTypeFilter === 'inventory' ? (
                        <>
                          <option value="In Hand">In Hand</option>
                          <option value="TN Delivered">TN Delivered</option>
                          <option value="En Route">En Route</option>
                          <option value="Good Tickets">Good Tickets</option>
                        </>
                      ) : (
                        <>
                          <option value="Unfilled">Unfilled</option>
                          <option value="Filled Pending Shipment">Filled Pending Shipment</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div className="mt-2 md:mt-0">
                    <label className="text-sm font-medium text-gray-700 mr-2">Search Notes:</label>
                    <input
                      type="text"
                      className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                      placeholder="Search private notes..."
                      value={listingNoteSearch}
                      onChange={e => setListingNoteSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="overflow-x-auto mt-4">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        {/* Section | Quantity | Status | Private Note | Track */}
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Section</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Private Note</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Track</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                    {dataTypeFilter === 'inventory' ? (
                      // Inventory data
                      (inventory || [])
                        .map((item, idx) => {
                          // Only show active inventory
                          if (!item.availableNow || item.availableNow <= 0) return null;
                          // Exclude presale/pre-sale/presell
                          const tagsRaw = (item.tags || []);
                          const tags = tagsRaw.map(tag => tag.replace(/[-\s]/g, '').toLowerCase());
                          if (tags.some(t => t === 'presale' || t === 'presell')) return null;
                          // Determine status for this listing
                          const tagsForStatus = (item.tags || []).map(tag => tag.replace(/[-\s]/g, '').toLowerCase());
                          let status = 'Good Tickets';
                          if (tagsForStatus.includes('concern') || tagsForStatus.includes('concerned')) {
                            status = 'Concern';
                          } else if (tagsForStatus.includes('delivered')) {
                            status = 'In Hand';
                          } else if ((tagsForStatus.includes('tndelivered') || tagsForStatus.includes('tndelivered')) && !tagsForStatus.includes('delivered')) {
                            status = 'TN Delivered';
                          } else if ((tagsForStatus.includes('tngiven') || tagsForStatus.includes('tngiven')) && !tagsForStatus.includes('delivered') && !tagsForStatus.includes('tndelivered')) {
                            status = 'En Route';
                          }
                          // Always define privateNote before using it
                          const privateNote = item.notePrivate || item.privateNotes || item.privateNote || item.private_notes || item.notes || '';
                          // Filter by status
                          if (listingStatusFilter !== 'ALL') {
                            if (listingStatusFilter === 'Good Tickets') {
                              // Good Tickets should include In Hand, TN Delivered, En Route, and true Good Tickets
                              if (!(status === 'Good Tickets' || status === 'In Hand' || status === 'TN Delivered' || status === 'En Route')) return null;
                            } else if (status !== listingStatusFilter) {
                              return null;
                            }
                          }
                          // Filter by note search
                          if (listingNoteSearch && !privateNote.toLowerCase().includes(listingNoteSearch.toLowerCase())) return null;
                          return {
                            row: (
                              <tr key={idx}>
                                <td className="px-4 py-2 whitespace-nowrap">{item.section || '(No Section)'}</td>
                                <td className="px-4 py-2 whitespace-nowrap">{item.availableNow || 0}</td>
                                <td className="px-4 py-2 whitespace-nowrap">{status}</td>
                                <td className="px-4 py-2 whitespace-nowrap">
                                  {renderPrivateNote(privateNote)}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap">
                                  {(() => {
                                    const trackingNumber = extractTrackingNumber(privateNote);
                                    const trackingLink = getTrackingLink(trackingNumber);
                                    if (trackingNumber && trackingLink && !/sub/i.test(trackingNumber)) {
                                      return (
                                        <a href={trackingLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs font-semibold">
                                          <span role="img" aria-label="track">📬</span> Track
                                        </a>
                                      );
                                    }
                                    return null;
                                  })()}
                                </td>
                              </tr>
                            ),
                            idx
                          };
                        })
                        .filter(Boolean)
                        .map(obj => obj.row)
                    ) : (
                      // Sales data
                      (sales || [])
                        .flatMap(sale => {
                          const saleTags = (sale.tags || []).map(tag => tag.replace(/[-\s]/g, '').toLowerCase());
                          if (!Array.isArray(sale.items)) return [];
                          return sale.items.map((item, itemIdx) => {
                            // Find the matching listing in inventory
                            const listing = (inventory || []).find(listingItem => String(listingItem.id) === String(item.listingId));
                            const listingTags = (listing?.tags || []).map(tag => tag.replace(/[-\s]/g, '').toLowerCase());
                            // Use tags from listing for status
                            const allTags = listingTags;
                            const itemQuantity = item.quantity || item.ticketQuantity || item.availableNow || 1;
                            // Determine status for this sale item using listing tags
                            let status = 'Unfilled';
                            if (allTags.includes('concern') || allTags.includes('concerned')) {
                              status = 'Concern';
                            } else if (allTags.includes('presale') || allTags.includes('presell') || allTags.includes('pre-sale')) {
                              status = 'Unfilled';
                            } else {
                              status = 'Filled Pending Shipment';
                            }
                            // Use private note from listing
                            const privateNote = listing?.notePrivate || listing?.privateNotes || listing?.privateNote || listing?.private_notes || listing?.notes || '';
                            // Filter by status
                            if (listingStatusFilter !== 'ALL') {
                              if (status !== listingStatusFilter) {
                                return null;
                              }
                            }
                            // Filter by note search
                            if (listingNoteSearch && !privateNote.toLowerCase().includes(listingNoteSearch.toLowerCase())) return null;
                            return (
                              <tr key={`${sale.id || itemIdx}-${itemIdx}`}>
                                <td className="px-4 py-2 whitespace-nowrap">
                                  {item.section}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap">
                                  {itemQuantity}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap">
                                  {status}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap">
                                  {renderPrivateNote(privateNote)}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap">
                                  {(() => {
                                    const trackingNumber = extractTrackingNumber(privateNote);
                                    const trackingLink = getTrackingLink(trackingNumber);
                                    if (trackingNumber && trackingLink && !/sub/i.test(trackingNumber)) {
                                      return (
                                        <a href={trackingLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs font-semibold">
                                          <span role="img" aria-label="track">📬</span> Track
                                        </a>
                                      );
                                    }
                                    return null;
                                  })()}
                                </td>
                              </tr>
                            );
                          });
                        })
                        .filter(Boolean)
                    )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
        {/* Grey space before Listed For Sale */}
        <div className="bg-gray-50 py-8 w-full"></div>
        {/* Combined Listed For Sale and Sales Breakdown Section */}
        <ListedForSaleAndSalesBreakdown
          inventory={inventory}
          sales={sales}
          manualCategories={manualCategories}
          getCustomMarketplaceLink={getCustomMarketplaceLink}
          setCustomMarketplaceLinkLS={setCustomMarketplaceLinkLS}
          getCustomListingMarketplaceLink={getCustomListingMarketplaceLink}
          setCustomListingMarketplaceLinkLS={setCustomListingMarketplaceLinkLS}
        />
        {/* Listing-level Marketplace Modal */}
        {showListingMarketplaceModal && (() => {
          const marketName = showListingMarketplaceModal.type === 'stubhub' ? 'StubHub' : showListingMarketplaceModal.type === 'vivid' ? 'Vivid Seats' : 'SeatGeek';
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
              <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
                <h2 className="text-lg font-bold mb-2">Add {marketName} Link for This Listing</h2>
                <p className="mb-4">Paste the full {marketName} listing link below. This will be saved for this listing only.</p>
                <input
                  type="text"
                  className="border border-gray-300 rounded-md px-2 py-1 w-full mb-4"
                  placeholder={`Paste {marketName} listing link here...`}
                  value={customListingMarketplaceLink}
                  onChange={e => setCustomListingMarketplaceLink(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <button
                    className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                    onClick={() => setShowListingMarketplaceModal(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2 rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
                    disabled={!customListingMarketplaceLink.trim()}
                    onClick={() => {
                      setCustomListingMarketplaceLinkLS(showListingMarketplaceModal.listingId, showListingMarketplaceModal.type, customListingMarketplaceLink.trim());
                      setShowListingMarketplaceModal(null);
                    }}
                  >
                    Save Link
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </>
    </div>
  );
};

// Add a helper for local date string
function getLocalDateString(dateInput) {
  const d = new Date(dateInput);
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to categorize ticket type
function getTicketType(section) {
  if (!section) return 'Other';
  const s = section.toLowerCase();
  if (s.includes('shuttle')) return 'Shuttle';
  if (s.includes('vip')) return 'VIP';
  if (s.includes('ga plus') || s.includes('ga+') || s.includes('gaplus')) return 'GA+';
  if (s.includes('ga')) return 'GA';
  return section; // Use the section name as fallback for custom/other types
}

const TICKET_TYPES = ['GA', 'GA+', 'VIP', 'Shuttle', 'CONCERN'];
const TICKET_COLORS = {
  'GA': '#6366f1', // indigo
  'GA+': '#22c55e', // green
  'VIP': '#a21caf', // purple
  'Shuttle': '#0ea5e9', // blue
  'CONCERN': '#ef4444', // red
  'Other': '#64748b', // slate
};

function SalesBreakdownChart({ sales, manualCategories = {} }) {
  const [days, setDays] = React.useState(30);
  const [ticketTypeFilter, setTicketTypeFilter] = React.useState('All');
  const dayOptions = ["all", 30, 14, 7, 3, 1];
  const now = new Date();
  let startDate;
  if (days === "all") {
    let minDate = now;
    (sales || []).forEach(sale => {
      const saleDate = sale.date || sale.createdAt || sale.created_at || sale.soldAt || sale.sold_at;
      if (saleDate) {
        const d = new Date(saleDate);
        if (d < minDate) minDate = d;
      }
    });
    startDate = minDate;
  } else {
    startDate = new Date(now);
    startDate.setDate(now.getDate() - days + 1);
  }
  // Dynamically determine all ticket types from sales data
  const allTypesSet = new Set();
  (sales || []).forEach(sale => {
    if (!Array.isArray(sale.items)) return;
    sale.items.forEach(item => {
      const manualCat = manualCategories && manualCategories[item.section];
      const cat = manualCat || categorizeSection(item.section);
      allTypesSet.add(cat && cat !== 'uncategorized' ? cat : item.section);
    });
  });
  const ALL_TICKET_TYPES = Array.from(allTypesSet);
  
  // Build a map of date (YYYY-MM-DD) to ticket type to quantity sold and price data
  const salesByDayType = {};
  const priceByDayType = {}; // New: track price data by day
  let d = new Date(startDate);
  while (d <= now) {
    const key = getLocalDateString(d);
    salesByDayType[key] = {};
    priceByDayType[key] = {};
    ALL_TICKET_TYPES.forEach(type => { 
      salesByDayType[key][type] = 0; 
      priceByDayType[key][type] = { totalRevenue: 0, totalQuantity: 0, avgPrice: 0 };
    });
    d.setDate(d.getDate() + 1);
  }
  
  // Filter sales to selected period
  const filteredSales = (sales || []).filter(sale => {
    const saleDate = sale.date || sale.createdAt || sale.created_at || sale.soldAt || sale.sold_at;
    if (!saleDate) return false;
    const d = new Date(saleDate);
    return days === "all" ? d <= now : (d >= startDate && d <= now);
  });
  
  // Aggregate by ticket type and day, only including 'Filled Pending Shipment' and 'Unfilled' items
  filteredSales.forEach(sale => {
    if (!Array.isArray(sale.items)) return;
    const saleDate = sale.date || sale.createdAt || sale.created_at || sale.soldAt || sale.sold_at;
    if (!saleDate) return;
    const dateKey = getLocalDateString(saleDate);
    sale.items.forEach(item => {
      // Find the matching listing in inventory (if available)
      // We don't have inventory here, so replicate the status logic from Individual Listings
      const tags = (item.tags || []).map(tag => tag.replace(/[-\s]/g, '').toLowerCase());
      let status = 'Unfilled';
      if (tags.includes('concern') || tags.includes('concerned')) {
        status = 'Concern';
      } else if (tags.includes('delivered')) {
        status = 'Filled Pending Shipment - In Hand';
      } else if (tags.includes('tndelivered')) {
        status = 'Filled Pending Shipment - TN Delivered';
      } else if (tags.includes('tngiven')) {
        status = 'Filled Pending Shipment - En Route';
      }
      // Only include if status is Unfilled or Filled Pending Shipment
      if (
        status === 'Unfilled' ||
        status.startsWith('Filled Pending Shipment')
      ) {
        const qty = item.quantity || item.ticketQuantity || item.availableNow || 1;
        const price = item.pricePerTicket ?? item.price ?? item.listPrice ?? item.amount ?? 0;
        const manualCat = manualCategories && manualCategories[item.section];
        const cat = manualCat || categorizeSection(item.section);
        const type = cat && cat !== 'uncategorized' ? cat : item.section;
        if (ALL_TICKET_TYPES.includes(type) && dateKey in salesByDayType) {
          salesByDayType[dateKey][type] += qty;
          // Track price data
          priceByDayType[dateKey][type].totalRevenue += price * qty;
          priceByDayType[dateKey][type].totalQuantity += qty;
          priceByDayType[dateKey][type].avgPrice = priceByDayType[dateKey][type].totalQuantity > 0 
            ? priceByDayType[dateKey][type].totalRevenue / priceByDayType[dateKey][type].totalQuantity 
            : 0;
        }
      }
    });
  });
  
  // Prepare data for recharts, filter by ticket type if needed
  let chartData;
  if (ticketTypeFilter === 'All') {
    chartData = Object.entries(salesByDayType).map(([date, obj]) => {
      const priceData = priceByDayType[date];
      const result = { date, ...obj };
      // Add price data to chart data
      ALL_TICKET_TYPES.forEach(type => {
        result[`${type}_Price`] = priceData[type].avgPrice;
      });
      return result;
    });
  } else {
    chartData = Object.entries(salesByDayType).map(([date, obj]) => {
      const priceData = priceByDayType[date];
      return { 
        date, 
        [ticketTypeFilter]: obj[ticketTypeFilter],
        [`${ticketTypeFilter}_Price`]: priceData[ticketTypeFilter].avgPrice
      };
    });
  }
  
  // --- Avg Sale Price Per Ticket by type (for summary table) ---
  const avgSaleByType = {};
  const totalTicketsByType = {};
  const totalRevenueByType = {};
  ALL_TICKET_TYPES.forEach(type => { totalTicketsByType[type] = 0; totalRevenueByType[type] = 0; });
  filteredSales.forEach(sale => {
    if (!Array.isArray(sale.items)) return;
    sale.items.forEach(item => {
      // Use the same status logic as above
      const tags = (item.tags || []).map(tag => tag.replace(/[-\s]/g, '').toLowerCase());
      let status = 'Unfilled';
      if (tags.includes('concern') || tags.includes('concerned')) {
        status = 'Concern';
      } else if (tags.includes('presale') || tags.includes('presell') || tags.includes('pre-sale')) {
        status = 'Unfilled';
      } else {
        status = 'Filled Pending Shipment';
      }
      if (
        status === 'Unfilled' ||
        status === 'Filled Pending Shipment'
      ) {
        const qty = item.quantity || item.ticketQuantity || item.availableNow || 1;
        const price = item.pricePerTicket ?? item.price ?? item.listPrice ?? item.amount ?? 0;
        const manualCat = manualCategories && manualCategories[item.section];
        const cat = manualCat || categorizeSection(item.section);
        const type = cat && cat !== 'uncategorized' ? cat : item.section;
        if (ALL_TICKET_TYPES.includes(type)) {
          totalTicketsByType[type] += qty;
          totalRevenueByType[type] += price * qty;
        }
      }
    });
  });
  ALL_TICKET_TYPES.forEach(type => {
    avgSaleByType[type] = totalTicketsByType[type] > 0 ? (totalRevenueByType[type] / totalTicketsByType[type]) : 0;
  });
  
  // --- Breakdown by customerId and ticket type ---
  const customerMap = {
    '9': 'Ticketmaster',
    '42017899': 'Vivid Seats',
    '42017896': 'TickPick',
    '42017893': 'Ticket Network',
    '42017890': 'Ticket Evolution',
    '42017887': 'Stubhub',
    '18611401': 'Stubhub',
    '42017884': 'Seatgeek',
    '7145': 'Seatgeek',
    '42017881': 'GoTickets',
    '42017878': 'Gametime',
  };
  const customerBreakdown = {};
  filteredSales.forEach(sale => {
    if (!Array.isArray(sale.items)) return;
    const customerId = sale.customerId || sale.customer_id;
    if (!customerId || String(customerId).startsWith('VL')) return;
    const name = customerMap[String(customerId)] || customerId;
    if (!customerBreakdown[name]) {
      customerBreakdown[name] = {};
      ALL_TICKET_TYPES.forEach(type => { customerBreakdown[name][type] = 0; });
    }
    sale.items.forEach(item => {
      // Use the same status logic as above
      const tags = (item.tags || []).map(tag => tag.replace(/[-\s]/g, '').toLowerCase());
      let status = 'Unfilled';
      if (tags.includes('concern') || tags.includes('concerned')) {
        status = 'Concern';
      } else if (tags.includes('presale') || tags.includes('presell') || tags.includes('pre-sale')) {
        status = 'Unfilled';
      } else {
        status = 'Filled Pending Shipment';
      }
      if (
        status === 'Unfilled' ||
        status === 'Filled Pending Shipment'
      ) {
        const qty = item.quantity || item.ticketQuantity || item.availableNow || 1;
        const manualCat = manualCategories && manualCategories[item.section];
        const cat = manualCat || categorizeSection(item.section);
        const type = cat && cat !== 'uncategorized' ? cat : item.section;
        if (ALL_TICKET_TYPES.includes(type)) {
          customerBreakdown[name][type] += qty;
        }
      }
    });
  });
  
  // Filter summary tables by ticket type if needed
  const summaryTypes = ticketTypeFilter === 'All' ? ALL_TICKET_TYPES : [ticketTypeFilter];
  
  return (
    <div className="flex flex-col md:flex-row gap-8 mb-4 w-full items-start">
      {/* Chart on the left */}
      <div className="flex-1 min-w-0">
        <div className="flex gap-2 mb-2 items-center">
          <label className="text-sm font-medium text-gray-700 mr-2">Ticket Type:</label>
          <select
            className="border border-gray-300 rounded-md px-2 py-1 text-sm mr-4"
            value={ticketTypeFilter}
            onChange={e => setTicketTypeFilter(e.target.value)}
          >
            <option value="All">All</option>
            {ALL_TICKET_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          {dayOptions.map(val => (
            <button
              key={val}
              className={`px-3 py-1 rounded-md text-sm font-medium border ${days === val ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-primary-100'}`}
              onClick={() => setDays(val)}
            >
              {val === 'all' ? 'All Time' : `Last ${val} day${val > 1 ? 's' : ''}`}
            </button>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} name="Quantity" />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} name="Price ($)" />
            <Tooltip 
              formatter={(value, name) => {
                if (name.includes('_Price')) {
                  return [`$${value.toFixed(2)}`, name.replace('_Price', ' Avg Price')];
                }
                return [value, name];
              }}
            />
            <Legend />
            {(ticketTypeFilter === 'All' ? ALL_TICKET_TYPES : [ticketTypeFilter]).map(type => (
              <React.Fragment key={type}>
                {/* Quantity line */}
                <Line 
                  type="monotone" 
                  dataKey={type} 
                  name={`${type} Quantity`} 
                  stroke={TICKET_COLORS[type] || '#64748b'} 
                  strokeWidth={2} 
                  dot={{ r: 3 }} 
                />
                {/* Price line */}
                <Line 
                  type="monotone" 
                  dataKey={`${type}_Price`} 
                  name={`${type} Avg Price`} 
                  stroke="#22c55e" 
                  strokeWidth={2} 
                  strokeDasharray="5 5"
                  dot={{ r: 2 }} 
                  yAxisId="right"
                />
              </React.Fragment>
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {/* Summary on the right */}
      <div className="flex flex-col gap-6 min-w-[260px] md:w-[420px]">
        <div>
          <div className="text-lg font-semibold text-green-700 whitespace-nowrap mb-2">Avg Sale Price Per Ticket:</div>
          <table className="min-w-[220px] text-sm border border-gray-200 rounded">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-2 py-1 text-left font-medium">Type</th>
                <th className="px-2 py-1 text-right font-medium">Avg Price</th>
                <th className="px-2 py-1 text-right font-medium">Qty</th>
              </tr>
            </thead>
            <tbody>
              {summaryTypes.map(type => (
                <tr key={type}>
                  <td className="px-2 py-1">{type}</td>
                  <td className="px-2 py-1 text-right">{totalTicketsByType[type] > 0 ? `$${avgSaleByType[type].toFixed(2)}` : <span className="text-gray-400">N/A</span>}</td>
                  <td className="px-2 py-1 text-right">{totalTicketsByType[type]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <div className="text-lg font-semibold text-blue-700 mb-1 whitespace-nowrap">Tickets Sold by Marketplace</div>
          <table className="min-w-[220px] text-sm border border-gray-200 rounded">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-2 py-1 text-left font-medium">Marketplace</th>
                {summaryTypes.map(type => (
                  <th key={type} className="px-2 py-1 text-right font-medium">{type}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(customerBreakdown).length === 0 ? (
                <tr><td className="px-2 py-1 italic text-gray-400" colSpan={summaryTypes.length+1}>None</td></tr>
              ) : (
                Object.entries(customerBreakdown).map(([name, qtyObj]) => (
                  <tr key={name}>
                    <td className="px-2 py-1">{name}</td>
                    {summaryTypes.map(type => (
                      <td key={type} className="px-2 py-1 text-right">{qtyObj[type]}</td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export { SalesBreakdownChart };
export default SectionBreakdown; 