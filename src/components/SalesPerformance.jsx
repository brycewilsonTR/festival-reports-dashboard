import React, { useState, useEffect } from 'react';
import { TrendingUp, Calendar, Filter, DollarSign, Percent, Package, Tag, X, Eye } from 'lucide-react';
import { apiService } from '../api';
import { excludedSalesService } from '../services/excludedSalesService';

const SalesPerformance = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filteredSales, setFilteredSales] = useState([]);
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [excludeZeroCost, setExcludeZeroCost] = useState(true);
  
  // Tag filtering state
  const [availableTags, setAvailableTags] = useState([]);
  const [includeTagInput, setIncludeTagInput] = useState('');
  const [excludeTagInput, setExcludeTagInput] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [excludeTags, setExcludeTags] = useState([]);
  const [listingsData, setListingsData] = useState({});
  const [excludedSales, setExcludedSales] = useState(new Set());
  const [loadingExcluded, setLoadingExcluded] = useState(false);
  
  // Daily review checkboxes state
  const [reviewStrategyEvents, setReviewStrategyEvents] = useState(false);
  const [reviewUnverifiedListings, setReviewUnverifiedListings] = useState(false);
  const [reviewFloorCeilingListings, setReviewFloorCeilingListings] = useState(false);
  const [reviewPreviousSales, setReviewPreviousSales] = useState(false);

  // Set default date range to today and tomorrow
  useEffect(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    setDateFrom(todayStr);
    setDateTo(tomorrowStr);
  }, []);

  // Load sales data when date filters change
  useEffect(() => {
    if (dateFrom) {
      loadSalesData();
    }
  }, [dateFrom, dateTo]);

  // Load listings data to get tags
  useEffect(() => {
    if (sales.length > 0) {
      loadListingsData();
    }
  }, [sales]);

  // Load excluded sales
  useEffect(() => {
    loadExcludedSales();
  }, []);

  const loadExcludedSales = async () => {
    try {
      setLoadingExcluded(true);
      const response = await excludedSalesService.getExcludedSales();
      const excludedSet = new Set();
      response.forEach(excluded => {
        excludedSet.add(`${excluded.saleId}-${excluded.itemIndex}`);
      });
      setExcludedSales(excludedSet);
    } catch (error) {
      console.error('Error loading excluded sales:', error);
    } finally {
      setLoadingExcluded(false);
    }
  };

  const loadListingsData = async () => {
    try {
      // Extract unique event IDs from sales data
      const eventIds = [...new Set(sales.map(sale => sale.eventId).filter(Boolean))];
      
      if (eventIds.length === 0) return;

      console.log('Fetching listings data for events:', eventIds);
      
      // Fetch listings for all events to get tags
      const listingsResponse = await apiService.get('/v1/listings', { 
        params: { eventIds: eventIds.join(',') } 
      });
      
      const fetchedListingsData = listingsResponse.resultData || [];
      
      // Create a map of listing ID to tags
      const listingsTagMap = {};
      const allTagsSet = new Set();
      
      fetchedListingsData.forEach(listingRecord => {
        if (listingRecord.id && listingRecord.tags) {
          listingsTagMap[listingRecord.id] = listingRecord.tags;
          listingRecord.tags.forEach(tagValue => allTagsSet.add(tagValue));
        }
      });
      
      setListingsData(listingsTagMap);
      setAvailableTags(Array.from(allTagsSet).sort());
      
      console.log('Loaded listings data with tags:', Object.keys(listingsTagMap).length, 'listings');
      console.log('Available tags:', Array.from(allTagsSet));
    } catch (err) {
      console.error('Error loading listings data:', err);
      // Don't set error state for listings - it's not critical for sales display
    }
  };

  const loadSalesData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching sales data with date range:', dateFrom, 'to', dateTo);
      
      const response = await apiService.getSalesPerformance(dateFrom, dateTo);
      const salesData = response.resultData || [];
      
      console.log('Sales data fetched:', salesData.length, 'orders');
      if (salesData.length > 0) {
        console.log('Sample sale data:', salesData[0]);
        console.log('Sample sale createdAt:', salesData[0].createdAt);
      }
      
      // Apply $0 unit cost filter if enabled
      let filteredData = salesData;
      if (excludeZeroCost) {
        // Filter out individual items with $0 cost, not entire sales
        filteredData = salesData.map(sale => {
          if (!sale.items || !Array.isArray(sale.items)) return sale;
          
          // Filter out items with $0 cost
          const filteredItems = sale.items.filter(item => (item.costPerTicket || 0) > 0);
          
          // Return sale with filtered items, or null if no items remain
          if (filteredItems.length === 0) {
            return null; // This sale will be filtered out
          }
          
          return {
            ...sale,
            items: filteredItems
          };
        }).filter(Boolean); // Remove null entries
        
        console.log('Sales data after excluding $0 unit cost items:', filteredData.length, 'orders');
      }
      
      setSales(salesData);
      setFilteredSales(filteredData);
    } catch (err) {
      setError(err.message);
      console.error('Error loading sales data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Apply tag filters to sales data
  const applyTagFilters = (salesToFilter) => {
    if (selectedTags.length === 0 && excludeTags.length === 0) {
      return salesToFilter;
    }

    return salesToFilter.filter(sale => {
      if (!sale.items || !Array.isArray(sale.items)) return false;
      
      // First, check if any item has excluded tags - if so, exclude the entire sale
      if (excludeTags.length > 0) {
        const hasExcludedTag = sale.items.some(item => {
          const itemTags = getItemTags(item);
          return excludeTags.some(tagValue => 
            itemTags.some(itemTag => 
              itemTag.toLowerCase().includes(tagValue.toLowerCase())
            )
          );
        });
        
        if (hasExcludedTag) {
          return false;
        }
      }
      
      // Then check if any item matches the include criteria
      if (selectedTags.length > 0) {
        const hasIncludedTag = sale.items.some(item => {
          const itemTags = getItemTags(item);
          return selectedTags.some(tagValue => 
            itemTags.some(itemTag => 
              itemTag.toLowerCase().includes(tagValue.toLowerCase())
            )
          );
        });
        
        if (!hasIncludedTag) {
          return false;
        }
      }
      
      return true;
    });
  };

  // Get tags for a specific item
  const getItemTags = (item) => {
    // Try to get tags from the item itself first
    if (item.tags && Array.isArray(item.tags)) {
      return item.tags;
    }
    
    // Fallback to listings data if available
    if (item.listingId && listingsData[item.listingId]) {
      return listingsData[item.listingId];
    }
    
    // Try to match by section/row if no direct listing ID
    if (item.section && item.row) {
      // Find matching listing by section and row
      for (const [listingId, listingTags] of Object.entries(listingsData)) {
        // This is a simplified matching - you might want to improve this logic
        if (listingTags && Array.isArray(listingTags)) {
          return listingTags;
        }
      }
    }
    
    return [];
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortedSales = (salesToSort) => {
    return [...salesToSort].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortField) {
        case 'createdAt':
          aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          break;
        case 'eventName':
          aValue = (a.eventName || '').toLowerCase();
          bValue = (b.eventName || '').toLowerCase();
          break;
        case 'eventDate':
          aValue = a.eventDate ? new Date(a.eventDate).getTime() : 0;
          bValue = b.eventDate ? new Date(b.eventDate).getTime() : 0;
          break;
        case 'profit':
          aValue = calculateTotalProfit(a);
          bValue = calculateTotalProfit(b);
          break;
        case 'profitMargin':
          aValue = calculateProfitMargin(a);
          bValue = calculateProfitMargin(b);
          break;
        default:
          return 0;
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  };

  const calculateTotalProfit = (sale) => {
    if (!sale.items || !Array.isArray(sale.items)) return 0;
    
    return sale.items.reduce((total, item) => {
      const profitPerTicket = (item.pricePerTicket || 0) - (item.costPerTicket || 0);
      return total + (profitPerTicket * (item.quantity || 0));
    }, 0);
  };

  const calculateProfitMargin = (sale) => {
    if (!sale.items || !Array.isArray(sale.items)) return 0;
    
    const totalRevenue = sale.items.reduce((total, item) => {
      return total + ((item.pricePerTicket || 0) * (item.quantity || 0));
    }, 0);
    
    const totalProfit = calculateTotalProfit(sale);
    
    if (totalRevenue === 0) return 0;
    return (totalProfit / totalRevenue) * 100;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      
      // Format as MM/DD/YYYY
      return date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercent = (percent) => {
    if (percent === null || percent === undefined) return '0.00%';
    return `${percent.toFixed(2)}%`;
  };

  const getSortIndicator = (field) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? ' ↑' : ' ↓';
  };

  const SortableHeader = ({ field, children }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-gray-700 transition-colors"
    >
      {children}
      <span className="text-xs text-gray-400">
        {getSortIndicator(field)}
      </span>
    </button>
  );
  const isSaleExcluded = (saleId, itemIndex) => {
    return excludedSales.has(`${saleId}-${itemIndex}`);
  };

  // Apply all filters and get final sales data
  const getFinalFilteredSales = () => {
    let filtered = filteredSales;
    
    // Apply tag filters
    filtered = applyTagFilters(filtered);
    
    // Apply excluded sales filter
    filtered = filtered.map(sale => {
      if (!sale.items || !Array.isArray(sale.items)) return sale;
      
      const filteredItems = sale.items.filter((item, itemIndex) => {
        return !isSaleExcluded(sale.id, itemIndex);
      });
      
      if (filteredItems.length === 0) {
        return null; // This sale will be filtered out
      }
      
      return {
        ...sale,
        items: filteredItems
      };
    }).filter(Boolean); // Remove null entries
    
    return filtered;
  };

  const finalFilteredSales = getFinalFilteredSales();
  const sortedSales = getSortedSales(finalFilteredSales);

  // Calculate summary statistics based on FILTERED data
  const totalRevenue = sortedSales.reduce((total, sale) => {
    if (!sale.items || !Array.isArray(sale.items)) return total;
    return total + sale.items.reduce((sum, item) => {
      return sum + ((item.pricePerTicket || 0) * (item.quantity || 0));
    }, 0);
  }, 0);

  const totalProfit = sortedSales.reduce((total, sale) => {
    return total + calculateTotalProfit(sale);
  }, 0);

  const totalProfitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  const handleIncludeTagAdd = () => {
    const tag = includeTagInput.trim();
    if (tag && !selectedTags.includes(tag)) {
      setSelectedTags(prev => [...prev, tag]);
      setIncludeTagInput('');
    }
  };

  const handleExcludeTagAdd = () => {
    const tag = excludeTagInput.trim();
    if (tag && !excludeTags.includes(tag)) {
      setExcludeTags(prev => [...prev, tag]);
      setExcludeTagInput('');
    }
  };

  const handleTagRemove = (tag, isInclude) => {
    if (isInclude) {
      setSelectedTags(prev => prev.filter(t => t !== tag));
    } else {
      setExcludeTags(prev => prev.filter(t => t !== tag));
    }
  };

  const clearAllTagFilters = () => {
    setSelectedTags([]);
    setExcludeTags([]);
  };

  const handleKeyPress = (e, isInclude) => {
    if (e.key === 'Enter') {
      if (isInclude) {
        handleIncludeTagAdd();
      } else {
        handleExcludeTagAdd();
      }
    }
  };

  const handleExcludeSale = async (saleId, itemIndex) => {
    try {
      await excludedSalesService.excludeSale(saleId, itemIndex);
      setExcludedSales(prev => new Set([...prev, `${saleId}-${itemIndex}`]));
    } catch (error) {
      console.error('Error excluding sale:', error);
    }
  };

  const handleIncludeSale = async (saleId, itemIndex) => {
    try {
      await excludedSalesService.includeSale(saleId, itemIndex);
      setExcludedSales(prev => {
        const newSet = new Set(prev);
        newSet.delete(`${saleId}-${itemIndex}`);
        return newSet;
      });
    } catch (error) {
      console.error('Error including sale:', error);
    }
  };


  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading sales data: {error}</p>
        <button 
          onClick={loadSalesData}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Sales Performance</h2>
          <p className="text-gray-600">
            {sortedSales.length} sales orders • {formatCurrency(totalRevenue)} total revenue
          </p>
        </div>
      
      {/* Daily Review Checklist */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Daily Review Checklist (Complete Twice Daily)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={reviewStrategyEvents}
              onChange={(e) => setReviewStrategyEvents(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <span className="text-sm text-gray-700">Review strategy for events within 3 days</span>
          </label>
          
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={reviewUnverifiedListings}
              onChange={(e) => setReviewUnverifiedListings(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <span className="text-sm text-gray-700">Review any unverified listings for strategy and mapping</span>
          </label>
          
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={reviewFloorCeilingListings}
              onChange={(e) => setReviewFloorCeilingListings(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <span className="text-sm text-gray-700">Review Floor, Ceiling and other problem listings in Broker Nerds</span>
          </label>
          
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={reviewPreviousSales}
              onChange={(e) => setReviewPreviousSales(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <span className="text-sm text-gray-700">Review previous days sales performance</span>
          </label>
        </div>
      </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
              <p className="text-xs text-gray-500 mt-1">
                {selectedTags.length > 0 || excludeTags.length > 0 ? 'Filtered' : 'All Sales'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Profit</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalProfit)}</p>
              <p className="text-xs text-gray-500 mt-1">
                {selectedTags.length > 0 || excludeTags.length > 0 ? 'Filtered' : 'All Sales'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Percent className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Profit Margin</p>
              <p className="text-2xl font-bold text-gray-900">{formatPercent(totalProfitMargin)}</p>
              <p className="text-xs text-gray-500 mt-1">
                {selectedTags.length > 0 || excludeTags.length > 0 ? 'Filtered' : 'All Sales'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Date Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Date Range:</span>
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={loadSalesData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Apply Filter
          </button>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="excludeZeroCost"
              checked={excludeZeroCost}
              onChange={(e) => setExcludeZeroCost(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <label htmlFor="excludeZeroCost" className="text-sm font-medium text-gray-700">
              Exclude $0
            </label>
          </div>
        </div>
        
        <div className="mt-3 text-sm text-gray-600">
          <p>💡 <strong>Note:</strong> Date filtering is now applied on the server side to ensure accurate results.</p>
          {dateFrom && dateTo ? (
            <p className="mt-1 text-blue-600">📅 <strong>Filter Active:</strong> Showing sales from {dateFrom} to {dateTo}</p>
          ) : (
            <p className="mt-1 text-green-600">📊 <strong>No Filter:</strong> Showing all available sales data</p>
          )}
          {excludeZeroCost && (
            <p className="mt-1 text-orange-600">🚫 <strong>Excluding:</strong> Sales with $0 unit cost</p>
          )}
        </div>
      </div>

      {/* Tag Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Tag className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-medium text-gray-900">Tag Filtering</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Include Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Include Tags (must have at least one)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={includeTagInput}
                onChange={(e) => setIncludeTagInput(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, true)}
                placeholder="Type tag name and press Enter"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleIncludeTagAdd}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          {/* Exclude Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Exclude Tags (must not have any)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={excludeTagInput}
                onChange={(e) => setExcludeTagInput(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, false)}
                placeholder="Type tag name and press Enter"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              <button
                onClick={handleExcludeTagAdd}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Active Filters Display */}
        {(selectedTags.length > 0 || excludeTags.length > 0) && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-gray-700">Active Filters:</span>
              <button
                onClick={clearAllTagFilters}
                className="text-xs text-red-600 hover:text-red-800 underline"
              >
                Clear All
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {selectedTags.map(tagValue => (
                <span
                  key={`active-include-${tag}`}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                >
                  +{tagValue}
                  <button
                    onClick={() => handleTagRemove(tagValue, true)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
              
              {excludeTags.map(tagValue => (
                <span
                  key={`active-exclude-${tag}`}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full"
                >
                  -{tagValue}
                  <button
                    onClick={() => handleTagRemove(tagValue, false)}
                    className="text-red-600 hover:text-red-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Filter Summary */}
        <div className="mt-3 text-sm text-gray-600">
          {selectedTags.length > 0 && (
            <p className="text-blue-600">✅ <strong>Including:</strong> Sales with tags: {selectedTags.join(', ')}</p>
          )}
          {excludeTags.length > 0 && (
            <p className="text-red-600">❌ <strong>Excluding:</strong> Sales with tags: {excludeTags.join(', ')}</p>
          )}
          {selectedTags.length === 0 && excludeTags.length === 0 && (
            <p className="text-green-600">📊 <strong>No Tag Filters:</strong> Showing all sales regardless of tags</p>
          )}
          <p className="mt-1 text-gray-500">
            📈 <strong>Results:</strong> {finalFilteredSales.length} of {filteredSales.length} sales match current filters
          </p>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <SortableHeader field="createdAt">Order Date</SortableHeader>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <SortableHeader field="eventName">Event</SortableHeader>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <SortableHeader field="eventDate">Event Date</SortableHeader>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Venue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Section
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Row
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tags
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit Sale
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Sale Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <SortableHeader field="profit">Profit</SortableHeader>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <SortableHeader field="profitMargin">Margin</SortableHeader>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedSales.map((sale) => {
                if (!sale.items || !Array.isArray(sale.items)) return null;
                
                return sale.items.map((item, itemIndex) => {
                  const profit = (item.pricePerTicket || 0) - (item.costPerTicket || 0);
                  const profitMargin = (item.pricePerTicket || 0) > 0 ? (profit / (item.pricePerTicket || 0)) * 100 : 0;
                  const itemTags = getItemTags(item);
                  
                  return (
                    <tr key={`${sale.id}-${itemIndex}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(sale.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {sale.eventName || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(sale.eventDate)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {sale.eventVenueName || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.section || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.row || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {itemTags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {itemTags.map((tag, tagIndex) => (
                              <span
                                key={tagIndex}
                                className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">No tags</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.quantity || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(item.costPerTicket)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(item.pricePerTicket)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency((item.pricePerTicket || 0) * (item.quantity || 0))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <span className={profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatCurrency(profit * (item.quantity || 0))}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <span className={profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatPercent(profitMargin)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {isSaleExcluded(sale.id, itemIndex) ? (
                          <button
                            onClick={() => handleIncludeSale(sale.id, itemIndex)}
                            className="inline-flex items-center px-2 py-1 border border-green-300 text-xs font-medium rounded text-green-700 bg-green-50 hover:bg-green-100"
                            title="Include in metrics"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Include
                          </button>
                        ) : (
                          <button
                            onClick={() => handleExcludeSale(sale.id, itemIndex)}
                            className="inline-flex items-center px-2 py-1 border border-red-300 text-xs font-medium rounded text-red-700 bg-red-50 hover:bg-red-100"
                            title="Exclude from metrics"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Exclude
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
        
        {sortedSales.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No sales data found for the selected filters.
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesPerformance; // Force fresh deployment - Wed Sep  3 11:06:01 EDT 2025
