import React, { useState, useEffect, useMemo } from 'react';
import { CheckSquare, Square, Clock, Calendar, MapPin, Target } from 'lucide-react';
import { apiService } from '../api';
import { verificationService } from '../services/verificationService.js';

const PricingChecklist = () => {
  const componentId = useMemo(() => Math.random().toString(36).substr(2, 9), []);
  console.log(`🏗️ PricingChecklist component ${componentId} mounted`);
  
  const [checklist, setChecklist] = useState({
    reviewStrategy: false,
    priceNewInventory: false,
    reviewUnverified: false,
    invoiceNoSales: false,
    reviewListingsAtFloor: false,
    lookAtStarred: false,
    reviewSalesPerformance: false
  });

  const [lastCompleted, setLastCompleted] = useState({});
  const [threeDayListings, setThreeDayListings] = useState([]);
  const [mappedListings, setMappedListings] = useState(new Set());
  const [strategyListings, setStrategyListings] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);
  
  // Verification listings state
  const [verificationListings, setVerificationListings] = useState([]);
  const [verificationMappedListings, setVerificationMappedListings] = useState(new Set());
  const [verificationStrategyListings, setVerificationStrategyListings] = useState(new Set());
  const [verificationStrategyDates, setVerificationStrategyDates] = useState({});
  const [processedIntervals, setProcessedIntervals] = useState({}); // Track which intervals have been processed for each listing
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationShowAll, setVerificationShowAll] = useState(false);
  const [verificationShowVerified, setVerificationShowVerified] = useState(false);
  
  // Strategy date modal state
  const [showStrategyDateModal, setShowStrategyDateModal] = useState(false);
  const [selectedListingForStrategyDate, setSelectedListingForStrategyDate] = useState(null);
  const [strategyDateInput, setStrategyDateInput] = useState('');

  // Starred festival strategy date modal state
  const [showStarredFestivalStrategyDateModal, setShowStarredFestivalStrategyDateModal] = useState(false);
  const [selectedStarredFestivalForStrategyDate, setSelectedStarredFestivalForStrategyDate] = useState(null);
  const [starredFestivalStrategyDateInput, setStarredFestivalStrategyDateInput] = useState('');

  // Starred festivals state
  const [starredFestivals, setStarredFestivals] = useState([]);
  const [starredFestivalMappedListings, setStarredFestivalMappedListings] = useState(new Set());
  const [starredFestivalStrategyListings, setStarredFestivalStrategyListings] = useState(new Set());
  const [starredFestivalStrategyDates, setStarredFestivalStrategyDates] = useState({});
  const [starredFestivalLoading, setStarredFestivalLoading] = useState(false);


  // Component lifecycle logging
  useEffect(() => {
    return () => {
      console.log(`🏗️ PricingChecklist component ${componentId} unmounted`);
    };
  }, [componentId]);

  // Load checklist state from localStorage and backend
  useEffect(() => {
    const loadInitialState = async () => {
      try {
        // Load checklist and last completed from localStorage (these can stay local)
        const savedChecklist = localStorage.getItem('pricingChecklist');
        const savedLastCompleted = localStorage.getItem('pricingChecklistLastCompleted');
        const savedThreeDayListings = localStorage.getItem('pricingChecklistThreeDayListings');
        
        if (savedChecklist) {
          console.log(`🔄 Loading checklist from localStorage:`, JSON.parse(savedChecklist));
          setChecklist(JSON.parse(savedChecklist));
        } else {
          console.log(`🔄 No checklist found in localStorage, using defaults`);
        }
        
        if (savedLastCompleted) {
          console.log(`🔄 Loading lastCompleted from localStorage:`, JSON.parse(savedLastCompleted));
          setLastCompleted(JSON.parse(savedLastCompleted));
        } else {
          console.log(`🔄 No lastCompleted found in localStorage, using empty object`);
        }
        
        if (savedThreeDayListings) {
          const parsedThreeDayListings = JSON.parse(savedThreeDayListings);
          console.log(`🔄 Loading threeDayListings from localStorage:`, parsedThreeDayListings.length, 'items');
          console.log(`🔄 First few listing IDs from localStorage:`, parsedThreeDayListings.slice(0, 5).map(l => l.id));
          console.log(`🔄 Setting threeDayListings state from localStorage to:`, parsedThreeDayListings.map(l => l.id));
          setThreeDayListings(parsedThreeDayListings);
        } else {
          console.log(`🔄 No threeDayListings found in localStorage, will load from API`);
        }

        // Load verification states from backend
        const [verificationMapped, verificationStrategy, verificationDates] = await Promise.all([
          verificationService.getVerificationMappedListings(),
          verificationService.getVerificationStrategyListings(),
          verificationService.getVerificationStrategyDates()
        ]);

        console.log('Loaded verification data from backend:', {
          verificationMapped: verificationMapped.length,
          verificationStrategy: verificationStrategy.length,
          verificationDates: Object.keys(verificationDates).length
        });
        
        console.log('Raw verification data:', {
          verificationMapped,
          verificationStrategy,
          verificationDates
        });
        
        setVerificationMappedListings(new Set(verificationMapped));
        setVerificationStrategyListings(new Set(verificationStrategy));
        setVerificationStrategyDates(verificationDates);
        
        // Load processed intervals from localStorage
        const savedProcessedIntervals = localStorage.getItem('pricingChecklistProcessedIntervals');
        if (savedProcessedIntervals) {
          setProcessedIntervals(JSON.parse(savedProcessedIntervals));
          console.log('📅 Loaded processed intervals from localStorage:', JSON.parse(savedProcessedIntervals));
        }
        
        console.log('🎯 Initial verification state set:', {
          mapped: verificationMapped.length,
          strategy: verificationStrategy.length,
          dates: Object.keys(verificationDates).length
        });

        // Load three day states from backend
        const [threeDayMapped, threeDayStrategy] = await Promise.all([
          verificationService.getThreeDayMappedListings(),
          verificationService.getThreeDayStrategyListings()
        ]);

        console.log(`🔄 Loading threeDayMapped from backend: ${threeDayMapped.length} items`);
        console.log(`🔄 Mapped listing IDs from backend:`, threeDayMapped);
        console.log(`🔄 Setting mappedListings state from backend to:`, threeDayMapped);
        setMappedListings(new Set(threeDayMapped));
        console.log(`🔄 Loading threeDayStrategy from backend: ${threeDayStrategy.length} items`);
        console.log(`🔄 Strategy listing IDs from backend:`, threeDayStrategy);
        console.log(`🔄 Setting strategyListings state from backend to:`, threeDayStrategy);
        setStrategyListings(new Set(threeDayStrategy));

        // Load starred festival states from backend
        const [starredFestivalMapped, starredFestivalStrategy, starredFestivalDates] = await Promise.all([
          verificationService.getStarredFestivalMappedListings(),
          verificationService.getStarredFestivalStrategyListings(),
          verificationService.getStarredFestivalStrategyDates()
        ]);

        setStarredFestivalMappedListings(new Set(starredFestivalMapped));
        setStarredFestivalStrategyListings(new Set(starredFestivalStrategy));
        setStarredFestivalStrategyDates(starredFestivalDates);

        // Load verification listings from backend (which proxies to ZeroHero API)
        console.log('🔄 Loading verification listings from backend...');
        setVerificationLoading(true);
        try {
          const now = new Date();
          const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
          const today = now.toISOString().split('T')[0];
          const threeDaysLater = threeDaysFromNow.toISOString().split('T')[0];
          
          // Calculate 4 days from now for the 4+ Days Away section
          const fourDaysFromNow = new Date(now.getTime() + (4 * 24 * 60 * 60 * 1000));
          const fourDaysLater = fourDaysFromNow.toISOString().split('T')[0];
          
          console.log('📅 Fetching verification listings from 4+ days away (', fourDaysLater, 'onwards)');
          
          // Use the backend endpoint that has the API key configured
                      const response = await fetch(`${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL : 'http://localhost:3001'}/api/zerohero/listings?onlyAvailable=1&eventDateFrom=${fourDaysLater}`, {
            method: 'GET',
            headers: {
              'accept': 'application/json'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data && data.resultData) {
              // Filter listings to only include those with any valid price > $0 AND future event dates
              const filteredListings = data.resultData.filter(listing => {
                const price = parseFloat(listing.price || 0);
                const costPrice = parseFloat(listing.costPrice || 0);
                const retailPrice = parseFloat(listing.retailPrice || 0);
                
                // Include if any price field is greater than 0
                const hasValidPrice = price > 0 || costPrice > 0 || retailPrice > 0;
                
                // Check if event date is in the future (4+ days away)
                let isFutureEvent = false;
                if (listing.eventDate) {
                  const eventDate = new Date(listing.eventDate);
                  const daysUntilEvent = Math.ceil((eventDate - now) / (1000 * 60 * 60 * 24));
                  isFutureEvent = daysUntilEvent >= 4;
                  
                  if (!isFutureEvent) {
                    console.log(`⚠️ Filtering out listing ${listing.id} (${listing.eventName}) - event date ${listing.eventDate} is only ${daysUntilEvent} days away`);
                  }
                } else {
                  console.log(`⚠️ Filtering out listing ${listing.id} (${listing.eventName}) - no event date found`);
                }
                
                if (!hasValidPrice) {
                  console.log(`⚠️ Filtering out listing ${listing.id} (${listing.eventName}) - no valid price found:`, {
                    price,
                    costPrice,
                    retailPrice
                  });
                }
                
                return hasValidPrice && isFutureEvent;
              });
              
                      console.log(`✅ Loaded ${filteredListings.length} verification listings from backend`);
        console.log(`🔄 Setting verificationListings state to ${filteredListings.length} listings`);
        setVerificationListings(filteredListings);
        console.log(`📝 verificationListings state set to ${filteredListings.length} listings`);
              
              // Now merge with existing backend state and add any new listings
              const newMappedListings = new Set(verificationMapped);
              const newStrategyListings = new Set(verificationStrategy);
              
                                // Don't automatically enable new listings - they should start as disabled
                  console.log(`ℹ️ New listings found: ${filteredListings.filter(listing => !verificationMapped.includes(listing.id)).length} for mapped, ${filteredListings.filter(listing => !verificationStrategy.includes(listing.id)).length} for strategy`);
                  console.log(`ℹ️ New listings will start as disabled (user must manually enable them)`);
              
              // Update state with backend data + any new listings
              setVerificationMappedListings(newMappedListings);
              setVerificationStrategyListings(newStrategyListings);
              
                                console.log('✅ Verification listings loaded with existing backend state preserved');
                  console.log('📊 Final verification state:', {
                    mappedSize: newMappedListings.size,
                    strategySize: newStrategyListings.size,
                    totalListings: filteredListings.length,
                    newListingsFound: filteredListings.filter(listing => !verificationMapped.includes(listing.id) || !verificationStrategy.includes(listing.id)).length
                  });
            }
          } else {
            console.error('❌ Backend API error:', response.status, response.statusText);
          }
        } catch (error) {
          console.error('❌ Error loading verification listings from backend:', error);
          // Continue with backend state only
        } finally {
          setVerificationLoading(false);
        }
        
        // Clear old localStorage verification data since we're now using backend
        localStorage.removeItem('pricingChecklistVerificationMappedListings');
        localStorage.removeItem('pricingChecklistVerificationStrategyListings');
        localStorage.removeItem('pricingChecklistVerificationStrategyDates');

        
      } catch (error) {
        console.error('❌ Error loading initial state from backend:', error);
        console.log('🔄 Falling back to localStorage...');
        
        // Only fallback to localStorage if backend completely fails
        const savedMappedListings = localStorage.getItem('pricingChecklistMappedListings');
        const savedStrategyListings = localStorage.getItem('pricingChecklistStrategyListings');
        const savedVerificationMappedListings = localStorage.getItem('pricingChecklistVerificationMappedListings');
        const savedVerificationStrategyListings = localStorage.getItem('pricingChecklistVerificationStrategyListings');
        const savedVerificationStrategyDates = localStorage.getItem('pricingChecklistVerificationStrategyDates');
  const savedProcessedIntervals = localStorage.getItem('pricingChecklistProcessedIntervals');
        
        if (savedMappedListings) {
          const parsedMappedListings = JSON.parse(savedMappedListings);
          console.log(`🔄 Loading mappedListings from localStorage:`, parsedMappedListings.length, 'items');
          console.log(`🔄 Mapped listing IDs from localStorage:`, parsedMappedListings);
          console.log(`🔄 Setting mappedListings state from localStorage to:`, parsedMappedListings);
          setMappedListings(new Set(parsedMappedListings));
        } else {
          console.log(`🔄 No mappedListings found in localStorage, will load from backend`);
        }
        if (savedStrategyListings) {
          const parsedStrategyListings = JSON.parse(savedStrategyListings);
          console.log(`🔄 Loading strategyListings from localStorage:`, parsedStrategyListings.length, 'items');
          console.log(`🔄 Strategy listing IDs from localStorage:`, parsedStrategyListings);
          console.log(`🔄 Setting strategyListings state from localStorage to:`, parsedStrategyListings);
          setStrategyListings(new Set(parsedStrategyListings));
        } else {
          console.log(`🔄 No strategyListings found in localStorage, will load from backend`);
        }
        if (savedVerificationMappedListings) {
          setVerificationMappedListings(new Set(JSON.parse(savedVerificationMappedListings)));
        }
        if (savedVerificationStrategyListings) {
          setVerificationStrategyListings(new Set(JSON.parse(savedVerificationStrategyListings)));
        }
        if (savedVerificationStrategyDates) {
          setVerificationStrategyDates(JSON.parse(savedVerificationStrategyDates));
        }
        if (savedProcessedIntervals) {
          setProcessedIntervals(JSON.parse(savedProcessedIntervals));
        }

        // Load starred festival states from localStorage fallback
        const savedStarredFestivalMappedListings = localStorage.getItem('pricingChecklistStarredFestivalMappedListings');
        const savedStarredFestivalStrategyListings = localStorage.getItem('pricingChecklistStarredFestivalStrategyListings');
        const savedStarredFestivalStrategyDates = localStorage.getItem('pricingChecklistStarredFestivalStrategyDates');

        if (savedStarredFestivalMappedListings) {
          setStarredFestivalMappedListings(new Set(JSON.parse(savedStarredFestivalMappedListings)));
        }
        if (savedStarredFestivalStrategyListings) {
          setStarredFestivalStrategyListings(new Set(JSON.parse(savedStarredFestivalStrategyListings)));
        }
        if (savedStarredFestivalStrategyDates) {
          setStarredFestivalStrategyDates(JSON.parse(savedStarredFestivalStrategyDates));
        }
      }
    };

    loadInitialState();
  }, []);

  // Load 3-day listings on component mount (verification listings are already loaded in loadInitialState)
  useEffect(() => {
    console.log(`🏗️ PricingChecklist component ${componentId} - loadInitialState completed, now loading 3-day listings`);
    loadThreeDayListings();
    loadStarredFestivals();
    // Note: loadVerificationListings() removed - verification listings are loaded in loadInitialState
  }, []);

  // Debug effect for threeDayListings changes
  useEffect(() => {
    console.log('threeDayListings changed:', threeDayListings.length, 'listings');
    console.log('mappedListings state:', mappedListings.size, 'items');
    console.log('strategyListings state:', strategyListings.size, 'items');
  }, [threeDayListings, mappedListings, strategyListings]);

  // Debug effect for verificationListings changes
  useEffect(() => {
    console.log('🔍 DEBUG: verificationListings changed:', verificationListings.length, 'listings');
    console.log('🔍 DEBUG: verificationMappedListings state:', verificationMappedListings.size, 'items');
    console.log('🔍 DEBUG: verificationStrategyListings state:', verificationStrategyListings.size, 'items');
    
    // Log the actual IDs for debugging
    if (verificationMappedListings.size > 0) {
      console.log('🔍 DEBUG: verificationMappedListings IDs:', Array.from(verificationMappedListings));
    }
    if (verificationStrategyListings.size > 0) {
      console.log('🔍 DEBUG: verificationStrategyListings IDs:', Array.from(verificationStrategyListings));
    }
  }, [verificationListings, verificationMappedListings, verificationStrategyListings]);



    // Auto-set defaults for recent verification purchases when listings change
  // TEMPORARILY DISABLED to fix race condition issues
  /*
  useEffect(() => {
    const autoSetDefaults = async () => {
      if (verificationListings.length > 0) {
        const now = new Date();
        let changesMade = false;
        
        // Only process listings that aren't already in the current state
        for (const listing of verificationListings) {
          const extractedPurchaseDate = extractPurchaseDateFromNote(listing);
          const purchaseDate = extractedPurchaseDate || new Date(listing.purchaseDate || listing.createdAt || Date.now());
          const daysSincePurchase = Math.ceil((now - purchaseDate) / (1000 * 60 * 60 * 24));
          
          // If 6 or fewer days since purchase and not already enabled, automatically enable both mapped and strategy
          if (daysSincePurchase <= 6) {
            // Only add if not already in the current state
            if (!verificationMappedListings.has(listing.id)) {
              try {
                await verificationService.addVerificationMappedListing(listing.id);
                changesMade = true;
              } catch (error) {
                console.error('Error auto-enabling mapped listing in backend:', listing.id, error);
              }
            }
            if (!verificationStrategyListings.has(listing.id)) {
              try {
                await verificationService.addVerificationStrategyListing(listing.id);
                changesMade = true;
              } catch (error) {
                console.error('Error auto-enabling strategy listing in backend:', listing.id, error);
              }
            }
            
            if (changesMade) {
              console.log(`Auto-enabled mapped and strategy for recent purchase: ${listing.eventName || listing.event_name || listing.name || listing.title || 'Unknown Event'} (${daysSincePurchase} days since purchase)`);
            }
          }
        }
        
        // Only update state if changes were made
        if (changesMade) {
          // Update backend for new listings
          for (const listing of verificationListings) {
            const extractedPurchaseDate = extractPurchaseDateFromNote(listing);
            const purchaseDate = extractedPurchaseDate || new Date(listing.purchaseDate || listing.createdAt || Date.now());
            const daysSincePurchase = Math.ceil((now - purchaseDate) / (1000 * 60 * 60 * 24));
            
            if (daysSincePurchase <= 6) {
              try {
                if (!verificationMappedListings.has(listing.id)) {
                  await verificationService.addVerificationMappedListing(listing.id);
                }
                if (!verificationStrategyListings.has(listing.id)) {
                  await verificationService.addVerificationStrategyListing(listing.id);
                }
              } catch (error) {
                console.error('Error auto-enabling listing in backend:', listing.id, error);
              }
            }
          }
          
          console.log('🔄 Auto-set defaults made changes, reloading from backend...');
          // Reload the verification data from backend to get the updated state
          const [verificationMapped, verificationStrategy] = await Promise.all([
            verificationService.getVerificationMappedListings(),
            verificationService.getVerificationStrategyListings()
          ]);
          
          setVerificationMappedListings(new Set(verificationMapped));
          setVerificationStrategyListings(new Set(verificationStrategy));
        }
      }
    };
    
    // Temporarily disabled autoSetDefaults to fix race condition issues
    // if (verificationListings.length > 0 && verificationMappedListings.size > 0 && !autoSetDefaultsRun.current) {
    //   autoSetDefaultsRun.current = true;
    //   autoSetDefaults();
    // }
  }, [verificationListings, verificationMappedListings.size]);
  */

  // Check strategy dates for verification listings
  // DISABLED to prevent overriding user manual changes
  // Check custom strategy dates and auto-reset when reached (daily at midnight)
  useEffect(() => {
    const checkStrategyDates = async () => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
            console.log(`Checking strategy dates. Current date: ${today}, Active dates:`, verificationStrategyDates);
      
      for (const [listingId, dateString] of Object.entries(verificationStrategyDates)) {
        console.log(`Checking listing ${listingId}: dateString=${dateString}, today=${today}, dateString === today: ${dateString === today}, hasStrategy: ${verificationStrategyListings.has(listingId)}`);
        
        // Only reset if the strategy date is exactly today (not past dates)
        if (dateString === today && verificationStrategyListings.has(listingId)) {
          try {
            console.log(`Strategy reset date reached for listing ${listingId}. Reset date: ${dateString}, Today: ${today}`);
            
            // Auto-reset strategy for this listing
            await verificationService.removeVerificationStrategyListing(listingId);
            const newStrategyListings = new Set(verificationStrategyListings);
            newStrategyListings.delete(listingId);
            setVerificationStrategyListings(newStrategyListings);
            
            // Remove the expired strategy date from backend and local state
            await verificationService.removeVerificationStrategyDate(listingId);
            setVerificationStrategyDates(prev => {
              const newDates = { ...prev };
              delete newDates[listingId];
              console.log(`Clearing strategy date for listing ${listingId}. New dates state:`, newDates);
              return newDates;
            });
            
            console.log(`Strategy auto-reset completed for listing ${listingId} on custom date ${dateString}`);
          } catch (error) {
            console.error('Error auto-resetting strategy for listing:', listingId, error);
          }
        }
      }
    };

    // Check immediately on mount
    checkStrategyDates();
    
    // Clean up any past dates and invalid dates (dates for listings without strategy)
    const cleanupInvalidDates = async () => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      for (const [listingId, dateString] of Object.entries(verificationStrategyDates)) {
        const isPastDate = dateString < today;
        const hasNoStrategy = !verificationStrategyListings.has(listingId);
        
        // Only remove dates if they are past dates
        // Don't remove future dates even if strategy is disabled - user might re-enable strategy later
        if (isPastDate) {
          const reason = 'past date';
          console.log(`Cleaning up strategy date for listing ${listingId}: ${dateString} (${reason})`);
          
          try {
            await verificationService.removeVerificationStrategyDate(listingId);
            setVerificationStrategyDates(prev => {
              const newDates = { ...prev };
              delete newDates[listingId];
              return newDates;
            });
          } catch (error) {
            console.error('Error cleaning up strategy date for listing:', listingId, error);
          }
        }
      }
    };
    
    // Run cleanup once on mount
    cleanupInvalidDates();
    
    // Set up daily check at midnight
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();
    
    const midnightTimeout = setTimeout(() => {
      checkStrategyDates();
      // Then check every day at midnight
      const dailyInterval = setInterval(checkStrategyDates, 24 * 60 * 60 * 1000);
      return () => clearInterval(dailyInterval);
    }, timeUntilMidnight);
    
    return () => clearTimeout(midnightTimeout);
  }, [verificationStrategyDates, verificationStrategyListings]);

  // Auto-reset strategy based on purchase dates
  // DISABLED to prevent overriding user manual changes
  /*
  useEffect(() => {
    const checkPurchaseDateResets = async () => {
      const now = new Date();
      const autoResetDays = [7, 14, 30, 60, 90, 120, 150, 180];
      
      for (const listing of verificationListings) {
        if (verificationStrategyListings.has(listing.id)) {
          // Try to extract purchase date from notePrivate first, then fall back to other fields
          const extractedPurchaseDate = extractPurchaseDateFromNote(listing);
          const purchaseDate = extractedPurchaseDate || new Date(listing.purchaseDate || listing.createdAt || Date.now());
          const strategyDate = extractedPurchaseDate || new Date(listing.purchaseDate || listing.createdAt || Date.now());
          const daysSincePurchase = Math.ceil((now - purchaseDate) / (1000 * 60 * 60 * 24));
          
          // Check if we've hit an auto-reset milestone
          if (autoResetDays.includes(daysSincePurchase)) {
            try {
              await verificationService.removeVerificationStrategyListing(listing.id);
              const newStrategyListings = new Set(verificationStrategyListings);
              newStrategyListings.delete(listing.id);
              setVerificationStrategyListings(newStrategyListings);
              
              console.log(`Strategy auto-reset for listing ${listing.id} at ${daysSincePurchase} days after purchase`);
            } catch (error) {
              console.error('Error auto-resetting strategy for listing:', listing.id, error);
            }
          }
        }
      }
    };

    // Check immediately
    checkPurchaseDateResets();
    
    // Set up interval to check daily at midnight
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();
    
    const midnightTimeout = setTimeout(() => {
      checkPurchaseDateResets();
      // Then check every day at midnight
      const dailyInterval = setInterval(checkPurchaseDateResets, 24 * 60 * 60 * 1000);
      return () => clearInterval(dailyInterval);
    }, timeUntilMidnight);

    return () => clearTimeout(midnightTimeout);
  }, [verificationListings, verificationStrategyListings]);
  */

  // Check if it's a new day and reset strategy checklist
  // BEHAVIOR:
  // - MAPPED listings: NEVER reset automatically (permanent)
  // - STRATEGY listings: Reset daily for events within 3 days, persist for events 4+ days away
  // - STARRED FESTIVAL strategy listings: Reset daily at midnight
  useEffect(() => {
    const checkNewDay = async () => {
      const now = new Date();
      // Use ISO date string for consistent date comparison across timezones
      const today = now.toISOString().split('T')[0]; // YYYY-MM-DD format
      const lastResetDate = localStorage.getItem('lastStrategyResetDate');
      
      console.log(`🔄 Daily reset check: today=${today}, lastReset=${lastResetDate}, isNewDay=${lastResetDate !== today}`);
      console.log(`🔄 Date details: now=${now.toISOString()}, today=${today}, lastResetDate=${lastResetDate}`);
      console.log(`🔄 Component ID: ${componentId}`);
      
      // Only reset strategy listings if it's a new day
      if (lastResetDate !== today) {
        console.log('🔄 New day detected - resetting strategy listings for 3-day events and starred festivals');
        
        // Reset strategy listings for new day (only for events within 3 days)
        // MAPPED listings are NEVER reset automatically (permanent)
        // STRATEGY listings reset daily for events within 3 days, but persist for events 4+ days away
        console.log(`🔄 Processing ${strategyListings.size} strategy listings for daily reset`);
        console.log(`🔄 Available threeDayListings: ${threeDayListings.length} listings`);
        console.log(`🔄 Strategy listings to process:`, Array.from(strategyListings));
        
        const newStrategyListings = new Set();
        strategyListings.forEach(listingId => {
          const listing = threeDayListings.find(l => l.id === listingId);
          if (listing) {
            const eventDate = new Date(listing.eventDate);
            const daysUntilEvent = Math.ceil((eventDate - now) / (1000 * 60 * 60 * 24));
            
            // Enhanced debugging for strategy reset logic
            console.log(`🔄 Strategy reset analysis for ${listing.eventName}:`);
            console.log(`   - Event Date: ${listing.eventDate}`);
            console.log(`   - Current Time: ${now.toISOString()}`);
            console.log(`   - Days Until Event: ${daysUntilEvent}`);
            console.log(`   - Should Reset: ${daysUntilEvent <= 3}`);
            
            // Keep strategy status for events more than 3 days away (4+ days)
            if (daysUntilEvent > 3) {
              newStrategyListings.add(listingId);
              console.log(`🔄 Keeping strategy for listing ${listingId} (${daysUntilEvent} days away - more than 3 days)`);
            } else {
              // Events within 3 days (0-3 days) will have strategy status reset daily
              console.log(`🔄 Resetting strategy for listing ${listingId} (${daysUntilEvent} days away - within 3 days)`);
            }
          } else {
            console.log(`⚠️ Warning: Could not find listing ${listingId} in threeDayListings`);
            console.log(`⚠️ threeDayListings IDs:`, threeDayListings.map(l => l.id));
          }
        });
        
        if (newStrategyListings.size !== strategyListings.size) {
          console.log('Strategy reset logic triggered - resetting strategy listings for 3-day events');
          console.log('Old strategy listings size:', strategyListings.size);
          console.log('New strategy listings size:', newStrategyListings.size);
          console.log('Strategy listings being reset for events within 3 days');
          
          // Remove strategy status from backend for events within 3 days
          const removedListings = Array.from(strategyListings).filter(listingId => !newStrategyListings.has(listingId));
          console.log(`🔄 Removing strategy status from backend for ${removedListings.length} listings:`, removedListings);
          for (const listingId of removedListings) {
            try {
              console.log(`🔄 Calling backend to remove strategy for listing ${listingId}`);
              await verificationService.removeThreeDayStrategyListing(listingId);
              console.log(`✅ Successfully removed strategy from backend for listing ${listingId}`);
            } catch (error) {
              console.error('❌ Error removing strategy listing from backend:', listingId, error);
            }
          }
          
          console.log(`🔄 Updating strategyListings state: ${strategyListings.size} -> ${newStrategyListings.size}`);
          setStrategyListings(newStrategyListings);
        } else {
          console.log(`🔄 No strategy listings need to be reset today`);
        }

        // Reset starred festival strategy listings daily at midnight
        if (starredFestivalStrategyListings.size > 0) {
          console.log('Resetting starred festival strategy listings for new day');
          
          // Remove strategy status from backend for all starred festivals
          const removedStarredFestivals = Array.from(starredFestivalStrategyListings);
          for (const eventId of removedStarredFestivals) {
            try {
              await verificationService.removeStarredFestivalStrategyListing(eventId);
            } catch (error) {
              console.error('Error removing starred festival strategy listing from backend:', eventId, error);
            }
          }
          
          setStarredFestivalStrategyListings(new Set());
          console.log('Starred festival strategy listings reset for new day');
        }
        
        console.log(`🔄 Setting localStorage lastStrategyResetDate to: ${today}`);
        localStorage.setItem('lastStrategyResetDate', today);
        console.log(`🔄 localStorage set successfully with ISO date format: ${today}`);
        console.log(`🔄 localStorage updated successfully`);
      } else {
        console.log(`🔄 Not a new day, skipping reset. lastResetDate: ${lastResetDate}, today: ${today}`);
      }

      // Check if we need to reset other tasks for a new day
      console.log(`🔄 Checking if tasks need to be reset for new day...`);
      console.log(`🔄 lastCompleted state:`, lastCompleted);
      console.log(`🔄 checklist state:`, checklist);
      
      Object.keys(lastCompleted).forEach(task => {
        if (lastCompleted[task] !== today) {
          console.log(`🔄 Resetting task ${task} for new day`);
          // Reset this task for the new day
          setChecklist(prev => ({ ...prev, [task]: false }));
        } else {
          console.log(`🔄 Task ${task} already completed today, keeping checked`);
        }
      });
    };

    // Check immediately
    console.log('🔄 Daily reset effect mounted - checking for new day immediately');
    checkNewDay();
    
    // Set up interval to check every minute
    const interval = setInterval(() => {
      console.log('🔄 Daily reset interval check running...');
      checkNewDay();
    }, 60000);
    
    // Check at midnight with improved reliability
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();
    
    console.log(`🔄 Setting midnight timeout for daily reset in ${Math.round(timeUntilMidnight / 1000 / 60)} minutes`);
    const midnightTimeout = setTimeout(() => {
      console.log('🔄 Midnight reached - running daily reset check');
      // Force a new date check at midnight to ensure proper reset
      const midnightNow = new Date();
      const midnightToday = midnightNow.toISOString().split('T')[0];
      console.log(`🔄 Midnight check: current date=${midnightToday}`);
      checkNewDay();
    }, timeUntilMidnight);

    return () => {
      console.log(`🔄 Daily reset effect cleanup for component ${componentId}`);
      clearInterval(interval);
      clearTimeout(midnightTimeout);
    };
  }, [threeDayListings, strategyListings, lastCompleted, componentId]); // Need these dependencies for daily reset logic

  // Check purchase date intervals for 4+ days events strategy reset
  // BEHAVIOR:
  // - MAPPED listings: NEVER reset automatically (permanent)
  // - STRATEGY listings: Reset at specific intervals (7, 14, 30, 60, 90, 120, 150, 180 days) after purchase date
  // - Each interval only triggers once per listing
  useEffect(() => {
    const checkPurchaseDateIntervals = async () => {
      const now = new Date();
      const autoResetDays = [7, 14, 30, 60, 90, 120, 150, 180];
      
      console.log('🔍 Checking purchase date intervals for auto-reset...');
      console.log('Current processed intervals state:', processedIntervals);
      
      // Check each verification listing for purchase date intervals
      for (const listing of verificationListings) {
        if (verificationStrategyListings.has(listing.id)) {
          // Extract purchase date from notePrivate or tags
          const purchaseDate = extractPurchaseDateFromNote(listing);
          
          if (purchaseDate) {
            const daysSincePurchase = Math.ceil((now - purchaseDate) / (1000 * 60 * 60 * 24));
            
            // Check if we've hit an auto-reset milestone that hasn't been processed yet
            if (autoResetDays.includes(daysSincePurchase)) {
              const listingId = listing.id;
              const currentProcessedIntervals = processedIntervals[listingId] || [];
              
              // Only reset if this specific interval hasn't been processed yet
              if (!currentProcessedIntervals.includes(daysSincePurchase)) {
                console.log(`Strategy auto-reset for listing ${listingId} (${listing.eventName}) at ${daysSincePurchase} days after purchase`);
                
                try {
                  // Remove strategy status from backend
                  await verificationService.removeVerificationStrategyListing(listingId);
                  
                  // Remove from local state
                  const newStrategyListings = new Set(verificationStrategyListings);
                  newStrategyListings.delete(listingId);
                  setVerificationStrategyListings(newStrategyListings);
                  
                  // Clear the strategy reset date since it's no longer needed
                  if (verificationStrategyDates[listingId]) {
                    try {
                      await verificationService.removeVerificationStrategyDate(listingId);
                      setVerificationStrategyDates(prev => {
                        const newDates = { ...prev };
                        delete newDates[listingId];
                        return newDates;
                      });
                      console.log(`Strategy reset date cleared for listing ${listingId}`);
                    } catch (error) {
                      console.error('Error clearing strategy reset date for listing:', listingId, error);
                    }
                  }
                  
                  // Mark this interval as processed for this listing
                  setProcessedIntervals(prev => ({
                    ...prev,
                    [listingId]: [...(prev[listingId] || []), daysSincePurchase]
                  }));
                  
                  console.log(`Strategy successfully reset for listing ${listingId} at ${daysSincePurchase} days interval`);
                } catch (error) {
                  console.error('Error auto-resetting strategy for listing:', listingId, error);
                }
              } else {
                console.log(`Interval ${daysSincePurchase} already processed for listing ${listingId}, skipping auto-reset`);
                console.log(`Processed intervals for listing ${listingId}:`, currentProcessedIntervals);
              }
            }
          }
        }
      }
    };

    // Don't check immediately - only check at midnight to avoid immediate auto-reset
    // Set up interval to check daily at midnight
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();
    
    const midnightTimeout = setTimeout(() => {
      checkPurchaseDateIntervals();
      // Then check every day at midnight
      const dailyInterval = setInterval(checkPurchaseDateIntervals, 24 * 60 * 60 * 1000);
      return () => clearInterval(dailyInterval);
    }, timeUntilMidnight);

    return () => clearTimeout(midnightTimeout);
  }, [verificationListings, verificationStrategyListings]);

  // Save checklist state to localStorage
  useEffect(() => {
    console.log(`🔄 Saving checklist to localStorage:`, checklist);
    localStorage.setItem('pricingChecklist', JSON.stringify(checklist));
  }, [checklist]);

  // Save last completed dates to localStorage
  useEffect(() => {
    console.log(`🔄 Saving lastCompleted to localStorage:`, lastCompleted);
    localStorage.setItem('pricingChecklistLastCompleted', JSON.stringify(lastCompleted));
  }, [lastCompleted]);

  // Save mapped listings to localStorage
  useEffect(() => {
    console.log(`🔄 Saving mappedListings to localStorage: ${mappedListings.size} items`);
    localStorage.setItem('pricingChecklistMappedListings', JSON.stringify([...mappedListings]));
  }, [mappedListings]);

  // Save strategy listings to localStorage
  useEffect(() => {
    console.log(`🔄 Saving strategyListings to localStorage: ${strategyListings.size} items`);
    localStorage.setItem('pricingChecklistStrategyListings', JSON.stringify([...strategyListings]));
  }, [strategyListings]);

  // Save verification listings to localStorage
  useEffect(() => {
    localStorage.setItem('pricingChecklistVerificationMappedListings', JSON.stringify([...verificationMappedListings]));
  }, [verificationMappedListings]);

  // Save verification strategy listings to localStorage
  useEffect(() => {
    localStorage.setItem('pricingChecklistVerificationStrategyListings', JSON.stringify([...verificationStrategyListings]));
  }, [verificationStrategyListings]);

  // Save verification strategy dates to localStorage
  useEffect(() => {
    localStorage.setItem('pricingChecklistVerificationStrategyDates', JSON.stringify(verificationStrategyDates));
  }, [verificationStrategyDates]);

  // Save three day listings to localStorage
  useEffect(() => {
    console.log(`🔄 Saving threeDayListings to localStorage: ${threeDayListings.length} items`);
    localStorage.setItem('pricingChecklistThreeDayListings', JSON.stringify(threeDayListings));
  }, [threeDayListings]);

  // Save processed intervals to localStorage
  useEffect(() => {
    localStorage.setItem('pricingChecklistProcessedIntervals', JSON.stringify(processedIntervals));
  }, [processedIntervals]);

  // Save starred festival states to localStorage
  useEffect(() => {
    localStorage.setItem('pricingChecklistStarredFestivalMappedListings', JSON.stringify([...starredFestivalMappedListings]));
  }, [starredFestivalMappedListings]);

  useEffect(() => {
    localStorage.setItem('pricingChecklistStarredFestivalStrategyListings', JSON.stringify([...starredFestivalStrategyListings]));
  }, [starredFestivalStrategyListings]);

  useEffect(() => {
    localStorage.setItem('pricingChecklistStarredFestivalStrategyDates', JSON.stringify(starredFestivalStrategyDates));
  }, [starredFestivalStrategyDates]);

  const loadThreeDayListings = async () => {
    setLoading(true);
    try {
      // Get current date and format as YYYY-MM-DD
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      // Get date 3 days from now
      const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
      const threeDaysLater = threeDaysFromNow.toISOString().split('T')[0];
      
      console.log('Fetching listings from', today, 'to', threeDaysLater);
      console.log('Date objects:', { now, threeDaysFromNow });
      console.log('Formatted dates:', { today, threeDaysLater });
      
      const response = await apiService.getAvailableListings({
        eventDateFrom: today,
        eventDateTo: threeDaysLater,
        onlyAvailable: 1
      });

      if (response && response.resultData) {
        console.log('3-day listings loaded:', response.resultData);
        console.log('First listing structure:', response.resultData[0]);
        console.log('All listing IDs:', response.resultData.map(l => l.id));
        console.log(`🔄 Setting threeDayListings state to ${response.resultData.length} listings`);
        console.log(`🔄 First few listing IDs:`, response.resultData.slice(0, 5).map(l => l.id));
        console.log(`🔄 All listing IDs:`, response.resultData.map(l => l.id));
        console.log(`🔄 Setting threeDayListings state from API to:`, response.resultData.map(l => l.id));
        setThreeDayListings(response.resultData);
      } else {
        console.log('No result data in response:', response);
        console.log('Response structure:', response);
      }
    } catch (error) {
      console.error('Error loading 3-day listings:', error);
      // Fallback: try to get all available listings and filter by date on frontend
      try {
        const fallbackResponse = await apiService.getAvailableListings({
          onlyAvailable: 1
        });
        
        if (fallbackResponse && fallbackResponse.resultData) {
          console.log('Fallback listings loaded:', fallbackResponse.resultData);
          
          const filteredListings = fallbackResponse.resultData.filter(listing => {
            const eventDate = new Date(listing.eventDate);
            const daysUntilEvent = Math.ceil((eventDate - now) / (1000 * 60 * 60 * 24));
            return daysUntilEvent >= 0 && daysUntilEvent <= 3;
          });
          console.log('Filtered 3-day listings:', filteredListings);
          setThreeDayListings(filteredListings);
        } else {
          console.log('No result data in fallback response:', fallbackResponse);
          console.log('Fallback response structure:', fallbackResponse);
        }
      } catch (fallbackError) {
        console.error('Fallback error loading listings:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadStarredFestivals = async () => {
    setStarredFestivalLoading(true);
    try {
      // Load starred events from localStorage
      const starredEventIds = JSON.parse(localStorage.getItem('starredEvents') || '[]');
      console.log('🔍 Loading starred festivals, found IDs:', starredEventIds);
      console.log('🔍 localStorage starredEvents raw:', localStorage.getItem('starredEvents'));
      console.log('🔍 Total bookmarked events in localStorage:', localStorage.getItem('starredEvents') ? JSON.parse(localStorage.getItem('starredEvents')).length : 0);
      
      if (starredEventIds.length > 0) {
        // Fetch event details for starred events
        console.log('📡 Fetching event details for starred events...');
        const response = await apiService.getEvents({ eventIds: starredEventIds.join(',') });
        console.log('📡 API response for starred events:', response);
        if (response && response.resultData) {
          console.log('✅ Setting starred festivals:', response.resultData);
          setStarredFestivals(response.resultData);
        } else {
          console.log('⚠️ No resultData in API response');
          setStarredFestivals([]);
        }
      } else {
        console.log('ℹ️ No starred events found in localStorage');
        console.log('ℹ️ User needs to star events in Festival tab first');
        setStarredFestivals([]);
      }
    } catch (error) {
      console.error('❌ Error loading starred festivals:', error);
      setStarredFestivals([]);
    } finally {
      setStarredFestivalLoading(false);
    }
  };

  // loadVerificationListings function removed - verification listings are now loaded in loadInitialState

  const handleVerificationMappedToggle = async (listingId) => {
    console.log('🔄 Toggling verification mapped for listing:', listingId);
    console.log('Current state:', verificationMappedListings.has(listingId));
    console.log('Current verificationMappedListings size:', verificationMappedListings.size);
    
    try {
      if (verificationMappedListings.has(listingId)) {
        // Remove from mapped
        console.log('🗑️ Removing from verification mapped...');
        await verificationService.removeVerificationMappedListing(listingId);
        const newMappedListings = new Set(verificationMappedListings);
        newMappedListings.delete(listingId);
        setVerificationMappedListings(newMappedListings);
        console.log('✅ Removed from verification mapped, new size:', newMappedListings.size);
        console.log('💾 Backend updated - listing removed from mapped');
      } else {
        // Add to mapped
        console.log('➕ Adding to verification mapped...');
        await verificationService.addVerificationMappedListing(listingId);
        const newMappedListings = new Set(verificationMappedListings);
        newMappedListings.add(listingId);
        setVerificationMappedListings(newMappedListings);
        console.log('✅ Added to verification mapped, new size:', newMappedListings.size);
        console.log('💾 Backend updated - listing added to mapped');
      }
    } catch (error) {
      console.error('❌ Error toggling verification mapped listing:', error);
      // Revert state change on error
      setVerificationMappedListings(new Set(verificationMappedListings));
    }
  };

  const handleVerificationStrategyToggle = async (listingId) => {
    console.log('🔄 Toggling verification strategy for listing:', listingId);
    console.log('Current state:', verificationStrategyListings.has(listingId));
    console.log('Current verificationStrategyListings size:', verificationStrategyListings.size);
    
    try {
      if (verificationStrategyListings.has(listingId)) {
        // Remove from strategy
        console.log('🗑️ Removing from verification strategy...');
        await verificationService.removeVerificationStrategyListing(listingId);
        const newStrategyListings = new Set(verificationStrategyListings);
        newStrategyListings.delete(listingId);
        setVerificationStrategyListings(newStrategyListings);
        console.log('✅ Removed from verification strategy, new size:', newStrategyListings.size);
        console.log('💾 Backend updated - listing removed from strategy');
      } else {
        // Add to strategy
        console.log('➕ Adding to verification strategy...');
        await verificationService.addVerificationStrategyListing(listingId);
        const newStrategyListings = new Set(verificationStrategyListings);
        newStrategyListings.add(listingId);
        setVerificationStrategyListings(newStrategyListings);
        
        // Clear processed intervals for this listing when manually re-enabled
        // This allows the user to go through the auto-reset cycle again
        setProcessedIntervals(prev => {
          const newProcessedIntervals = { ...prev };
          delete newProcessedIntervals[listingId];
          return newProcessedIntervals;
        });
        
        console.log('✅ Added to verification strategy, new size:', newStrategyListings.size);
        console.log('💾 Backend updated - listing added to strategy');
        console.log('🔄 Cleared processed intervals for listing - will go through auto-reset cycle again');
      }
    } catch (error) {
      console.error('❌ Error toggling verification strategy listing:', error);
      // Revert state change on error
      setVerificationStrategyListings(new Set(verificationStrategyListings));
    }
  };

  const handleStarredFestivalMappedToggle = async (eventId) => {
    console.log('🔄 Toggling starred festival mapped for event:', eventId);
    
    try {
      if (starredFestivalMappedListings.has(eventId)) {
        // Remove from mapped
        await verificationService.removeStarredFestivalMappedListing(eventId);
        const newMappedListings = new Set(starredFestivalMappedListings);
        newMappedListings.delete(eventId);
        setStarredFestivalMappedListings(newMappedListings);
        console.log('✅ Removed from starred festival mapped');
      } else {
        // Add to mapped
        await verificationService.addStarredFestivalMappedListing(eventId);
        const newMappedListings = new Set(starredFestivalMappedListings);
        newMappedListings.add(eventId);
        setStarredFestivalMappedListings(newMappedListings);
        console.log('✅ Added to starred festival mapped');
      }
    } catch (error) {
      console.error('❌ Error toggling starred festival mapped:', error);
    }
  };

  const handleStarredFestivalStrategyToggle = async (eventId) => {
    console.log('🔄 Toggling starred festival strategy for event:', eventId);
    
    try {
      if (starredFestivalStrategyListings.has(eventId)) {
        // Remove from strategy
        await verificationService.removeStarredFestivalStrategyListing(eventId);
        const newStrategyListings = new Set(starredFestivalStrategyListings);
        newStrategyListings.delete(eventId);
        setStarredFestivalStrategyListings(newStrategyListings);
        console.log('✅ Removed from starred festival strategy');
      } else {
        // Add to strategy
        await verificationService.addStarredFestivalStrategyListing(eventId);
        const newStrategyListings = new Set(starredFestivalStrategyListings);
        newStrategyListings.add(eventId);
        setStarredFestivalStrategyListings(newStrategyListings);
        console.log('✅ Added to starred festival strategy');
      }
    } catch (error) {
      console.error('❌ Error toggling starred festival strategy:', error);
    }
  };

  const handleSetStrategyDate = async (listingId, date) => {
    // Only allow setting dates for listings that currently have strategy enabled
    if (!verificationStrategyListings.has(listingId)) {
      console.warn(`Cannot set strategy date for listing ${listingId}: strategy not enabled`);
      return;
    }
    
    try {
      await verificationService.setVerificationStrategyDate(listingId, date);
      setVerificationStrategyDates(prev => ({
        ...prev,
        [listingId]: date
      }));
      // Keep strategy button ON when date is set - it will only turn off when the date is reached
      console.log(`Strategy reset date set for listing ${listingId}: ${date}. Strategy remains enabled until reset date.`);
    } catch (error) {
      console.error('Error setting strategy date:', error);
    }
  };

  const handleSetStarredFestivalStrategyDate = async (eventId, date) => {
    // Only allow setting dates for events that currently have strategy enabled
    if (!starredFestivalStrategyListings.has(eventId)) {
      console.warn(`Cannot set strategy date for event ${eventId}: strategy not enabled`);
      return;
    }
    
    try {
      await verificationService.setStarredFestivalStrategyDate(eventId, date);
      setStarredFestivalStrategyDates(prev => ({
        ...prev,
        [eventId]: date
      }));
      // Keep strategy button ON when date is set - it will only turn off when the date is reached
      console.log(`Strategy reset date set for starred festival ${eventId}: ${date}. Strategy remains enabled until reset date.`);
    } catch (error) {
      console.error('Error setting starred festival strategy date:', error);
    }
  };

  const openStrategyDateModal = (listing) => {
    // Only allow setting dates for listings that currently have strategy enabled
    if (!verificationStrategyListings.has(listing.id)) {
      console.warn(`Cannot open strategy date modal for listing ${listing.id}: strategy not enabled`);
      return;
    }
    
    setSelectedListingForStrategyDate(listing);
    setStrategyDateInput('');
    setShowStrategyDateModal(true);
  };

  const closeStrategyDateModal = () => {
    setShowStrategyDateModal(false);
    setSelectedListingForStrategyDate(null);
    setStrategyDateInput('');
  };

  const openStarredFestivalStrategyDateModal = (event) => {
    // Only allow setting dates for events that currently have strategy enabled
    if (!starredFestivalStrategyListings.has(event.id)) {
      console.warn(`Cannot open strategy date modal for event ${event.id}: strategy not enabled`);
      return;
    }
    
    setSelectedStarredFestivalForStrategyDate(event);
    setStarredFestivalStrategyDateInput('');
    setShowStarredFestivalStrategyDateModal(true);
  };

  const closeStarredFestivalStrategyDateModal = () => {
    setShowStarredFestivalStrategyDateModal(false);
    setSelectedStarredFestivalForStrategyDate(null);
    setStarredFestivalStrategyDateInput('');
  };

  const submitStrategyDate = () => {
    if (!strategyDateInput || !selectedListingForStrategyDate) return;
    
    // Validate that the date is in the future
    const selectedDate = new Date(strategyDateInput);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      alert('Please select a future date for the strategy reset.');
      return;
    }
    
    handleSetStrategyDate(selectedListingForStrategyDate.id, strategyDateInput);
    closeStrategyDateModal();
  };

  const submitStarredFestivalStrategyDate = () => {
    if (!starredFestivalStrategyDateInput || !selectedStarredFestivalForStrategyDate) return;
    
    // Validate that the date is in the future
    const selectedDate = new Date(starredFestivalStrategyDateInput);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      alert('Please select a future date for the strategy reset.');
      return;
    }
    
    handleSetStarredFestivalStrategyDate(selectedStarredFestivalForStrategyDate.id, starredFestivalStrategyDateInput);
    closeStarredFestivalStrategyDateModal();
  };

  const getVerificationListingStatus = (listing) => {
    // Try to extract purchase date from notePrivate first, then fall back to other fields
    const extractedPurchaseDate = extractPurchaseDateFromNote(listing);
    const purchaseDate = extractedPurchaseDate || new Date(listing.purchaseDate || listing.createdAt || Date.now());
    const eventDate = new Date(listing.eventDate);
    const now = new Date();
    
    const daysSincePurchase = Math.ceil((now - purchaseDate) / (1000 * 60 * 60 * 24));
    const daysUntilEvent = Math.ceil((eventDate - now) / (1000 * 60 * 60 * 24));
    
    // Debug logging for purchase date extraction
    if (extractedPurchaseDate) {
      const source = listing.notePrivate ? 'notePrivate' : 'tags';
      console.log(`Purchase date extracted from ${source}:`, {
        eventName: listing.eventName || listing.event_name || listing.name || listing.title || 'Unknown Event',
        notePrivate: listing.notePrivate,
        tags: listing.tags,
        extractedDate: extractedPurchaseDate.toDateString(),
        daysSincePurchase
      });
    }
    
    // Check if strategy should auto-reset based on purchase date
    const autoResetDays = [7, 14, 30, 60, 90, 120, 150, 180];
    const shouldAutoReset = autoResetDays.includes(daysSincePurchase);
    
    // Check if this interval has already been processed
    const processedIntervalsForListing = processedIntervals[listing.id] || [];
    const isIntervalProcessed = processedIntervalsForListing.includes(daysSincePurchase);
    
    return {
      daysSincePurchase,
      daysUntilEvent,
      shouldAutoReset,
      milestone: autoResetDays.find(day => day >= daysSincePurchase) || 180,
      isIntervalProcessed,
      processedIntervals: processedIntervalsForListing
    };
  };

  const handleManualVerificationStrategyReset = async () => {
    console.log('🔄 Manual verification strategy reset triggered');
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const autoResetDays = [7, 14, 30, 60, 90, 120, 150, 180];
    
    // Reset strategy status for all verification listings that should be reset
    const eventsToReset = [];
    
    verificationStrategyListings.forEach(listingId => {
      const listing = verificationListings.find(l => l.id === listingId);
      if (listing) {
        const purchaseDate = extractPurchaseDateFromNote(listing);
        
        if (purchaseDate) {
          const daysSincePurchase = Math.ceil((now - purchaseDate) / (1000 * 60 * 60 * 24));
          
          // Check if this listing should be reset based on purchase date intervals
          if (autoResetDays.includes(daysSincePurchase)) {
            eventsToReset.push({ listingId, reason: `${daysSincePurchase} days after purchase`, listing });
            console.log(`🔄 Manual reset: ${listing.eventName} (${daysSincePurchase} days after purchase)`);
          }
        }
        
        // Check if this listing has a custom strategy reset date that is today
        if (verificationStrategyDates[listingId] === today) {
          eventsToReset.push({ listingId, reason: 'custom reset date reached', listing });
          console.log(`🔄 Manual reset: ${listing.eventName} (custom reset date: ${verificationStrategyDates[listingId]})`);
        }
      }
    });
    
    // Remove strategy status from backend for events that should be reset
    for (const { listingId, reason, listing } of eventsToReset) {
      try {
        await verificationService.removeVerificationStrategyListing(listingId);
        console.log(`✅ Manual reset: Removed strategy for ${listing.eventName} (${reason})`);
      } catch (error) {
        console.error('❌ Manual reset error:', listingId, error);
      }
    }
    
    // Update local state - remove reset listings from strategy set
    const newVerificationStrategyListings = new Set(verificationStrategyListings);
    eventsToReset.forEach(({ listingId }) => {
      newVerificationStrategyListings.delete(listingId);
    });
    setVerificationStrategyListings(newVerificationStrategyListings);
    
    // Clear custom strategy reset dates for listings that were reset
    const newVerificationStrategyDates = { ...verificationStrategyDates };
    eventsToReset.forEach(({ listingId }) => {
      if (newVerificationStrategyDates[listingId]) {
        delete newVerificationStrategyDates[listingId];
        // Also remove from backend
        verificationService.removeVerificationStrategyDate(listingId).catch(console.error);
      }
    });
    setVerificationStrategyDates(newVerificationStrategyDates);
    
    console.log(`🔄 Manual verification reset complete: ${eventsToReset.length} events reset`);
  };

  const handleManualStrategyReset = async () => {
    console.log('🔄 Manual strategy reset triggered');
    const now = new Date();
    
    // Reset strategy status for all events within 3 days
    const eventsToReset = [];
    strategyListings.forEach(listingId => {
      const listing = threeDayListings.find(l => l.id === listingId);
      if (listing) {
        const eventDate = new Date(listing.eventDate);
        const daysUntilEvent = Math.ceil((eventDate - now) / (1000 * 60 * 60 * 24));
        
        if (daysUntilEvent <= 3) {
          eventsToReset.push(listingId);
          console.log(`🔄 Manual reset: ${listing.eventName} (${daysUntilEvent} days away)`);
        }
      }
    });
    
    // Remove strategy status from backend for events within 3 days
    for (const listingId of eventsToReset) {
      try {
        await verificationService.removeThreeDayStrategyListing(listingId);
        console.log(`✅ Manual reset: Removed strategy for listing ${listingId}`);
      } catch (error) {
        console.error('❌ Manual reset error:', listingId, error);
      }
    }
    
    // Update local state
    const newStrategyListings = new Set();
    strategyListings.forEach(listingId => {
      const listing = threeDayListings.find(l => l.id === listingId);
      if (listing) {
        const eventDate = new Date(listing.eventDate);
        const daysUntilEvent = Math.ceil((eventDate - now) / (1000 * 60 * 60 * 24));
        
        // Keep strategy status for events more than 3 days away
        if (daysUntilEvent > 3) {
          newStrategyListings.add(listingId);
        }
      }
    });
    
    setStrategyListings(newStrategyListings);
    console.log(`🔄 Manual reset complete: ${eventsToReset.length} events reset`);
  };

  const handleTaskToggle = (task) => {
    console.log('🔄 handleTaskToggle called with task:', task);
    console.log('🔄 Current checklist state:', checklist);
    console.log('🔄 Task value before toggle:', checklist[task]);
    
    if (task === 'reviewStrategy') {
      // Check if all 3-day listings have been processed (either mapped, strategy, or both)
      // Events disappear when both are selected, so we check if all listings are in either set
      const allListingsProcessed = threeDayListings.every(listing => 
        mappedListings.has(listing.id) || strategyListings.has(listing.id)
      );
      
      console.log('🔄 reviewStrategy check - allListingsProcessed:', allListingsProcessed);
      console.log('🔄 threeDayListings count:', threeDayListings.length);
      console.log('🔄 mappedListings count:', mappedListings.size);
      console.log('🔄 strategyListings count:', strategyListings.size);
      
      if (!allListingsProcessed) {
        console.log('⚠️ Cannot complete reviewStrategy task yet - not all listings processed');
        return; // Cannot complete this task yet
      }
    }

    if (task === 'reviewUnverified') {
      // Check if all verification listings have been processed (either mapped, strategy, or both)
      const allVerificationListingsProcessed = verificationListings.every(listing => 
        verificationMappedListings.has(listing.id) || verificationStrategyListings.has(listing.id)
      );
      
      console.log('🔄 reviewUnverified check - allVerificationListingsProcessed:', allVerificationListingsProcessed);
      console.log('🔄 verificationListings count:', verificationListings.length);
      console.log('🔄 verificationMappedListings count:', verificationMappedListings.size);
      console.log('🔄 verificationStrategyListings count:', verificationStrategyListings.size);
      
      if (!allVerificationListingsProcessed) {
        console.log('⚠️ Cannot complete reviewUnverified task yet - not all listings processed');
        return; // Cannot complete this task yet
      }
    }

    const now = new Date();
    const today = now.toDateString();
    
    if (!checklist[task]) {
      // Marking as completed
      console.log('✅ Marking task as completed:', task);
      setChecklist(prev => {
        const newState = { ...prev, [task]: true };
        console.log('🔄 New checklist state:', newState);
        return newState;
      });
      setLastCompleted(prev => ({ ...prev, [task]: today }));
    } else {
      // Marking as incomplete
      console.log('❌ Marking task as incomplete:', task);
      setChecklist(prev => {
        const newState = { ...prev, [task]: false };
        console.log('🔄 New checklist state:', newState);
        return newState;
      });
      setLastCompleted(prev => ({ ...prev, [task]: '' }));
    }
  };

  const handleMappedToggle = async (listingId) => {
    console.log('handleMappedToggle called with listingId:', listingId);
    
    try {
      if (mappedListings.has(listingId)) {
        // Remove from mapped
        await verificationService.removeThreeDayMappedListing(listingId);
        const newMappedListings = new Set(mappedListings);
        newMappedListings.delete(listingId);
        setMappedListings(newMappedListings);
        console.log('Removed listingId from mappedListings');
      } else {
        // Add to mapped
        await verificationService.addThreeDayMappedListing(listingId);
        const newMappedListings = new Set(mappedListings);
        newMappedListings.add(listingId);
        setMappedListings(newMappedListings);
        console.log('Added listingId to mappedListings');
      }
    } catch (error) {
      console.error('Error toggling three day mapped listing:', error);
      // Revert state change on error
      setMappedListings(new Set(mappedListings));
    }
  };

  const handleStrategyToggle = async (listingId) => {
    console.log('handleStrategyToggle called with listingId:', listingId);
    
    try {
      if (strategyListings.has(listingId)) {
        // Remove from strategy
        await verificationService.removeThreeDayStrategyListing(listingId);
        const newStrategyListings = new Set(strategyListings);
        newStrategyListings.delete(listingId);
        setStrategyListings(newStrategyListings);
        console.log('Removed listingId from strategyListings');
      } else {
        // Add to strategy
        await verificationService.addThreeDayStrategyListing(listingId);
        const newStrategyListings = new Set(strategyListings);
        newStrategyListings.add(listingId);
        setStrategyListings(newStrategyListings);
        console.log('Added listingId to strategyListings');
      }
    } catch (error) {
      console.error('Error toggling three day strategy listing:', error);
      // Revert state change on error
      setStrategyListings(new Set(strategyListings));
    }
  };

  const getDaysSinceLastCheck = (task) => {
    if (!lastCompleted[task]) return null;
    
    const lastDate = new Date(lastCompleted[task]);
    const today = new Date();
    const diffTime = Math.abs(today - lastDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const getTaskIcon = (task) => {
    if (checklist[task]) {
      return <CheckSquare className="w-5 h-5 text-green-600" />;
    }
    return <Square className="w-5 h-5 text-gray-400" />;
  };

  const getTaskStatus = (task) => {
    if (checklist[task]) {
      const daysSince = getDaysSinceLastCheck(task);
      if (daysSince === 0) {
        return <span className="text-green-600 text-sm">✓ Completed today</span>;
      } else if (daysSince === 1) {
        return <span className="text-green-600 text-sm">✓ Completed yesterday</span>;
      } else {
        return <span className="text-green-600 text-sm">✓ Completed {daysSince} days ago</span>;
      }
    } else {
      const daysSince = getDaysSinceLastCheck(task);
      if (daysSince && daysSince > 0) {
        return (
          <span className="text-orange-600 text-sm flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {daysSince} day{daysSince > 1 ? 's' : ''} since last check
          </span>
        );
      }
      return <span className="text-gray-500 text-sm">Not completed today</span>;
    }
  };

  const completedCount = Object.values(checklist).filter(Boolean).length;
  const totalTasks = Object.keys(checklist).length;

  const canCompleteReviewStrategy = threeDayListings.every(listing => 
    mappedListings.has(listing.id) || strategyListings.has(listing.id)
  );

  const canCompleteReviewUnverified = verificationListings.every(listing => 
    verificationMappedListings.has(listing.id) || verificationStrategyListings.has(listing.id)
  );

  const getEventDateDisplay = (eventDate) => {
    const date = new Date(eventDate);
    const now = new Date();
    const daysUntilEvent = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
    
    if (daysUntilEvent === 0) return 'Today';
    if (daysUntilEvent === 1) return 'Tomorrow';
    if (daysUntilEvent === 2) return 'Day after tomorrow';
    return `${daysUntilEvent} days`;
  };

  const getEventDateDisplayFor3Day = (eventDate) => {
    const date = new Date(eventDate);
    const now = new Date();
    const daysUntilEvent = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
    
    // For 3-day section, always show the actual date
    const options = { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    
    const dateString = date.toLocaleDateString('en-US', options);
    
    // Add relative indicator for context
    if (daysUntilEvent === 0) return `${dateString} (Today)`;
    if (daysUntilEvent === 1) return `${dateString} (Tomorrow)`;
    if (daysUntilEvent === 2) return `${dateString} (Day after tomorrow)`;
    return `${dateString} (${daysUntilEvent} days away)`;
  };

  const extractPurchaseDateFromNote = (listing) => {
    // First try to extract from notePrivate
    if (listing.notePrivate) {
      // Look for "Purchase Date: MM/DD/YY" pattern
      const purchaseDateMatch = listing.notePrivate.match(/Purchase Date:\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
      if (purchaseDateMatch) {
        const dateString = purchaseDateMatch[1];
        // Parse the date - handle both MM/DD/YY and MM/DD/YYYY formats
        const [month, day, year] = dateString.split('/');
        // Convert 2-digit year to 4-digit year
        const fullYear = year.length === 2 ? `20${year}` : year;
        return new Date(fullYear, month - 1, day); // month is 0-indexed in Date constructor
      }
      
      // Look for "Purchase Date: MM/DD/YYYY" pattern
      const purchaseDateMatch2 = listing.notePrivate.match(/Purchase Date:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
      if (purchaseDateMatch2) {
        const dateString = purchaseDateMatch2[1];
        const [month, day, year] = dateString.split('/');
        return new Date(year, month - 1, day);
      }
    }
    
    // Fallback: Check for date tags like "8/13" in the tags array
    if (listing.tags && Array.isArray(listing.tags)) {
      console.log('Checking tags for date patterns:', listing.tags);
      for (const tag of listing.tags) {
        // Look for tags in format "M/D" or "MM/DD"
        const dateTagMatch = tag.match(/^(\d{1,2})\/(\d{1,2})$/);
        if (dateTagMatch) {
          const month = parseInt(dateTagMatch[1]);
          const day = parseInt(dateTagMatch[2]);
          // Assume current year (2025) for these tags
          const year = 2025;
          const extractedDate = new Date(year, month - 1, day);
          console.log(`Date tag found: "${tag}" -> ${extractedDate.toDateString()}`);
          return extractedDate;
        }
      }
    }
    
    return null;
  };



  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Daily Pricing Checklist</h3>
        </div>
        <div className="text-sm text-gray-600">
          {completedCount}/{totalTasks} completed
        </div>
      </div>
      
      <div className="space-y-3">
        {/* Review Strategy Task - Special handling */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleTaskToggle('reviewStrategy')}
              className="hover:scale-110 transition-transform cursor-pointer p-1 rounded hover:bg-gray-100"
              title="Click to toggle task completion"
            >
              {getTaskIcon('reviewStrategy')}
            </button>
            <span className="font-medium text-gray-900">Review strategy for events within 3 days</span>
          </div>
          <div className="flex items-center gap-2">
            {getTaskStatus('reviewStrategy')}
            {!checklist.reviewStrategy && threeDayListings.length > 0 && (
              <span className="text-xs text-gray-500">
                ({threeDayListings.filter(listing => !(mappedListings.has(listing.id) || strategyListings.has(listing.id))).length} left)
              </span>
            )}
            <button
              onClick={handleManualStrategyReset}
              className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
              title="Force reset strategy status for events within 3 days"
            >
              Reset Strategy
            </button>
          </div>
        </div>

        {/* 3-Day Listings Subsection */}
        <div className="ml-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Events within 3 days (showing event dates)
            {loading ? (
              <span className="text-blue-600 text-xs">(Loading...)</span>
            ) : (
              <span className="text-blue-600 text-xs">
                ({showAllEvents ? threeDayListings.length : threeDayListings.filter(listing => !(mappedListings.has(listing.id) && strategyListings.has(listing.id))).length} remaining of {threeDayListings.length} total)
              </span>
            )}
            <button
              onClick={() => setShowAllEvents(!showAllEvents)}
              className={`ml-2 px-3 py-1 text-xs rounded-full transition-colors ${
                showAllEvents 
                  ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                  : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
              }`}
            >
              {showAllEvents ? 'Show Unprocessed' : 'Show All'}
            </button>
          </h4>
          
          {loading ? (
            <div className="text-center py-4 text-blue-600">Loading 3-day listings...</div>
          ) : threeDayListings.length > 0 ? (
            <div className="space-y-2">
              {threeDayListings
                .sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate))
                .filter(listing => showAllEvents || !(mappedListings.has(listing.id) && strategyListings.has(listing.id)))
                .map(listing => (
                  <div key={listing.id} className={`flex items-center justify-between p-2 rounded border transition-colors ${
                    showAllEvents && mappedListings.has(listing.id) && strategyListings.has(listing.id)
                      ? 'bg-green-50 border-green-200' // Completed events
                      : 'bg-white border-gray-200' // Regular events
                  }`} style={{ pointerEvents: 'auto' }}>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                        {listing.eventName}
                        {showAllEvents && (
                          <div className="flex gap-1">
                            {mappedListings.has(listing.id) && (
                              <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded-full border border-green-200">
                                ✓ Mapped
                              </span>
                            )}
                            {strategyListings.has(listing.id) && (
                              <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full border border-blue-200">
                                ✓ Strategy
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-600">
                        {getEventDateDisplayFor3Day(listing.eventDate)} • {listing.section} • Row {listing.row}
                        {(() => {
                          const purchaseDate = extractPurchaseDateFromNote(listing);
                          if (purchaseDate) {
                            const formattedDate = purchaseDate.toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric' 
                            });
                            return ` • Purchase: ${formattedDate}`;
                          }
                          return '';
                        })()}
                      </div>
                    </div>
                    <div className="flex gap-2" style={{ pointerEvents: 'auto' }}>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleStrategyToggle(listing.id);
                          // Add visual feedback
                          e.target.style.transform = 'scale(0.95)';
                          setTimeout(() => {
                            e.target.style.transform = 'scale(1)';
                          }, 100);
                        }}
                        className={`px-3 py-1 text-xs rounded-full flex items-center gap-1 transition-colors relative z-10 cursor-pointer ${
                          strategyListings.has(listing.id)
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                          }`}
                        style={{ 
                          pointerEvents: 'auto',
                          position: 'relative',
                          zIndex: 10
                        }}
                        type="button"
                      >
                        <Target className="w-3 h-3" />
                        Strategy
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleMappedToggle(listing.id);
                          // Add visual feedback
                          e.target.style.transform = 'scale(0.95)';
                          setTimeout(() => {
                            e.target.style.transform = 'scale(1)';
                          }, 100);
                        }}
                        className={`px-3 py-1 text-xs rounded-full flex items-center gap-1 transition-colors relative z-10 cursor-pointer ${
                          mappedListings.has(listing.id)
                            ? 'bg-green-100 text-green-800 border border-green-300'
                            : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                        }`}
                        style={{ 
                          pointerEvents: 'auto',
                          position: 'relative',
                          zIndex: 10
                        }}
                        type="button"
                      >
                        <MapPin className="w-3 h-3" />
                        Mapped
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">No events within 3 days found</div>
          )}
          
          <div className="mt-3 text-xs text-blue-700">
            <strong>Note:</strong> Events disappear when both Mapped and Strategy are selected. 
            <br />• <strong>Mapped status is permanent</strong> for all events (never resets automatically)
            <br />• <strong>Strategy status resets daily at midnight</strong> for events within 3 days
            <br />• Use "Show All" to see all events regardless of status
          </div>
        </div>



        {/* Other Tasks */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleTaskToggle('reviewUnverified')}
              className="hover:scale-110 transition-transform cursor-pointer p-1 rounded hover:bg-gray-100"
              title="Click to toggle task completion"
            >
              {getTaskIcon('reviewUnverified')}
            </button>
            <span className="font-medium text-gray-900">Review any unverified listings for strategy and mapping</span>
          </div>
          <div className="flex items-center gap-2">
            {getTaskStatus('reviewUnverified')}
            {!checklist.reviewUnverified && verificationListings.length > 0 && (
              <span className="text-xs text-gray-500">
                ({verificationListings.filter(listing => !(verificationMappedListings.has(listing.id) || verificationStrategyListings.has(listing.id))).length} left)
              </span>
            )}
          </div>
        </div>

        {/* 4+ Days Events Subsection - Nested under Review any unverified listings */}
        <div className="ml-8 p-4 bg-orange-50 rounded-lg border border-orange-200">
          <h4 className="text-sm font-semibold text-orange-900 mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Events 4+ Days Away
            {verificationLoading ? (
              <span className="text-orange-600 text-xs">(Loading...)</span>
            ) : (
              <span className="text-orange-600 text-xs">
                ({verificationShowAll ? verificationListings.length : verificationListings.filter(listing => !(verificationMappedListings.has(listing.id) && verificationStrategyListings.has(listing.id))).length} remaining of {verificationListings.length} total)
              </span>
            )}
            <button
              onClick={() => setVerificationShowAll(!verificationShowAll)}
              className={`ml-2 px-3 py-1 text-xs rounded-full transition-colors ${
                verificationShowAll 
                  ? 'bg-orange-100 text-orange-800 border border-orange-300' 
                  : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
              }`}
            >
              {verificationShowAll ? 'Show Unprocessed' : 'Show All'}
            </button>
            <button
              onClick={handleManualVerificationStrategyReset}
              className="ml-2 px-3 py-1 text-xs bg-red-100 text-red-700 rounded-full border border-red-300 hover:bg-red-200"
              title="Force reset strategy status for events at purchase date intervals or custom reset dates"
            >
              Reset Strategy
            </button>
          </h4>
          
          {verificationLoading ? (
            <div className="text-center py-4 text-orange-600">Loading 4+ days events...</div>
          ) : verificationListings.length > 0 ? (
            <div className="space-y-2">
              {verificationListings
                .sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate))
                .filter(listing => verificationShowAll || !(verificationMappedListings.has(listing.id) && verificationStrategyListings.has(listing.id)))
                .map(listing => (
                  <div key={listing.id} className={`flex items-center justify-between p-2 rounded border transition-colors ${
                    verificationShowAll && verificationMappedListings.has(listing.id) && verificationStrategyListings.has(listing.id)
                      ? 'bg-green-50 border-green-200' // Completed events
                      : 'bg-white border-gray-200' // Regular events
                  }`} style={{ pointerEvents: 'auto' }}>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                        {listing.eventName}
                        {verificationShowAll && (
                          <div className="flex gap-1">
                            {verificationMappedListings.has(listing.id) && (
                              <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded-full border border-green-200">
                                ✓ Mapped
                              </span>
                            )}
                            {verificationStrategyListings.has(listing.id) && (
                              <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full border border-blue-200">
                                ✓ Strategy
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-600">
                        {getEventDateDisplayFor3Day(listing.eventDate)} • {listing.section} • Row {listing.row}
                        {(() => {
                          const purchaseDate = extractPurchaseDateFromNote(listing);
                          if (purchaseDate) {
                            const formattedDate = purchaseDate.toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric' 
                            });
                            return ` • Purchase: ${formattedDate}`;
                          }
                          return '';
                        })()}
                      </div>
                    </div>
                    <div className="flex gap-2" style={{ pointerEvents: 'auto' }}>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (verificationStrategyListings.has(listing.id)) {
                            openStrategyDateModal(listing);
                            // Add visual feedback
                            e.target.style.transform = 'scale(0.95)';
                            setTimeout(() => {
                              e.target.style.transform = 'scale(1)';
                            }, 100);
                          }
                        }}
                        className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 transition-colors relative z-10 ${
                          verificationStrategyDates[listing.id] && verificationStrategyListings.has(listing.id)
                            ? 'bg-purple-100 text-purple-800 border border-purple-300 cursor-pointer'
                            : verificationStrategyListings.has(listing.id)
                            ? 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200 cursor-pointer'
                            : 'bg-gray-50 text-gray-400 border border-gray-200 cursor-not-allowed'
                        }`}
                        style={{ pointerEvents: 'auto', position: 'relative', zIndex: 10 }}
                        type="button"
                        disabled={!verificationStrategyListings.has(listing.id)}
                        title={verificationStrategyDates[listing.id] 
                          ? `Strategy will reset on ${verificationStrategyDates[listing.id]}` 
                          : verificationStrategyListings.has(listing.id)
                          ? 'Set strategy reset date'
                          : 'Enable strategy first to set reset date'
                        }
                      >
                        <Clock className="w-3 h-3" />
                        {verificationStrategyDates[listing.id] && verificationStrategyListings.has(listing.id) && (
                          <span className="text-xs text-purple-600 font-medium">
                            {new Date(verificationStrategyDates[listing.id]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleVerificationStrategyToggle(listing.id);
                          // Add visual feedback
                          e.target.style.transform = 'scale(0.95)';
                          setTimeout(() => {
                            e.target.style.transform = 'scale(1)';
                          }, 100);
                        }}
                        className={`px-3 py-1 text-xs rounded-full flex items-center gap-1 transition-colors relative z-10 cursor-pointer ${
                          verificationStrategyListings.has(listing.id) ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                        }`}
                        style={{ pointerEvents: 'auto', position: 'relative', zIndex: 10 }}
                        type="button"
                      >
                        <Target className="w-3 h-3" />
                        Strategy
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleVerificationMappedToggle(listing.id);
                          // Add visual feedback
                          e.target.style.transform = 'scale(0.95)';
                          setTimeout(() => {
                            e.target.style.transform = 'scale(1)';
                          }, 100);
                        }}
                        className={`px-3 py-1 text-xs rounded-full flex items-center gap-1 transition-colors relative z-10 cursor-pointer ${
                          verificationMappedListings.has(listing.id) ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                        }`}
                        style={{ pointerEvents: 'auto', position: 'relative', zIndex: 10 }}
                        type="button"
                      >
                        <MapPin className="w-3 h-3" />
                        Mapped
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-4 text-orange-600">No events 4+ days away found</div>
          )}
          
          <div className="mt-3 text-xs text-orange-700">
            <strong>Note:</strong> Events disappear when both Mapped and Strategy are selected. 
            <br />• <strong>Mapped status is permanent</strong> for all events (never resets automatically)
            <br />• <strong>Strategy status auto-resets</strong> at 7, 14, 30, 60, 90, 120, 150, 180 days after purchase date
            <br />• <em>Auto-reset happens once per interval at midnight. If you manually re-enable strategy, it will go through the auto-reset cycle again.</em>
            <br />• <strong>Clock button</strong> sets custom strategy reset date (resets once on that date)
            <br />• Use "Show All" to see all events regardless of status
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleTaskToggle('invoiceNoSales')}
              className="hover:scale-110 transition-transform cursor-pointer p-1 rounded hover:bg-gray-100"
              title="Click to toggle task completion"
            >
              {getTaskIcon('invoiceNoSales')}
            </button>
            <span className="font-medium text-gray-900">Invoice out previous day no sales</span>
          </div>
          <div className="flex items-center gap-2">
            {getTaskStatus('invoiceNoSales')}
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleTaskToggle('reviewListingsAtFloor')}
              className="hover:scale-110 transition-transform cursor-pointer p-1 rounded hover:bg-gray-100"
              title="Click to toggle task completion"
            >
              {getTaskIcon('reviewListingsAtFloor')}
            </button>
            <span className="font-medium text-gray-900">Review Floor, Ceiling and other problem listings in Broker Nerds</span>
          </div>
          <div className="flex items-center gap-2">
            {getTaskStatus('reviewListingsAtFloor')}
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleTaskToggle('lookAtStarred')}
              className="hover:scale-110 transition-transform cursor-pointer p-1 rounded hover:bg-gray-100"
              title="Click to toggle task completion"
            >
              {getTaskIcon('lookAtStarred')}
            </button>
            <span className="font-medium text-gray-900">Look at starred festivals</span>
          </div>
          {getTaskStatus('lookAtStarred')}
        </div>
        
        {/* Instructions for starred festivals */}
        {!checklist.lookAtStarred && starredFestivals.length === 0 && (
          <div className="mt-2 text-xs text-gray-600 bg-blue-50 p-2 rounded">
            💡 <strong>Tip:</strong> Star events in the Festival tab to see them automatically appear here.
            <br />📌 <strong>To get started:</strong>
            <br />1. Go to the <strong>Festival tab</strong> (Event Dashboard)
            <br />2. Click the <strong>star icon</strong> ⭐ next to any bookmarked event names
            <br />3. Return here - starred events will appear automatically with mapped/strategy buttons
          </div>
        )}

        {/* Starred Festivals Section */}
        {(checklist.lookAtStarred || starredFestivals.length > 0) && (
          <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Starred Festivals
              {!checklist.lookAtStarred && (
                <span className="text-xs text-blue-600 ml-2">(Auto-displayed)</span>
              )}
            </h3>
            
            {starredFestivalLoading ? (
              <div className="text-center py-4 text-gray-500">Loading starred festivals...</div>
            ) : starredFestivals.length > 0 ? (
              <div className="space-y-3">
                {starredFestivals.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{event.name || `Event ${event.id}`}</div>
                      <div className="text-sm text-gray-600">{event.date}</div>
                      <div className="text-sm text-gray-500">{event.venue?.name || 'Unknown venue'}</div>
                    </div>
                    
                    <div className="flex gap-2">
                      {/* Strategy Button */}
                      <button
                        onClick={() => handleStarredFestivalStrategyToggle(event.id)}
                        className={`px-3 py-2 text-sm rounded-lg flex items-center gap-2 transition-colors ${
                          starredFestivalStrategyListings.has(event.id)
                            ? 'bg-green-100 text-green-800 border border-green-300'
                            : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                        }`}
                        title={starredFestivalStrategyListings.has(event.id) ? 'Remove from strategy' : 'Add to strategy'}
                      >
                        <Target className="w-4 h-4" />
                        {starredFestivalStrategyListings.has(event.id) ? 'Strategy' : 'Strategy'}
                      </button>

                      {/* Strategy Date Button */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (starredFestivalStrategyListings.has(event.id)) {
                            openStarredFestivalStrategyDateModal(event);
                            // Add visual feedback
                            e.target.style.transform = 'scale(0.95)';
                            setTimeout(() => {
                              e.target.style.transform = 'scale(1)';
                            }, 100);
                          }
                        }}
                        className={`px-3 py-2 text-sm rounded-lg flex items-center gap-2 transition-colors relative z-10 ${
                          starredFestivalStrategyDates[event.id] && starredFestivalStrategyListings.has(event.id)
                            ? 'bg-purple-100 text-purple-800 border border-purple-300 cursor-pointer'
                            : starredFestivalStrategyListings.has(event.id)
                            ? 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200 cursor-pointer'
                            : 'bg-gray-50 text-gray-400 border border-gray-200 cursor-not-allowed'
                        }`}
                        style={{ pointerEvents: 'auto', position: 'relative', zIndex: 10 }}
                        type="button"
                        disabled={!starredFestivalStrategyListings.has(event.id)}
                        title={starredFestivalStrategyDates[event.id] 
                          ? `Strategy will reset on ${starredFestivalStrategyDates[event.id]}` 
                          : starredFestivalStrategyListings.has(event.id)
                          ? 'Set strategy reset date'
                          : 'Enable strategy first to set reset date'
                        }
                      >
                        <Clock className="w-4 h-4" />
                        {starredFestivalStrategyDates[event.id] ? 'Date Set' : 'Set Date'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <div className="mb-2">No starred festivals found.</div>
                <div className="text-sm">
                  <strong>To add starred festivals:</strong>
                  <br />1. Go to the <strong>Festival tab</strong> (Event Dashboard)
                  <br />2. Click the <strong>star icon</strong> ⭐ next to any bookmarked event names
                  <br />3. Return here to see them with mapped/strategy buttons
                </div>
              </div>
            )}
            
            <div className="mt-3 text-xs text-orange-700">
              <strong>Note:</strong> Starred festivals from the Festivals tab bookmarks are shown above.
              <br />• <strong>Mapped status is permanent</strong> for all festivals (never resets automatically)
              <br />• <strong>Strategy status resets daily at midnight</strong> for all starred festivals
              <br />• <strong>Clock button</strong> sets custom strategy reset date (resets once on that date)
            </div>
          </div>
        )}

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleTaskToggle('reviewSalesPerformance')}
              className="hover:scale-110 transition-transform cursor-pointer p-1 rounded hover:bg-gray-100"
              title="Click to toggle task completion"
            >
              {getTaskIcon('reviewSalesPerformance')}
            </button>
            <span className="font-medium text-gray-900">Review previous days sales performance</span>
          </div>
          {getTaskStatus('reviewSalesPerformance')}
        </div>

      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-gray-500">
            ✓ Checklist automatically resets at midnight • Tasks disappear when completed • Tracks days since last completion
          </p>
          <button
            onClick={() => {
              console.log('🧪 Manual daily reset test triggered');
              const now = new Date();
              const today = now.toDateString();
              const lastResetDate = localStorage.getItem('lastStrategyResetDate');
              console.log(`🧪 Manual test - today: ${today}, lastReset: ${lastResetDate}`);
              localStorage.removeItem('lastStrategyResetDate');
              console.log('🧪 Manual test - cleared lastStrategyResetDate, will trigger reset on next check');
            }}
            className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded border border-yellow-300 hover:bg-yellow-200"
            title="Test daily reset logic"
          >
            🧪 Test Daily Reset
          </button>
        </div>
      </div>

      {/* Strategy Date Modal */}
      {showStrategyDateModal && selectedListingForStrategyDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Set Strategy Reset Date
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Set a date when &quot;{selectedListingForStrategyDate.eventName}&quot; should have its strategy status automatically reset.
            </p>
            <div className="mb-4">
              <label htmlFor="strategyDate" className="block text-sm font-medium text-gray-700 mb-2">
                Strategy Reset Date
              </label>
              <input
                type="date"
                id="strategyDate"
                value={strategyDateInput}
                onChange={(e) => setStrategyDateInput(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={closeStrategyDateModal}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitStrategyDate}
                disabled={!strategyDateInput}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Set Date
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Starred Festival Strategy Date Modal */}
      {showStarredFestivalStrategyDateModal && selectedStarredFestivalForStrategyDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Set Strategy Reset Date
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Set a date when &quot;{selectedStarredFestivalForStrategyDate.name || `Event ${selectedStarredFestivalForStrategyDate.id}`}&quot; should have its strategy status automatically reset.
            </p>
            <div className="mb-4">
              <label htmlFor="starredFestivalStrategyDate" className="block text-sm font-medium text-gray-700 mb-2">
                Strategy Reset Date
              </label>
              <input
                type="date"
                id="starredFestivalStrategyDate"
                value={starredFestivalStrategyDateInput}
                onChange={(e) => setStarredFestivalStrategyDateInput(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={closeStarredFestivalStrategyDateModal}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitStarredFestivalStrategyDate}
                disabled={!starredFestivalStrategyDateInput}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Set Date
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingChecklist; // Force deployment test - Tue Sep  2 11:00:44 EDT 2025
