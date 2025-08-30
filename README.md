# Festival Reports Dashboard

A modern React dashboard for viewing event inventory and sales data using the ZeroHero API.

## Features

- 🔍 **Event Search**: Enter any event ID to view detailed information
- 📊 **Inventory Tracking**: See active inventory count for events
- 💰 **Sales Analytics**: View total sales orders for events
- 🎯 **Section Breakdown**: Categorized inventory by ticket types:
  - **SHUTTLE**: Sections containing "shuttle"
  - **VIP**: Sections containing "vip"
  - **GA+**: Sections containing "ga plus" or "ga+"
  - **GA**: General admission sections (without + or plus)
  - **Uncategorized**: Sections that don't match any category
- ⏰ **Automatic Unverification**: Set dates for listings to be automatically unverified
- 📱 **Responsive Design**: Works on desktop and mobile devices
- ⚡ **Modern UI**: Built with React, Tailwind CSS, and Lucide icons

## Quick Start

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. **Clone or download the project files**

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:3000`

## Usage

1. **Enter an Event ID**: Use the search form to enter any event ID from your ZeroHero account
2. **View Event Details**: See event name, date, venue, and basic information
3. **Check Inventory**: View total active inventory count and breakdown by ticket types
4. **Monitor Sales**: Track total sales orders for the event

## API Configuration

The dashboard uses your ZeroHero API key (`H0SN5VnR3P`) to fetch data from the following endpoints:

- `/v1/events` - Event information
- `/v1/listings` - Inventory data
- `/v1/orders/sales` - Sales orders

## Section Categorization Logic

The dashboard automatically categorizes inventory sections based on the following rules:

```javascript
if (section.includes("shuttle"))      type = "SHUTTLE";
else if (section.includes("vip"))     type = "VIP";
else if (section.includes("ga plus" or ga+)) type = "GA_PLUS"
else if (section.includes("ga or general admission without + or plus")) type = "GA"
else type = "uncategorized"
```

## Automatic Unverification Feature

The dashboard includes an advanced inventory management system with automatic unverification capabilities:

### How It Works

1. **Clock Icon**: Each listing has a clock icon (⏰) next to the verify/unverify button
2. **Set Date**: Click the clock icon to open a modal where you can set an unverification date
3. **Automatic Process**: On the specified date, the listing will be automatically unverified
4. **Visual Indicators**: Unverification dates are displayed with blue badges showing "Auto-unverify: MM/DD/YYYY"

### Use Cases

- **Event Planning**: Set listings to unverify after a certain date
- **Inventory Management**: Automatically remove verification status for expired listings
- **Bulk Operations**: Select multiple listings and set the same unverification date for all

### Features

- **Individual Dates**: Set different unverification dates for each listing
- **Bulk Operations**: Set the same date for multiple selected listings
- **Auto-Cleanup**: Expired unverification dates are automatically removed
- **Persistent Storage**: Dates are saved to the database and persist across sessions
- **Real-time Updates**: Changes are reflected immediately in the UI

### Technical Details

- Unverification dates are stored in a dedicated database table
- The system checks for expired dates every hour
- Automatic unverification happens when the current date matches or exceeds the set date
- All operations support both backend API and localStorage fallback

## Project Structure

```
src/
├── components/
│   ├── EventSearch.jsx      # Search form component
│   ├── EventDetails.jsx     # Event information display
│   ├── SectionBreakdown.jsx # Inventory breakdown by type
│   ├── InventoryManagement.jsx # Inventory verification and unverification
│   └── ErrorDisplay.jsx     # Error handling component
├── services/
│   └── userDataService.js   # User data management service
├── utils/
│   └── sectionCategorizer.js # Section categorization logic
├── api.js                   # API service functions
├── App.jsx                  # Main application component
└── main.jsx                 # Application entry point
```

## Technologies Used

- **React 18** - Frontend framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Icon library
- **Axios** - HTTP client for API calls
- **Express** - Proxy server for CORS handling

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Proxy Server

The application includes a proxy server (`server.js`) to handle CORS issues when calling the ZeroHero API from the browser. The proxy server runs on port 3001.

## Troubleshooting

### Common Issues

1. **Network Error**: Make sure both the React dev server (port 3000) and proxy server (port 3001) are running
2. **421 Error**: The proxy server should handle this automatically
3. **No Data**: Verify your event ID exists in your ZeroHero account

### API Errors

If you encounter API errors, check:
- Your ZeroHero API key is valid
- The event ID exists in your account
- Your account has access to the requested data

## License

This project is for internal use with the ZeroHero API. 