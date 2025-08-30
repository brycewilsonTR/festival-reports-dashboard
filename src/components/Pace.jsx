import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { apiService } from '../api';
import { categorizeSection } from '../utils/sectionCategorizer';

const Pace = ({ eventId, sales, manualCategories = {} }) => {
  const [purchaseData, setPurchaseData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Time periods to analyze
  const timePeriods = [1, 3, 7, 30];

  // Fetch purchase data when eventId changes
  useEffect(() => {
    if (!eventId) return;

    const fetchPurchaseData = async () => {
      setLoading(true);
      setError(null);

      try {
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
          <p>Loading pace data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center text-red-500 py-8">
          <p>Error loading pace data: {error}</p>
        </div>
      </div>
    );
  }

  if (!eventId) {
    return null;
  }

  // Get all ticket types from both sales and purchases
  const allTypesSet = new Set();
  
  // Add types from sales
  if (sales && sales.length > 0) {
    sales.forEach(sale => {
      if (!Array.isArray(sale.items)) return;
      sale.items.forEach(item => {
        const manualCat = manualCategories && manualCategories[item.section];
        const cat = manualCat || categorizeSection(item.section);
        const type = cat && cat !== 'uncategorized' ? cat : item.section;
        allTypesSet.add(type);
      });
    });
  }

  // Add types from purchases
  purchaseData.forEach(purchase => {
    const manualCat = manualCategories && manualCategories[purchase.section];
    const cat = manualCat || categorizeSection(purchase.section);
    const type = cat && cat !== 'uncategorized' ? cat : purchase.section;
    allTypesSet.add(type);
  });

  const ALL_TICKET_TYPES = Array.from(allTypesSet);

  // Calculate pace for each time period and ticket type
  const calculatePace = (days) => {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - days + 1);

    const paceData = {};

    ALL_TICKET_TYPES.forEach(type => {
      let salesCount = 0;
      let purchasesCount = 0;

      // Count sales in the time period
      if (sales && sales.length > 0) {
        sales.forEach(sale => {
          const saleDate = sale.date || sale.createdAt || sale.created_at || sale.soldAt || sale.sold_at;
          if (!saleDate) return;
          
          const saleDateObj = new Date(saleDate);
          if (saleDateObj >= startDate && saleDateObj <= now) {
            if (!Array.isArray(sale.items)) return;
            
            sale.items.forEach(item => {
              const manualCat = manualCategories && manualCategories[item.section];
              const cat = manualCat || categorizeSection(item.section);
              const itemType = cat && cat !== 'uncategorized' ? cat : item.section;
              
                             if (itemType === type) {
                 // Use the same sales counting logic as Sales Breakdown
                 // Count both Unfilled (presale) and Filled Pending Shipment sales
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
                 
                 // Only include if status is Unfilled or Filled Pending Shipment (same as Sales Breakdown)
                 if (
                   status === 'Unfilled' ||
                   status.startsWith('Filled Pending Shipment')
                 ) {
                   const qty = item.quantity || item.ticketQuantity || item.availableNow || 1;
                   salesCount += qty;
                 }
               }
            });
          }
        });
      }

      // Count purchases in the time period
      purchaseData.forEach(purchase => {
        const purchaseDate = purchase.lastModified || purchase.createdAt;
        if (!purchaseDate) return;
        
        const purchaseDateObj = new Date(purchaseDate);
        if (purchaseDateObj >= startDate && purchaseDateObj <= now) {
          const manualCat = manualCategories && manualCategories[purchase.section];
          const cat = manualCat || categorizeSection(purchase.section);
          const purchaseType = cat && cat !== 'uncategorized' ? cat : purchase.section;
          
          if (purchaseType === type) {
            const qty = purchase.availableNow || 1;
            purchasesCount += qty;
          }
        }
      });

      // Calculate pace (purchases - sales)
      const pace = purchasesCount - salesCount;
      paceData[type] = {
        sales: salesCount,
        purchases: purchasesCount,
        pace: pace
      };
    });

    return paceData;
  };

  // Get pace data for all time periods
  const paceData = {};
  timePeriods.forEach(days => {
    paceData[days] = calculatePace(days);
  });

  // Helper function to get pace color and icon
  const getPaceDisplay = (pace) => {
    if (pace > 0) {
      return {
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        icon: <TrendingUp className="h-4 w-4 text-green-600" />,
        text: `+${pace}`
      };
    } else if (pace < 0) {
      return {
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        icon: <TrendingDown className="h-4 w-4 text-red-600" />,
        text: `${pace}`
      };
    } else {
      return {
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        icon: <Minus className="h-4 w-4 text-gray-600" />,
        text: '0'
      };
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-md font-bold text-gray-900 mb-4">Pace</h3>
      <p className="text-sm text-gray-600 mb-6">
        Net inventory flow: Purchases minus Sales. Positive values indicate net inventory gain, negative values indicate net inventory loss.
      </p>

      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-200 rounded-lg">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                Ticket Type
              </th>
              {timePeriods.map(days => (
                <th key={days} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  Last {days} Day{days > 1 ? 's' : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {ALL_TICKET_TYPES.map(type => (
              <tr key={type} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-200">
                  {type}
                </td>
                {timePeriods.map(days => {
                  const data = paceData[days][type];
                  const paceDisplay = getPaceDisplay(data.pace);
                  
                  return (
                    <td key={days} className="px-4 py-3 text-center border-r border-gray-200">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${paceDisplay.bgColor} ${paceDisplay.borderColor} border`}>
                        {paceDisplay.icon}
                        <span className={`ml-1 ${paceDisplay.color}`}>
                          {paceDisplay.text}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        <div>Sales: {data.sales}</div>
                        <div>Purchases: {data.purchases}</div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Summary by Time Period</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {timePeriods.map(days => {
            let totalPace = 0;
            let totalSales = 0;
            let totalPurchases = 0;

            ALL_TICKET_TYPES.forEach(type => {
              const data = paceData[days][type];
              totalPace += data.pace;
              totalSales += data.sales;
              totalPurchases += data.purchases;
            });

            const totalPaceDisplay = getPaceDisplay(totalPace);

            return (
              <div key={days} className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-lg font-bold text-gray-900">Last {days} Day{days > 1 ? 's' : ''}</div>
                <div className={`text-2xl font-bold ${totalPaceDisplay.color} flex items-center justify-center mt-1`}>
                  {totalPaceDisplay.icon}
                  <span className="ml-1">{totalPaceDisplay.text}</span>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  <div>Sales: {totalSales}</div>
                  <div>Purchases: {totalPurchases}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Pace; 