import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { apiService } from '../api';
import { categorizeSection } from '../utils/sectionCategorizer';

const PurchaseBreakdown = ({ eventId, manualCategories = {} }) => {
  const [purchaseData, setPurchaseData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [days, setDays] = useState(30);
  const [ticketTypeFilter, setTicketTypeFilter] = useState('All');

  const dayOptions = ["all", 30, 14, 7, 3, 1];

  // Don't render if no eventId
  if (!eventId) {
    return null;
  }

  // Fetch purchase data when eventId changes
  useEffect(() => {
    const fetchPurchaseData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Use our API service to proxy the request through our backend
        const data = await apiService.getExternalListings(eventId);
        
        if (data.resultStatus) {
          // Filter for purchases: items with "Double" tag but no "Pre-sale" tag (case insensitive)
          const purchases = data.resultData.filter(item => {
            const tags = (item.tags || []).map(tag => tag.toLowerCase());
            const hasDouble = tags.includes('double');
            const hasPresale = tags.some(tag => 
              tag.includes('pre-sale') || tag.includes('presale') || tag.includes('presell')
            );
            return hasDouble && !hasPresale;
          });
          
          setPurchaseData(purchases);
        } else {
          throw new Error(data.resultMessage || 'Failed to fetch purchase data');
        }
      } catch (err) {
        console.error('Error fetching purchase data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPurchaseData();
  }, [eventId]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center text-gray-500 py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading purchase data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center text-red-500 py-8">
          <p>Error loading purchase data: {error}</p>
        </div>
      </div>
    );
  }

  if (!purchaseData || purchaseData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center text-gray-500 py-8">
          <p>No purchase data available for this event</p>
        </div>
      </div>
    );
  }

  // Process purchase data for chart
  const now = new Date();
  let startDate;
  if (days === "all") {
    let minDate = now;
    purchaseData.forEach(purchase => {
      const purchaseDate = purchase.lastModified || purchase.createdAt;
      if (purchaseDate) {
        const d = new Date(purchaseDate);
        if (d < minDate) minDate = d;
      }
    });
    startDate = minDate;
  } else {
    startDate = new Date(now);
    startDate.setDate(now.getDate() - days + 1);
  }

  // Get all ticket types from purchase data
  const allTypesSet = new Set();
  purchaseData.forEach(purchase => {
    const manualCat = manualCategories && manualCategories[purchase.section];
    const cat = manualCat || categorizeSection(purchase.section);
    allTypesSet.add(cat && cat !== 'uncategorized' ? cat : purchase.section);
  });
  const ALL_TICKET_TYPES = Array.from(allTypesSet);

  // Build data for chart
  const purchasesByDayType = {};
  const costByDayType = {};
  let d = new Date(startDate);
  while (d <= now) {
    const key = getLocalDateString(d);
    purchasesByDayType[key] = {};
    costByDayType[key] = {};
    ALL_TICKET_TYPES.forEach(type => { 
      purchasesByDayType[key][type] = 0; 
      costByDayType[key][type] = { totalCost: 0, totalQuantity: 0, avgCost: 0 };
    });
    d.setDate(d.getDate() + 1);
  }

  // Filter purchases to selected period and aggregate by day and type
  const filteredPurchases = purchaseData.filter(purchase => {
    const purchaseDate = purchase.lastModified || purchase.createdAt;
    if (!purchaseDate) return false;
    const d = new Date(purchaseDate);
    return days === "all" ? d <= now : (d >= startDate && d <= now);
  });

  filteredPurchases.forEach(purchase => {
    const purchaseDate = purchase.lastModified || purchase.createdAt;
    if (!purchaseDate) return;
    
    const dateKey = getLocalDateString(new Date(purchaseDate));
    const qty = purchase.availableNow || 1;
    const cost = purchase.costPrice || 0;
    const manualCat = manualCategories && manualCategories[purchase.section];
    const cat = manualCat || categorizeSection(purchase.section);
    const type = cat && cat !== 'uncategorized' ? cat : purchase.section;
    
    if (ALL_TICKET_TYPES.includes(type) && dateKey in purchasesByDayType) {
      purchasesByDayType[dateKey][type] += qty;
      costByDayType[dateKey][type].totalCost += cost * qty;
      costByDayType[dateKey][type].totalQuantity += qty;
      costByDayType[dateKey][type].avgCost = costByDayType[dateKey][type].totalQuantity > 0 
        ? costByDayType[dateKey][type].totalCost / costByDayType[dateKey][type].totalQuantity 
        : 0;
    }
  });

  // Prepare chart data
  let chartData;
  if (ticketTypeFilter === 'All') {
    chartData = Object.entries(purchasesByDayType).map(([date, obj]) => {
      const costData = costByDayType[date];
      const result = { date, ...obj };
      ALL_TICKET_TYPES.forEach(type => {
        result[`${type}_Cost`] = costData[type].avgCost;
      });
      return result;
    });
  } else {
    chartData = Object.entries(purchasesByDayType).map(([date, obj]) => {
      const costData = costByDayType[date];
      return { 
        date, 
        [ticketTypeFilter]: obj[ticketTypeFilter],
        [`${ticketTypeFilter}_Cost`]: costData[ticketTypeFilter].avgCost
      };
    });
  }

  // Calculate average cost by type for summary table
  const avgCostByType = {};
  const totalTicketsByType = {};
  const totalCostByType = {};
  ALL_TICKET_TYPES.forEach(type => { 
    totalTicketsByType[type] = 0; 
    totalCostByType[type] = 0; 
  });

  filteredPurchases.forEach(purchase => {
    const qty = purchase.availableNow || 1;
    const cost = purchase.costPrice || 0;
    const manualCat = manualCategories && manualCategories[purchase.section];
    const cat = manualCat || categorizeSection(purchase.section);
    const type = cat && cat !== 'uncategorized' ? cat : purchase.section;
    
    if (ALL_TICKET_TYPES.includes(type)) {
      totalTicketsByType[type] += qty;
      totalCostByType[type] += cost * qty;
    }
  });

  ALL_TICKET_TYPES.forEach(type => {
    avgCostByType[type] = totalTicketsByType[type] > 0 ? (totalCostByType[type] / totalTicketsByType[type]) : 0;
  });

  // Filter summary types
  const summaryTypes = ticketTypeFilter === 'All' ? ALL_TICKET_TYPES : [ticketTypeFilter];

  // Ticket type colors
  const TICKET_COLORS = {
    'GA': '#6366f1',
    'GA_PLUS': '#22c55e',
    'VIP': '#a21caf',
    'SHUTTLE': '#0ea5e9',
    'CONCERN': '#ef4444',
    'Other': '#64748b',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-md font-bold text-gray-900 mb-4">Purchase Breakdown</h3>
      
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
                className={`px-3 py-1 rounded-md text-sm font-medium border ${days === val ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-blue-100'}`}
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
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} name="Cost ($)" />
              <Tooltip 
                formatter={(value, name) => {
                  if (name.includes('_Cost')) {
                    return [`$${value.toFixed(2)}`, name.replace('_Cost', ' Avg Cost')];
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
                  {/* Cost line */}
                  <Line 
                    type="monotone" 
                    dataKey={`${type}_Cost`} 
                    name={`${type} Avg Cost`} 
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
            <div className="text-lg font-semibold text-blue-700 whitespace-nowrap mb-2">Avg Cost Per Ticket:</div>
            <table className="min-w-[220px] text-sm border border-gray-200 rounded">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-2 py-1 text-left font-medium">Type</th>
                  <th className="px-2 py-1 text-right font-medium">Avg Cost</th>
                  <th className="px-2 py-1 text-right font-medium">Qty</th>
                </tr>
              </thead>
              <tbody>
                {summaryTypes.map(type => (
                  <tr key={type}>
                    <td className="px-2 py-1">{type}</td>
                    <td className="px-2 py-1 text-right">
                      {totalTicketsByType[type] > 0 ? `$${avgCostByType[type].toFixed(2)}` : <span className="text-gray-400">N/A</span>}
                    </td>
                    <td className="px-2 py-1 text-right">{totalTicketsByType[type]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function for local date string
function getLocalDateString(dateInput) {
  const d = new Date(dateInput);
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default PurchaseBreakdown; 