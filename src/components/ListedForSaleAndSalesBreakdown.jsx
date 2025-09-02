import React, { useState, useEffect } from 'react';
import { SalesBreakdownChart } from './SectionBreakdown';
import { userDataService } from '../services/userDataService';
import { apiService } from '../api';
import { Check } from 'lucide-react';

// Helper function to format event name with description (same as EventSearch)
const formatEventName = (event) => {
  const name = event.name || 'Event Name Unavailable';
  const description = event.eventDescription;
  
  if (description && description.trim()) {
    return `${name} - ${description}`;
  }
  
  return name;
};

// Helper functions (copy from SectionBreakdown or import if shared)
function renderPrivateNote(note) {
  if (!note) return <span className="italic text-gray-400">(none)</span>;
  return note;
}

const ListedForSaleAndSalesBreakdown = ({
  inventory,
  sales,
  manualCategories,
  event,
}) => {
  // State for modals and custom links
  const [showMarketplaceModal, setShowMarketplaceModal] = useState(null);
  const [customMarketplaceLink, setCustomMarketplaceLink] = useState('');
  const [marketplaceEventId, setMarketplaceEventId] = useState('');
  const [showListingMarketplaceModal, setShowListingMarketplaceModal] = useState(null);
  const [customListingMarketplaceLink, setCustomListingMarketplaceLink] = useState('');
  const [listingMarketplaceEventId, setListingMarketplaceEventId] = useState('');
  const [listingMarketplaceListingId, setListingMarketplaceListingId] = useState('');
  
  // State for marketplace links
  const [marketplaceLinks, setMarketplaceLinks] = useState({});
  
  // State for autopriced listings
  const [autopricedListings, setAutopricedListings] = useState({});
  
  // State for pre-sale modal
  const [showPresaleModal, setShowPresaleModal] = useState(false);
  const [presaleForm, setPresaleForm] = useState({
    section: '',
    row: '',
    seatStart: '',
    quantity: '',
    shippingMethod: 1,
    inHandDate: '',
    retailNote: '',
    tags: '',
    passType: ''
  });

  // Load marketplace links for the current event
  useEffect(() => {
    async function loadMarketplaceLinks() {
      if (inventory && inventory.length > 0) {
        const first = inventory.find(item => item.ticketStatus === 'Active');
        const eventId = first?.eventId || '';
        if (eventId) {
          try {
            const links = await userDataService.getCustomMarketplaceLinks(eventId);
            setMarketplaceLinks(links);
          } catch (error) {
            console.error('Failed to load marketplace links:', error);
          }
        }
      }
    }
    loadMarketplaceLinks();
  }, [inventory]);

  // Load autopriced listings
  useEffect(() => {
    async function loadAutopricedListings() {
      try {
        const listings = await userDataService.getAutopricedListings();
        setAutopricedListings(listings);
      } catch (error) {
        console.error('Failed to load autopriced listings:', error);
      }
    }
    loadAutopricedListings();
  }, []);

  // Set default in-hand date when modal opens
  useEffect(() => {
    if (showPresaleModal && inventory && inventory.length > 0) {
      const first = inventory.find(item => item.ticketStatus === 'Active');
      if (first?.eventDate) {
        const eventDate = new Date(first.eventDate);
        const inHandDate = new Date(eventDate.getTime() - (2 * 24 * 60 * 60 * 1000)); // 2 days before
        const formattedDate = inHandDate.toISOString().split('T')[0];
        setPresaleForm(prev => ({ ...prev, inHandDate: formattedDate }));
      }
    }
  }, [showPresaleModal, inventory]);

  // Function to create pre-sale listing
  const createPresaleListing = async () => {
    try {
      console.log('Inventory data:', inventory);
      console.log('Event data:', event);
      
      // For pre-sale listings, we can create them even without existing inventory
      // Use event data as the primary source, fallback to inventory if available
      let templateData = null;
      
      if (event) {
        // Use event data as template
        templateData = {
          eventId: event.id,
          eventName: event.name,
          eventDescription: event.eventDescription,
          eventDate: event.date,
          venueName: event.venue?.name,
          vendorId: 1, // Default vendor ID
          eventStubHubId: 1, // Default values
          eventTicketmasterId: 1,
          performerId: 1
        };
        console.log('Using event data as template:', templateData);
      } else if (inventory && inventory.length > 0) {
        // Fallback to inventory data if event data is not available
        console.log('Using inventory data as template');
        
        // Log all inventory items to see their structure
        inventory.forEach((item, index) => {
          console.log(`Inventory item ${index}:`, item);
        });
        
        // Try different possible status values
        let first = inventory.find(item => item.ticketStatus === 'Active');
        if (!first) {
          first = inventory.find(item => item.ticketStatus === 'active');
        }
        if (!first) {
          first = inventory.find(item => item.status === 'Active');
        }
        if (!first) {
          first = inventory.find(item => item.status === 'active');
        }
        if (!first) {
          // If no status-based filtering works, just use the first item
          first = inventory[0];
          console.log('Using first inventory item as fallback:', first);
        }
        
        if (first) {
          templateData = first;
        }
      }
      
      if (!templateData) {
        alert('Unable to create pre-sale listing: No event or inventory data available');
        return;
      }

      // Calculate seats
      const seatStart = parseInt(presaleForm.seatStart);
      const quantity = parseInt(presaleForm.quantity);
      const seats = [];
      for (let i = 0; i < quantity; i++) {
        seats.push(seatStart + i);
      }

      // Build notes
      let note = presaleForm.retailNote;
      let notePrivate = '';
      
      // Add purchase date to notes
      const today = new Date();
      const purchaseDate = `${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getDate().toString().padStart(2, '0')}/${today.getFullYear()}`;
      const purchaseDateText = `Purchase Date: ${purchaseDate}`;
      note = note ? `${note}\n\n${purchaseDateText}` : purchaseDateText;
      
      // Add pass type to notes
      if (presaleForm.passType) {
        const passText = `${presaleForm.passType} Pass Only`;
        note = note ? `${note}\n\n${passText}` : passText;
        // Extract the number from pass type (e.g., "2-day" -> "2")
        const dayMatch = presaleForm.passType.match(/(\d+)/);
        if (dayMatch) {
          const days = dayMatch[1];
          notePrivate = `@[${days}-Day]`;
        } else {
          notePrivate = `@[${presaleForm.passType}]`;
        }
      }

      // Add shipping note for UPS/Fedex
      if (presaleForm.shippingMethod === 1) {
        const shippingNote = 'Hard Stock Shipping Only';
        note = note ? `${note}\n\n${shippingNote}` : shippingNote;
        notePrivate = notePrivate ? `${notePrivate}\n\n${shippingNote}` : shippingNote;
      }

      // Build tags
      const baseTags = ['Festival', 'pre-sale', 'TR'];
      const additionalTags = presaleForm.tags.split(',').map(tagItem => tagItem.trim()).filter(tag => tag);
      const allTags = [...baseTags, ...additionalTags];

      // Get current timestamp in ISO format
      const now = new Date().toISOString();
      

      
      // Format event date properly - ensure it's in YYYY-MM-DD format
      let eventDate = '';
      if (templateData.eventDate) {
        // If it's already in YYYY-MM-DD format, use it as is
        if (/^\d{4}-\d{2}-\d{2}$/.test(templateData.eventDate)) {
          eventDate = templateData.eventDate;
        } else {
          // Try to parse and format the date
          try {
            const date = new Date(templateData.eventDate);
            if (!isNaN(date.getTime())) {
              eventDate = date.toISOString().split('T')[0];
            }
          } catch (e) {
            console.error('Error parsing event date:', e);
          }
        }
      }
      
      // If we still don't have a valid date, use today's date as fallback
      if (!eventDate) {
        eventDate = new Date().toISOString().split('T')[0];
      }
      
      // Format event time properly
      let eventTime = '00:00:00';
      if (templateData.eventTime) {
        // If it's already in HH:MM:SS format, use it as is
        if (/^\d{2}:\d{2}:\d{2}$/.test(templateData.eventTime)) {
          eventTime = templateData.eventTime;
        } else {
          // Try to extract time from ISO string or other formats
          const timeMatch = templateData.eventTime.match(/(\d{2}):(\d{2}):(\d{2})/);
          if (timeMatch) {
            eventTime = timeMatch[0];
          }
        }
      }
      

      
      const listingData = {
        listings: [{
          eventId: parseInt(templateData.eventId),
          vendorId: parseInt(templateData.vendorId || 1),
          eventStubHubId: templateData.eventStubHubId ? parseInt(templateData.eventStubHubId) : 1,
          eventTicketmasterId: templateData.eventTicketmasterId ? parseInt(templateData.eventTicketmasterId) : 1,
          performerId: templateData.performerId ? parseInt(templateData.performerId) : 1,
          eventDate: eventDate,
          eventTime: eventTime,
          eventName: templateData.eventName,
          venueName: templateData.venueName,
          venueCity: templateData.venueCity || '',
          venueState: templateData.venueState || '',
          section: presaleForm.section,
          row: presaleForm.row,
          seats: seats,
          availableNow: quantity,
          tokenType: 'barcode',
          inhandNow: false,
          inhandDate: presaleForm.inHandDate,
          seatsShow: true,
          shippingMethod: presaleForm.shippingMethod,
          eticket: presaleForm.shippingMethod === 3,
          barcode: true,
          stubhubLms: true,
          ticketmasterLmd: true,
          seatgeekLmt: true,
          inventoryType: 1,
          lockInventory: true,
          split: "1",
          sellPrice: 0,
          costPrice: 0,
          retailPrice: 0,
          facePrice: 0,
          oversPrice: 0,
          note: note,
          notePrivate: notePrivate,
          noteBrokers: '',
          externalId: '',
          extLastUpdate: now,
          extBatchId: '',
          generalAdmission: false,
          defaultBroadcast: true,
          b2bEligibility: true,
          tags: allTags,
          relistTransactionId: 1,
          disclosures: [],
          createPurchaseOrder: false
        }]
      };

      const response = await apiService.createListing(listingData);
      if (response?.resultStatus) {
        alert('Pre-sale listing created successfully!');
        setShowPresaleModal(false);
        setPresaleForm({
          section: '',
          row: '',
          seatStart: '',
          quantity: '',
          shippingMethod: 1,
          inHandDate: '',
          retailNote: '',
          tags: '',
          passType: ''
        });
        // Refresh the inventory data without full page reload
        // The parent component should handle refreshing the data
      } else {
        alert('Failed to create listing: ' + (response?.resultMessage || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating pre-sale listing:', error);
      alert('Error creating listing: ' + error.message);
    }
  };

  // --- Listed For Sale Section ---
  // Try to get event IDs from the first inventory item
  const first = (inventory || []).find(item => item.ticketStatus === 'Active');
  const stubHubId = first?.eventStubHubId;
  const vividId = first?.eventVividSeatsId;
  const seatGeekId = first?.eventTicketNetworkId;
  const eventId = first?.eventId || '';
  const stubHubCustom = marketplaceLinks.stubhub || '';
  const vividCustom = marketplaceLinks.vivid || '';
  const seatGeekCustom = marketplaceLinks.seatgeek || '';

  return (
    <div className="mb-10">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-md font-bold text-gray-900">Listed For Sale</h3>
          <button
            onClick={() => setShowPresaleModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm font-medium"
          >
            +pre-sale listing
          </button>
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          <a
            href={stubHubId ? `https://www.stubhub.com/event/${stubHubId}` : (stubHubCustom || undefined)}
            target="_blank"
            rel="noopener noreferrer"
            className={`px-3 py-1 rounded-md text-sm font-medium ${stubHubId || stubHubCustom ? 'bg-purple-700 hover:bg-purple-800 text-white' : 'bg-gray-200 text-gray-500 cursor-pointer'}`}
            tabIndex={stubHubId || stubHubCustom ? 0 : 0}
            aria-disabled={!stubHubId && !stubHubCustom}
            onClick={e => { if (!stubHubId && !stubHubCustom) { e.preventDefault(); setShowMarketplaceModal({ type: 'stubhub', eventId }); setCustomMarketplaceLink(''); setMarketplaceEventId(eventId); } }}
            title={stubHubId || stubHubCustom ? 'View on StubHub' : 'Not available'}
          >
            View on StubHub
          </a>
          <a
            href={vividCustom || undefined}
            target="_blank"
            rel="noopener noreferrer"
            className={`px-3 py-1 rounded-md text-sm font-medium ${vividCustom ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-gray-200 text-gray-500 cursor-pointer'}`}
            tabIndex={vividCustom ? 0 : 0}
            aria-disabled={!vividCustom}
            onClick={e => { if (!vividCustom) { e.preventDefault(); setShowMarketplaceModal({ type: 'vivid', eventId }); setCustomMarketplaceLink(''); setMarketplaceEventId(eventId); } }}
            title={vividCustom ? 'View on Vivid Seats' : 'Not available'}
          >
            View on Vivid Seats
          </a>
          <a
            href={seatGeekCustom || undefined}
            target="_blank"
            rel="noopener noreferrer"
            className={`px-3 py-1 rounded-md text-sm font-medium ${seatGeekCustom ? 'bg-green-700 hover:bg-green-800 text-white' : 'bg-gray-200 text-gray-500 cursor-pointer'}`}
            tabIndex={seatGeekCustom ? 0 : 0}
            aria-disabled={!seatGeekCustom}
            onClick={e => { if (!seatGeekCustom) { e.preventDefault(); setShowMarketplaceModal({ type: 'seatgeek', eventId }); setCustomMarketplaceLink(''); setMarketplaceEventId(eventId); } }}
            title={seatGeekCustom ? 'View on SeatGeek' : 'Not available'}
          >
            View on SeatGeek
          </a>
        </div>
        {/* Marketplace Modal */}
        {showMarketplaceModal && (() => {
          const eventName = first?.eventName || 'this event';
          const marketName = showMarketplaceModal.type === 'stubhub' ? 'StubHub' : showMarketplaceModal.type === 'vivid' ? 'Vivid Seats' : 'SeatGeek';
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
              <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
                <h2 className="text-lg font-bold mb-2">{marketName} Link Not Found for {eventName}</h2>
                <p className="mb-4">We couldn't find a link for this event on {marketName}.<br/>If you know the correct link, please enter it below. This will be saved for future use.</p>
                <input
                  type="text"
                  className="border border-gray-300 rounded-md px-2 py-1 w-full mb-4"
                  placeholder="Paste full event link here..."
                  value={customMarketplaceLink}
                  onChange={e => setCustomMarketplaceLink(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <button
                    className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                    onClick={() => setShowMarketplaceModal(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2 rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
                    disabled={!customMarketplaceLink.trim()}
                    onClick={async () => {
                      try {
                        await userDataService.setCustomMarketplaceLink(marketplaceEventId, showMarketplaceModal.type, customMarketplaceLink.trim());
                        // Update local state
                        setMarketplaceLinks(prev => ({
                          ...prev,
                          [showMarketplaceModal.type]: customMarketplaceLink.trim()
                        }));
                        setShowMarketplaceModal(null);
                      } catch (error) {
                        console.error('Failed to save marketplace link:', error);
                        setShowMarketplaceModal(null);
                      }
                    }}
                  >
                    Save Link
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
        <div className="overflow-x-auto mt-4">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Section</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Listing View</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Private Note</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Autopriced?</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {((inventory || []).filter(item => item.availableNow > 0 && item.ticketStatus === 'Active').length === 0) ? (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-gray-500 italic">No tickets listed for sale</td>
                </tr>
              ) : (
                (inventory || [])
                  .filter(item => {
                    // Only show listings with availableNow > 0 and ticketStatus === 'Active'
                    return item.availableNow > 0 && item.ticketStatus === 'Active';
                  })
                  .map((item, idx) => {
                    // Determine status for this listing
                    const tags = (item.tags || []).map(tagItem => tagItem.replace(/[-\s]/g, '').toLowerCase());
                    let status = 'Good Tickets';
                    if (tags.includes('presale') || tags.includes('pre-sale') || tags.includes('presell')) {
                      status = 'Presale';
                    } else if (tags.includes('concern') || tags.includes('concerned')) {
                      status = 'Concern';
                    } else if (tags.includes('delivered')) {
                      status = 'In Hand';
                    } else if ((tags.includes('tndelivered') || tags.includes('tndelivered')) && !tags.includes('delivered')) {
                      status = 'TN Delivered';
                    } else if ((tags.includes('tngiven') || tags.includes('tngiven')) && !tags.includes('delivered') && !tags.includes('tndelivered')) {
                      status = 'En Route';
                    }
                    // Only show Good Tickets if no other status applies
                    if (status === 'Good Tickets' && (tags.includes('concern') || tags.includes('concerned') || tags.includes('delivered') || tags.includes('tndelivered') || tags.includes('tngiven'))) {
                      return null;
                    }
                    // Get private note
                    const privateNote = item.notePrivate || item.privateNotes || item.privateNote || item.private_notes || item.notes || '';
                    // Get price
                    const price = item.price ?? item.listPrice ?? item.amount ?? '';
                    return (
                      <tr key={idx}>
                        <td className="px-4 py-2 whitespace-nowrap">{item.section || '(No Section)'}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{item.availableNow || 0}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{status}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{price !== '' ? `$${price}` : <span className="italic text-gray-400">(none)</span>}</td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <ListingMarketplaceButtons item={item} onShowModal={setShowListingMarketplaceModal} />
                        </td>
                        <td className="px-4 py-2 whitespace-normal max-w-xs">{renderPrivateNote(privateNote)}</td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              const newValue = !(autopricedListings[item.id] || false);
                              try {
                                await userDataService.setAutopricedListing(item.id, newValue);
                                setAutopricedListings(prev => ({
                                  ...prev,
                                  [item.id]: newValue
                                }));
                              } catch (error) {
                                console.error('Failed to update autopriced status:', error);
                              }
                            }}
                            className={`p-2 rounded transition-colors duration-200 ${
                              autopricedListings[item.id] 
                                ? 'text-green-500 hover:text-green-600 bg-green-100 hover:bg-green-200' 
                                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                            }`}
                            title={autopricedListings[item.id] ? 'Mark as not autopriced' : 'Mark as autopriced'}
                          >
                            <Check size={20} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
        {showListingMarketplaceModal && (() => {
          const marketName = showListingMarketplaceModal.type === 'stubhub' ? 'StubHub' : showListingMarketplaceModal.type === 'vivid' ? 'Vivid Seats' : 'SeatGeek';
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
              <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
                <h2 className="text-lg font-bold mb-2">Insert the {marketName} listing link</h2>
                <input
                  type="text"
                  className="border border-gray-300 rounded-md px-2 py-1 w-full mb-4"
                  placeholder={`Paste the ${marketName} listing link here...`}
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
                    onClick={async () => {
                      try {
                        await userDataService.setCustomListingLink(showListingMarketplaceModal.listingId, showListingMarketplaceModal.type, customListingMarketplaceLink.trim());
                        setShowListingMarketplaceModal(null);
                      } catch (error) {
                        console.error('Failed to save listing link:', error);
                        setShowListingMarketplaceModal(null);
                      }
                    }}
                  >
                    Save Link
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
        
        {/* Pre-sale Listing Modal */}
        {showPresaleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-bold mb-4">Create Pre-sale Listing</h2>
              
              {/* Event Information */}
              {(() => {
                // Try to get event info from the event prop first
                if (event) {
                  console.log('Event data in modal:', event);
                  console.log('Formatted event name:', formatEventName(event));
                  return (
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <h3 className="font-semibold text-gray-900 mb-2">{formatEventName(event)}</h3>
                      <div className="text-xs text-gray-500">
                        <span className="mr-4">Event ID: {event.id}</span>
                        <span>Venue: {event.venue?.name || 'Unknown'}</span>
                      </div>
                    </div>
                  );
                }
                
                // Fallback to inventory data if event prop is not available
                const first = inventory?.find(item => item.ticketStatus === 'Active');
                if (first) {
                  console.log('Using inventory data, first item:', first);
                  // Create a mock event object for formatting
                  const mockEvent = {
                    name: first.eventName,
                    eventDescription: first.eventDescription
                  };
                  console.log('Mock event object:', mockEvent);
                  console.log('Formatted event name from inventory:', formatEventName(mockEvent));
                  return (
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <h3 className="font-semibold text-gray-900 mb-2">{formatEventName(mockEvent)}</h3>
                      <div className="text-xs text-gray-500">
                        <span className="mr-4">Event ID: {first.eventId}</span>
                        <span>Venue: {first.venueName || 'Unknown'}</span>
                      </div>
                    </div>
                  );
                }
                
                // If neither is available, show a placeholder
                return (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-2">Event Information</h3>
                    <p className="text-sm text-gray-600 mb-2">Loading event details...</p>
                    <div className="text-xs text-gray-500">
                      <span>Event details will appear here</span>
                    </div>
                  </div>
                );
              })()}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Section *</label>
                  <input
                    type="text"
                    value={presaleForm.section}
                    onChange={(e) => setPresaleForm(prev => ({ ...prev, section: e.target.value }))}
                    className="border border-gray-300 rounded-md px-3 py-2 w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Row</label>
                  <input
                    type="text"
                    value={presaleForm.row}
                    onChange={(e) => setPresaleForm(prev => ({ ...prev, row: e.target.value }))}
                    className="border border-gray-300 rounded-md px-3 py-2 w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Seat Start *</label>
                  <input
                    type="number"
                    value={presaleForm.seatStart}
                    onChange={(e) => setPresaleForm(prev => ({ ...prev, seatStart: e.target.value }))}
                    className="border border-gray-300 rounded-md px-3 py-2 w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                  <input
                    type="number"
                    value={presaleForm.quantity}
                    onChange={(e) => setPresaleForm(prev => ({ ...prev, quantity: e.target.value }))}
                    className="border border-gray-300 rounded-md px-3 py-2 w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Method *</label>
                  <select
                    value={presaleForm.shippingMethod}
                    onChange={(e) => setPresaleForm(prev => ({ ...prev, shippingMethod: parseInt(e.target.value) }))}
                    className="border border-gray-300 rounded-md px-3 py-2 w-full"
                    required
                  >
                    <option value={1}>1 - UPS/Fedex</option>
                    <option value={3}>3 - PDF</option>
                    <option value={4}>4 - Ticketmaster Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">In Hand Date *</label>
                  <input
                    type="date"
                    value={presaleForm.inHandDate}
                    onChange={(e) => setPresaleForm(prev => ({ ...prev, inHandDate: e.target.value }))}
                    className="border border-gray-300 rounded-md px-3 py-2 w-full"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pass Type</label>
                  <select
                    value={presaleForm.passType}
                    onChange={(e) => setPresaleForm(prev => ({ ...prev, passType: e.target.value }))}
                    className="border border-gray-300 rounded-md px-3 py-2 w-full"
                  >
                    <option value="">Select pass type...</option>
                    <option value="2-day">2-day pass</option>
                    <option value="3-day">3-day pass</option>
                    <option value="4-day">4-day pass</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Retail Note</label>
                  <textarea
                    value={presaleForm.retailNote}
                    onChange={(e) => setPresaleForm(prev => ({ ...prev, retailNote: e.target.value }))}
                    className="border border-gray-300 rounded-md px-3 py-2 w-full h-20"
                    placeholder="Additional notes..."
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Additional Tags</label>
                  <input
                    type="text"
                    value={presaleForm.tags}
                    onChange={(e) => setPresaleForm(prev => ({ ...prev, tags: e.target.value }))}
                    className="border border-gray-300 rounded-md px-3 py-2 w-full"
                    placeholder="Comma-separated tags (Festival, pre-sale, TR will be added automatically)"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                  onClick={() => setShowPresaleModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                  disabled={!presaleForm.section || !presaleForm.seatStart || !presaleForm.quantity || !presaleForm.inHandDate}
                  onClick={createPresaleListing}
                >
                  Create Listing
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Sales Breakdown Section */}
        <div className="mt-10 pt-10 border-t border-gray-200">
          <h3 className="text-md font-bold text-gray-900 mb-4">Sales Breakdown</h3>
          <SalesBreakdownChart sales={sales} manualCategories={manualCategories} />
        </div>
      </div>
    </div>
  );
};

// Separate component for listing marketplace buttons to handle state properly
const ListingMarketplaceButtons = ({ item, onShowModal }) => {
  const [listingLinks, setListingLinks] = useState({});

  useEffect(() => {
    async function loadListingLinks() {
      try {
        const links = await userDataService.getCustomListingLinks(item.id);
        setListingLinks(links);
      } catch (error) {
        console.error('Failed to load listing links:', error);
      }
    }
    loadListingLinks();
  }, [item.id]);

  return (
    <div className="flex gap-1">
      {['stubhub', 'vivid', 'seatgeek'].map((market, i) => {
        const marketInfo = {
          stubhub: { label: 'SH', color: 'bg-purple-600 hover:bg-purple-700', name: 'StubHub' },
          vivid: { label: 'VS', color: 'bg-red-500 hover:bg-red-600', name: 'Vivid Seats' },
          seatgeek: { label: 'SG', color: 'bg-green-600 hover:bg-green-700', name: 'SeatGeek' },
        }[market];
        const link = listingLinks[market];
        if (link) {
          return (
            <a
              key={market}
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className={`px-2 py-1 ${marketInfo.color} text-white rounded text-xs font-semibold shadow-sm transition`}
              title={`View on ${marketInfo.name}`}
            >
              {marketInfo.label}
            </a>
          );
        } else {
          return (
            <button
              key={market}
              className="px-2 py-1 bg-gray-300 text-gray-500 rounded text-xs font-semibold cursor-pointer"
              title={`Add ${marketInfo.name} link`}
              onClick={() => {
                onShowModal({ type: market, eventId: item.eventId, listingId: item.id });
              }}
            >
              {marketInfo.label}
            </button>
          );
        }
      })}
    </div>
  );
};

export default ListedForSaleAndSalesBreakdown; 