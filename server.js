import express from 'express';
import cors from 'cors';
import axios from 'axios';
import bcrypt from 'bcrypt';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from './config.js';
import {
  initDatabase,
  createUser,
  getUserByEmail,
  getUserById,
  updateUser,
  deleteUser,
  toggleAdminStatus,
  updateLastLogin,
  getAllUsers,
  updateUserPassword,
  getBookmarks,
  addBookmark,
  removeBookmark,
  getCustomMarketplaceLinks,
  setCustomMarketplaceLink,
  getCustomListingLinks,
  setCustomListingLink,
  getManualCategories,
  setManualCategory,
  deleteManualCategory,
  getAutopricedListings,
  setAutopricedListing,
  getListingTags,
  addListingTag,
  removeListingTag,
  addBulkListingTags,
  getUnverificationDates,
  setUnverificationDate,
  removeUnverificationDate,
  getVerificationMappedListings,
  addVerificationMappedListing,
  removeVerificationMappedListing,
  getVerificationStrategyListings,
  addVerificationStrategyListing,
  removeVerificationStrategyListing,
  getVerificationStrategyDates,
  setVerificationStrategyDate,
  removeVerificationStrategyDate,
  getThreeDayMappedListings,
  addThreeDayMappedListing,
  removeThreeDayMappedListing,
  getThreeDayStrategyListings,
  addThreeDayStrategyListing,
  removeThreeDayStrategyListing,
  getGlobalVerificationMappedListings,
  addGlobalVerificationMappedListing,
  removeGlobalVerificationMappedListing,
  getGlobalVerificationStrategyListings,
  addGlobalVerificationStrategyListing,
  removeGlobalVerificationStrategyListing,
  getGlobalVerificationStrategyDates,
  setGlobalVerificationStrategyDate,
  removeGlobalVerificationStrategyDate,
  getGlobalThreeDayMappedListings,
  addGlobalThreeDayMappedListing,
  removeGlobalThreeDayMappedListing,
  getGlobalThreeDayStrategyListings,
  addGlobalThreeDayStrategyListing,
  removeGlobalThreeDayStrategyListing,
  getStarredFestivalMappedListings,
  addStarredFestivalMappedListing,
  removeStarredFestivalMappedListing,
  getStarredFestivalStrategyListings,
  addStarredFestivalStrategyListing,
  removeStarredFestivalStrategyListing,
  getStarredFestivalStrategyDates,
  setStarredFestivalStrategyDate,
  removeStarredFestivalStrategyDate
} from './database-mongo.js';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: config.security.corsOrigin,
    methods: ["GET", "POST"]
  }
});
const PORT = config.server.port;

// Check if required environment variables are set
if (!config.zeroHero.apiKey) {
  console.error('❌ ZERO_HERO_API_KEY environment variable is required but not set');
  console.error('Please set ZERO_HERO_API_KEY in your .env file');
  process.exit(1);
}

// Initialize database
try {
  await initDatabase();
  console.log('✅ Database initialized successfully');
} catch (error) {
  console.error('⚠️  Database initialization failed:', error.message);
  console.log('🔄 Server will continue without database (some features may not work)');
}

// Enable CORS with restrictions
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001', 
    'http://localhost:3002',
    'http://localhost:3003',
    'http://localhost:3004',
    'http://localhost:3010',
    'https://festival-reports-dashboard.vercel.app',
    'https://festival-reports-dashboard-6bjzrdpdb-bryce-wilsons-projects.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'x-username', 'Authorization']
}));
app.use(express.json());

// Rate limiting configuration
import rateLimit from 'express-rate-limit';

// Spike arrest: 1,000 calls per second
const spikeArrestLimiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 1000, // limit each IP to 1000 requests per second
  message: 'Spike arrest: Too many requests per second, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Per-minute limits: 2,000 calls per minute for each method
const getLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 2000, // limit each IP to 2000 GET requests per minute
  message: 'Too many GET requests per minute, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method !== 'GET',
});

const postLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 2000, // limit each IP to 2000 POST requests per minute
  message: 'Too many POST requests per minute, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method !== 'POST',
});

const patchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 2000, // limit each IP to 2000 PATCH requests per minute
  message: 'Too many PATCH requests per minute, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method !== 'PATCH',
});

// Apply all rate limiters to all API endpoints
app.use('/api/', spikeArrestLimiter); // Spike arrest first
app.use('/api/', getLimiter);         // Then per-method limits
app.use('/api/', postLimiter);
app.use('/api/', patchLimiter);

// Request throttling for ZeroHero API calls
let lastApiCall = 0;
const API_CALL_DELAY = 500; // Increased to 500ms between API calls

// Request queue to prevent parallel API calls
let requestQueue = [];
let isProcessingQueue = false;

const processQueue = async () => {
  if (isProcessingQueue || requestQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  while (requestQueue.length > 0) {
    const { resolve, reject, fn } = requestQueue.shift();
    
    try {
      await throttleApiCall();
      const result = await fn();
      resolve(result);
    } catch (error) {
      reject(error);
    }
  }
  
  isProcessingQueue = false;
};

const queueApiCall = (fn) => {
  return new Promise((resolve, reject) => {
    requestQueue.push({ resolve, reject, fn });
    processQueue();
  });
};

const throttleApiCall = () => {
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCall;
  
  if (timeSinceLastCall < API_CALL_DELAY) {
    const delay = API_CALL_DELAY - timeSinceLastCall;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
  
  lastApiCall = now;
  return Promise.resolve();
};

// Rate limit tracking
let rateLimitCount = 0;
let lastRateLimitTime = 0;

const handleRateLimit = () => {
  const now = Date.now();
  if (now - lastRateLimitTime > 60000) { // Reset counter after 1 minute
    rateLimitCount = 0;
  }
  
  rateLimitCount++;
  lastRateLimitTime = now;
  
  // Exponential backoff: wait longer each time we hit rate limits
  const backoffDelay = Math.min(1000 * Math.pow(2, rateLimitCount - 1), 10000);
  console.log(`Rate limit hit ${rateLimitCount} times, backing off for ${backoffDelay}ms`);
  
  return new Promise(resolve => setTimeout(resolve, backoffDelay));
};

// JWT token verification middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  try {
    // In production, verify JWT token here
    // For now, we'll use a simple token validation
    const user = await getUserById(token);
    if (!user) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(403).json({ error: 'Invalid token' });
  }
};

// Admin-only middleware
const requireAdmin = (req, res, next) => {
  if (!req.user.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Simple authentication middleware (you can enhance this)
const authenticateUser = async (req, res, next) => {
  const username = req.headers['x-username'];
  if (!username) {
    return res.status(401).json({ error: 'Username required' });
  }
  
  try {
    let user = await getUserByEmail(username);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Create axios instance for ZeroHero API with proper security
const zeroHeroApi = axios.create({
  timeout: 10000,
  headers: {
    'User-Agent': 'Festival-Reports-Dashboard/1.0',
    'Accept': 'application/json',
    'Broker-Key': config.zeroHero.apiKey
  }
});

// Authentication endpoints
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Verify password using bcrypt
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Update last login
    await updateLastLogin(user.id);
    
    // In production, generate JWT token here
    // For now, use user ID as token
    const token = user.id.toString();
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        isAdmin: Boolean(user.is_admin),
        createdAt: user.created_at,
        lastLogin: user.last_login
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Admin user management endpoints
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await getAllUsers();
    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { email, password, isAdmin } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    // Hash the password using bcrypt
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = await createUser(email, passwordHash, isAdmin || false);
    
    res.json({ 
      success: true, 
      message: 'User created successfully',
      userId 
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.put('/api/admin/users/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const userData = req.body;
    
    await updateUser(userId, userData);
    
    res.json({ 
      success: true, 
      message: 'User updated successfully' 
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

app.delete('/api/admin/users/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    await deleteUser(userId);
    
    res.json({ 
      success: true, 
      message: 'User deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

app.patch('/api/admin/users/:userId/admin', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    await toggleAdminStatus(userId);
    
    res.json({ 
      success: true, 
      message: 'Admin status toggled successfully' 
    });
  } catch (error) {
    console.error('Error toggling admin status:', error);
    res.status(500).json({ error: 'Failed to toggle admin status' });
  }
});

app.patch('/api/admin/users/:userId/password', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { password } = req.body;
    
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    // Hash the new password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Update the user's password in the database
    await updateUserPassword(userId, passwordHash);
    
    res.json({ 
      success: true, 
      message: 'Password changed successfully' 
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// User data endpoints
app.get('/api/user/bookmarks', authenticateUser, async (req, res) => {
  try {
    const bookmarks = await getBookmarks(req.user.id);
    res.json({ bookmarks });
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    res.status(500).json({ error: 'Failed to fetch bookmarks' });
  }
});

app.post('/api/user/bookmarks', authenticateUser, async (req, res) => {
  try {
    const { eventId } = req.body;
    if (!eventId) {
      return res.status(400).json({ error: 'Event ID required' });
    }
    
    const success = await addBookmark(req.user.id, eventId);
    if (success) {
      // Emit global update for real-time synchronization
      emitGlobalUpdate('bookmark-added', { eventId, userId: req.user.id });
    }
    res.json({ success, message: success ? 'Bookmark added' : 'Already bookmarked' });
  } catch (error) {
    console.error('Error adding bookmark:', error);
    res.status(500).json({ error: 'Failed to add bookmark' });
  }
});

app.delete('/api/user/bookmarks/:eventId', authenticateUser, async (req, res) => {
  try {
    const { eventId } = req.params;
    const success = await removeBookmark(req.user.id, eventId);
    if (success) {
      // Emit global update for real-time synchronization
      emitGlobalUpdate('bookmark-removed', { eventId, userId: req.user.id });
    }
    res.json({ success, message: success ? 'Bookmark removed' : 'Bookmark not found' });
  } catch (error) {
    console.error('Error removing bookmark:', error);
    res.status(500).json({ error: 'Failed to remove bookmark' });
  }
});

app.get('/api/user/marketplace-links/:eventId', authenticateUser, async (req, res) => {
  try {
    const { eventId } = req.params;
    const links = await getCustomMarketplaceLinks(req.user.id, eventId);
    res.json({ links });
  } catch (error) {
    console.error('Error fetching marketplace links:', error);
    res.status(500).json({ error: 'Failed to fetch marketplace links' });
  }
});

app.post('/api/user/marketplace-links/:eventId', authenticateUser, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { marketplaceType, link } = req.body;
    
    if (!marketplaceType || !link) {
      return res.status(400).json({ error: 'Marketplace type and link required' });
    }
    
    await setCustomMarketplaceLink(req.user.id, eventId, marketplaceType, link);
    // Emit global update for real-time synchronization
    emitGlobalUpdate('marketplace-link-updated', { eventId, userId: req.user.id, marketplaceType, link });
    res.json({ success: true, message: 'Marketplace link saved' });
  } catch (error) {
    console.error('Error saving marketplace link:', error);
    res.status(500).json({ error: 'Failed to save marketplace link' });
  }
});

app.get('/api/user/listing-links/:listingId', authenticateUser, async (req, res) => {
  try {
    const { listingId } = req.params;
    const links = await getCustomListingLinks(req.user.id, listingId);
    res.json({ links });
  } catch (error) {
    console.error('Error fetching listing links:', error);
    res.status(500).json({ error: 'Failed to fetch listing links' });
  }
});

app.post('/api/user/listing-links/:listingId', authenticateUser, async (req, res) => {
  try {
    const { listingId } = req.params;
    const { marketplaceType, link } = req.body;
    
    if (!marketplaceType || !link) {
      return res.status(400).json({ error: 'Marketplace type and link required' });
    }
    
    await setCustomListingLink(req.user.id, listingId, marketplaceType, link);
    // Emit global update for real-time synchronization
    emitGlobalUpdate('listing-link-updated', { listingId, userId: req.user.id, marketplaceType, link });
    res.json({ success: true, message: 'Listing link saved' });
  } catch (error) {
    console.error('Error saving listing link:', error);
    res.status(500).json({ error: 'Failed to save listing link' });
  }
});

app.get('/api/user/manual-categories', authenticateUser, async (req, res) => {
  try {
    const categories = await getManualCategories(req.user.id);
    res.json({ categories });
  } catch (error) {
    console.error('Error fetching manual categories:', error);
    res.status(500).json({ error: 'Failed to fetch manual categories' });
  }
});

app.post('/api/user/manual-categories', authenticateUser, async (req, res) => {
  try {
    const { section, category } = req.body;
    
    if (!section || !category) {
      return res.status(400).json({ error: 'Section and category required' });
    }
    
    await setManualCategory(req.user.id, section, category);
    // Emit global update for real-time synchronization
    emitGlobalUpdate('manual-category-updated', { section, category, userId: req.user.id });
    res.json({ success: true, message: 'Manual category saved' });
  } catch (error) {
    console.error('Error saving manual category:', error);
    res.status(500).json({ error: 'Failed to save manual category' });
  }
});

app.delete('/api/user/manual-categories/:section', authenticateUser, async (req, res) => {
  try {
    const { section } = req.params;
    await deleteManualCategory(req.user.id, section);
    // Emit global update for real-time synchronization
    emitGlobalUpdate('manual-category-deleted', { section, userId: req.user.id });
    res.json({ success: true, message: 'Manual category deleted' });
  } catch (error) {
    console.error('Error deleting manual category:', error);
    res.status(500).json({ error: 'Failed to delete manual category' });
  }
});

app.get('/api/user/autopriced-listings', authenticateUser, async (req, res) => {
  try {
    const listings = await getAutopricedListings(req.user.id);
    res.json({ listings });
  } catch (error) {
    console.error('Error fetching autopriced listings:', error);
    res.status(500).json({ error: 'Failed to fetch autopriced listings' });
  }
});

app.post('/api/user/autopriced-listings/:listingId', authenticateUser, async (req, res) => {
  try {
    const { listingId } = req.params;
    const { isAutopriced } = req.body;
    
    if (typeof isAutopriced !== 'boolean') {
      return res.status(400).json({ error: 'isAutopriced must be a boolean' });
    }
    
    await setAutopricedListing(req.user.id, listingId, isAutopriced);
    // Emit global update for real-time synchronization
    emitGlobalUpdate('autopriced-listing-updated', { listingId, isAutopriced, userId: req.user.id });
    res.json({ success: true, message: 'Autopriced status saved' });
  } catch (error) {
    console.error('Error saving autopriced status:', error);
    res.status(500).json({ error: 'Failed to save autopriced status' });
  }
});

// Listing tags endpoints
app.get('/api/user/listing-tags', authenticateUser, async (req, res) => {
  try {
    const tags = await getListingTags(req.user.id);
    res.json({ tags });
  } catch (error) {
    console.error('Error fetching listing tags:', error);
    res.status(500).json({ error: 'Failed to fetch listing tags' });
  }
});

app.post('/api/user/listing-tags/:listingId', authenticateUser, async (req, res) => {
  try {
    const { listingId } = req.params;
    const { tag } = req.body;
    
    if (!tag || typeof tag !== 'string') {
      return res.status(400).json({ error: 'Tag must be a non-empty string' });
    }
    
    await addListingTag(req.user.id, listingId, tag.trim());
    // Emit global update for real-time synchronization
    emitGlobalUpdate('listing-tag-added', { listingId, tag: tag.trim(), userId: req.user.id });
    res.json({ success: true, message: 'Tag added' });
  } catch (error) {
    console.error('Error adding listing tag:', error);
    res.status(500).json({ error: 'Failed to add listing tag' });
  }
});

app.delete('/api/user/listing-tags/:listingId/:tag', authenticateUser, async (req, res) => {
  try {
    const { listingId, tag } = req.params;
    
    await removeListingTag(req.user.id, listingId, decodeURIComponent(tag));
    // Emit global update for real-time synchronization
    emitGlobalUpdate('listing-tag-removed', { listingId, tag: decodeURIComponent(tag), userId: req.user.id });
    res.json({ success: true, message: 'Tag removed' });
  } catch (error) {
    console.error('Error removing listing tag:', error);
    res.status(500).json({ error: 'Failed to remove listing tag' });
  }
});

app.post('/api/user/listing-tags/bulk', authenticateUser, async (req, res) => {
  try {
    const { listingIds, tag } = req.body;
    
    if (!Array.isArray(listingIds) || listingIds.length === 0) {
      return res.status(400).json({ error: 'listingIds must be a non-empty array' });
    }
    
    if (!tag || typeof tag !== 'string') {
      return res.status(400).json({ error: 'Tag must be a non-empty string' });
    }
    
    await addBulkListingTags(req.user.id, listingIds, tag.trim());
    res.json({ success: true, message: `Tag added to ${listingIds.length} listings` });
  } catch (error) {
    console.error('Error adding bulk listing tags:', error);
    res.status(500).json({ error: 'Failed to add bulk listing tags' });
  }
});

// Unverification dates endpoints
app.get('/api/user/unverification-dates', authenticateUser, async (req, res) => {
  try {
    const dates = await getUnverificationDates(req.user.id);
    res.json({ dates });
  } catch (error) {
    console.error('Error fetching unverification dates:', error);
    res.status(500).json({ error: 'Failed to fetch unverification dates' });
  }
});

app.post('/api/user/unverification-dates/:listingId', authenticateUser, async (req, res) => {
  try {
    const { listingId } = req.params;
    const { unverificationDate } = req.body;
    
    if (!unverificationDate) {
      return res.status(400).json({ error: 'Unverification date required' });
    }
    
    await setUnverificationDate(req.user.id, listingId, unverificationDate);
    res.json({ success: true, message: 'Unverification date saved' });
  } catch (error) {
    console.error('Error saving unverification date:', error);
    res.status(500).json({ error: 'Failed to save unverification date' });
  }
});

app.delete('/api/user/unverification-dates/:listingId', authenticateUser, async (req, res) => {
  try {
    const { listingId } = req.params;
    await removeUnverificationDate(req.user.id, listingId);
    res.json({ success: true, message: 'Unverification date removed' });
  } catch (error) {
    console.error('Error removing unverification date:', error);
    res.status(500).json({ error: 'Failed to remove unverification date' });
  }
});

// Verification mapped listings endpoints
app.get('/api/user/verification-mapped-listings', authenticateUser, async (req, res) => {
  try {
    const mappedListings = await getVerificationMappedListings(req.user.id);
    res.json({ success: true, mappedListings });
  } catch (error) {
    console.error('Error getting verification mapped listings:', error);
    res.status(500).json({ error: 'Failed to get verification mapped listings' });
  }
});

app.post('/api/user/verification-mapped-listings/:listingId', authenticateUser, async (req, res) => {
  try {
    const { listingId } = req.params;
    await addVerificationMappedListing(req.user.id, listingId);
    // Emit global update for real-time synchronization
    emitGlobalUpdate('verification-mapped-added', { listingId, userId: req.user.id });
    res.json({ success: true, message: 'Listing marked as mapped' });
  } catch (error) {
    console.error('Error adding verification mapped listing:', error);
    res.status(500).json({ error: 'Failed to mark listing as mapped' });
  }
});

app.delete('/api/user/verification-mapped-listings/:listingId', authenticateUser, async (req, res) => {
  try {
    const { listingId } = req.params;
    await removeVerificationMappedListing(req.user.id, listingId);
    // Emit global update for real-time synchronization
    emitGlobalUpdate('verification-mapped-removed', { listingId, userId: req.user.id });
    res.json({ success: true, message: 'Listing unmarked as mapped' });
  } catch (error) {
    console.error('Error removing verification mapped listing:', error);
    res.status(500).json({ error: 'Failed to unmark listing as mapped' });
  }
});

// Verification strategy listings endpoints
app.get('/api/user/verification-strategy-listings', authenticateUser, async (req, res) => {
  try {
    const strategyListings = await getVerificationStrategyListings(req.user.id);
    res.json({ success: true, strategyListings });
  } catch (error) {
    console.error('Error getting verification strategy listings:', error);
    res.status(500).json({ error: 'Failed to get verification strategy listings' });
  }
});

app.post('/api/user/verification-strategy-listings/:listingId', authenticateUser, async (req, res) => {
  try {
    const { listingId } = req.params;
    await addVerificationStrategyListing(req.user.id, listingId);
    // Emit global update for real-time synchronization
    emitGlobalUpdate('verification-strategy-added', { listingId, userId: req.user.id });
    res.json({ success: true, message: 'Listing marked for strategy' });
  } catch (error) {
    console.error('Error adding verification strategy listing:', error);
    res.status(500).json({ error: 'Failed to mark listing for strategy' });
  }
});

app.delete('/api/user/verification-strategy-listings/:listingId', authenticateUser, async (req, res) => {
  try {
    const { listingId } = req.params;
    await removeVerificationStrategyListing(req.user.id, listingId);
    // Emit global update for real-time synchronization
    emitGlobalUpdate('verification-strategy-removed', { listingId, userId: req.user.id });
    res.json({ success: true, message: 'Listing unmarked for strategy' });
  } catch (error) {
    console.error('Error removing verification strategy listing:', error);
    res.status(500).json({ error: 'Failed to unmark listing for strategy' });
  }
});

// Verification strategy dates endpoints
app.get('/api/user/verification-strategy-dates', authenticateUser, async (req, res) => {
  try {
    const strategyDates = await getVerificationStrategyDates(req.user.id);
    res.json({ success: true, strategyDates });
  } catch (error) {
    console.error('Error getting verification strategy dates:', error);
    res.status(500).json({ error: 'Failed to get verification strategy dates' });
  }
});

app.post('/api/user/verification-strategy-dates/:listingId', authenticateUser, async (req, res) => {
  try {
    const { listingId } = req.params;
    const { strategyDate } = req.body;
    await setVerificationStrategyDate(req.user.id, listingId, strategyDate);
    res.json({ success: true, message: 'Strategy date saved' });
  } catch (error) {
    console.error('Error saving verification strategy date:', error);
    res.status(500).json({ error: 'Failed to save strategy date' });
  }
});

app.delete('/api/user/verification-strategy-dates/:listingId', authenticateUser, async (req, res) => {
  try {
    const { listingId } = req.params;
    await removeVerificationStrategyDate(req.user.id, listingId);
    res.json({ success: true, message: 'Strategy date removed' });
  } catch (error) {
    console.error('Error removing verification strategy date:', error);
    res.status(500).json({ error: 'Failed to remove strategy date' });
  }
});

// Three day mapped listings endpoints
app.get('/api/user/three-day-mapped-listings', authenticateUser, async (req, res) => {
  try {
    const mappedListings = await getThreeDayMappedListings(req.user.id);
    res.json({ success: true, mappedListings });
  } catch (error) {
    console.error('Error getting three day mapped listings:', error);
    res.status(500).json({ error: 'Failed to get three day mapped listings' });
  }
});

app.post('/api/user/three-day-mapped-listings/:listingId', authenticateUser, async (req, res) => {
  try {
    const { listingId } = req.params;
    await addThreeDayMappedListing(req.user.id, listingId);
    // Emit global update for real-time synchronization
    emitGlobalUpdate('three-day-mapped-added', { listingId, userId: req.user.id });
    res.json({ success: true, message: 'Listing marked as mapped' });
  } catch (error) {
    console.error('Error adding three day mapped listing:', error);
    res.status(500).json({ error: 'Failed to mark listing as mapped' });
  }
});

app.delete('/api/user/three-day-mapped-listings/:listingId', authenticateUser, async (req, res) => {
  try {
    const { listingId } = req.params;
    await removeThreeDayMappedListing(req.user.id, listingId);
    // Emit global update for real-time synchronization
    emitGlobalUpdate('three-day-mapped-removed', { listingId, userId: req.user.id });
    res.json({ success: true, message: 'Listing unmarked as mapped' });
  } catch (error) {
    console.error('Error removing three day mapped listing:', error);
    res.status(500).json({ error: 'Failed to unmark listing as mapped' });
  }
});

// Three day strategy listings endpoints
app.get('/api/user/three-day-strategy-listings', authenticateUser, async (req, res) => {
  try {
    const strategyListings = await getThreeDayStrategyListings(req.user.id);
    res.json({ success: true, strategyListings });
  } catch (error) {
    console.error('Error getting three day strategy listings:', error);
    res.status(500).json({ error: 'Failed to get three day strategy listings' });
  }
});

app.post('/api/user/three-day-strategy-listings/:listingId', authenticateUser, async (req, res) => {
  try {
    const { listingId } = req.params;
    await addThreeDayStrategyListing(req.user.id, listingId);
    // Emit global update for real-time synchronization
    emitGlobalUpdate('three-day-strategy-added', { listingId, userId: req.user.id });
    res.json({ success: true, message: 'Listing marked for strategy' });
  } catch (error) {
    console.error('Error adding three day strategy listing:', error);
    res.status(500).json({ error: 'Failed to mark listing for strategy' });
  }
});

app.delete('/api/user/three-day-strategy-listings/:listingId', authenticateUser, async (req, res) => {
  try {
    const { listingId } = req.params;
    await removeThreeDayStrategyListing(req.user.id, listingId);
    // Emit global update for real-time synchronization
    emitGlobalUpdate('three-day-strategy-removed', { listingId, userId: req.user.id });
    res.json({ success: true, message: 'Listing unmarked as mapped' });
  } catch (error) {
    console.error('Error removing three day strategy listing:', error);
    res.status(500).json({ error: 'Failed to unmark listing for strategy' });
  }
});

// Global verification endpoints (no authentication required - shared across all users)
app.get('/api/global/verification-mapped-listings', async (req, res) => {
  try {
    const mappedListings = await getGlobalVerificationMappedListings();
    res.json({ success: true, mappedListings });
  } catch (error) {
    console.error('Error getting global verification mapped listings:', error);
    res.status(500).json({ error: 'Failed to get global verification mapped listings' });
  }
});

app.post('/api/global/verification-mapped-listings/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params;
    await addGlobalVerificationMappedListing(listingId);
    // Emit global update for real-time synchronization
    emitGlobalUpdate('global-verification-mapped-added', { listingId });
    res.json({ success: true, message: 'Listing marked as mapped globally' });
  } catch (error) {
    console.error('Error adding global verification mapped listing:', error);
    res.status(500).json({ error: 'Failed to mark listing as mapped globally' });
  }
});

app.delete('/api/global/verification-mapped-listings/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params;
    await removeGlobalVerificationMappedListing(listingId);
    // Emit global update for real-time synchronization
    emitGlobalUpdate('global-verification-mapped-removed', { listingId });
    res.json({ success: true, message: 'Listing unmarked as mapped globally' });
  } catch (error) {
    console.error('Error removing global verification mapped listing:', error);
    res.status(500).json({ error: 'Failed to unmark listing as mapped globally' });
  }
});

app.get('/api/global/verification-strategy-listings', async (req, res) => {
  try {
    const strategyListings = await getGlobalVerificationStrategyListings();
    res.json({ success: true, strategyListings });
  } catch (error) {
    console.error('Error getting global verification strategy listings:', error);
    res.status(500).json({ error: 'Failed to get global verification strategy listings' });
  }
});

app.post('/api/global/verification-strategy-listings/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params;
    await addGlobalVerificationStrategyListing(listingId);
    // Emit global update for real-time synchronization
    emitGlobalUpdate('global-verification-strategy-added', { listingId });
    res.json({ success: true, message: 'Listing marked for strategy globally' });
  } catch (error) {
    console.error('Error adding global verification strategy listing:', error);
    res.status(500).json({ error: 'Failed to mark listing for strategy globally' });
  }
});

app.delete('/api/global/verification-strategy-listings/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params;
    await removeGlobalVerificationStrategyListing(listingId);
    // Emit global update for real-time synchronization
    emitGlobalUpdate('global-verification-strategy-removed', { listingId });
    res.json({ success: true, message: 'Listing unmarked for strategy globally' });
  } catch (error) {
    console.error('Error removing global verification strategy listing:', error);
    res.status(500).json({ error: 'Failed to unmark listing for strategy globally' });
  }
});

app.get('/api/global/verification-strategy-dates', async (req, res) => {
  try {
    const strategyDates = await getGlobalVerificationStrategyDates();
    res.json({ success: true, strategyDates });
  } catch (error) {
    console.error('Error getting global verification strategy dates:', error);
    res.status(500).json({ error: 'Failed to get global verification strategy dates' });
  }
});

app.post('/api/global/verification-strategy-dates/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params;
    const { strategyDate } = req.body;
    await setGlobalVerificationStrategyDate(listingId, strategyDate);
    // Emit global update for real-time synchronization
    emitGlobalUpdate('global-verification-strategy-date-updated', { listingId, strategyDate });
    res.json({ success: true, message: 'Strategy date saved globally' });
  } catch (error) {
    console.error('Error saving global verification strategy date:', error);
    res.status(500).json({ error: 'Failed to save strategy date globally' });
  }
});

app.delete('/api/global/verification-strategy-dates/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params;
    await removeGlobalVerificationStrategyDate(listingId);
    // Emit global update for real-time synchronization
    emitGlobalUpdate('global-verification-strategy-date-removed', { listingId });
    res.json({ success: true, message: 'Strategy date removed globally' });
  } catch (error) {
    console.error('Error removing global verification strategy date:', error);
    res.status(500).json({ error: 'Failed to remove strategy date globally' });
  }
});

app.get('/api/global/three-day-mapped-listings', async (req, res) => {
  try {
    const mappedListings = await getGlobalThreeDayMappedListings();
    res.json({ success: true, mappedListings });
  } catch (error) {
    console.error('Error getting global three day mapped listings:', error);
    res.status(500).json({ error: 'Failed to get global three day mapped listings' });
  }
});

app.post('/api/global/three-day-mapped-listings/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params;
    await addGlobalThreeDayMappedListing(listingId);
    // Emit global update for real-time synchronization
    emitGlobalUpdate('global-three-day-mapped-added', { listingId });
    res.json({ success: true, message: 'Listing marked as mapped globally' });
  } catch (error) {
    console.error('Error adding global three day mapped listing:', error);
    res.status(500).json({ error: 'Failed to mark listing as mapped globally' });
  }
});

app.delete('/api/global/three-day-mapped-listings/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params;
    await removeGlobalThreeDayMappedListing(listingId);
    // Emit global update for real-time synchronization
    emitGlobalUpdate('global-three-day-mapped-removed', { listingId });
    res.json({ success: true, message: 'Listing unmarked as mapped globally' });
  } catch (error) {
    console.error('Error removing global three day mapped listing:', error);
    res.status(500).json({ error: 'Failed to unmark listing as mapped globally' });
  }
});

app.get('/api/global/three-day-strategy-listings', async (req, res) => {
  try {
    const strategyListings = await getGlobalThreeDayStrategyListings();
    res.json({ success: true, strategyListings });
  } catch (error) {
    console.error('Error getting global three day strategy listings:', error);
    res.status(500).json({ error: 'Failed to get global three day strategy listings' });
  }
});

app.post('/api/global/three-day-strategy-listings/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params;
    await addGlobalThreeDayStrategyListing(listingId);
    // Emit global update for real-time synchronization
    emitGlobalUpdate('global-three-day-strategy-added', { listingId });
    res.json({ success: true, message: 'Listing marked for strategy globally' });
  } catch (error) {
    console.error('Error adding global three day strategy listing:', error);
    res.status(500).json({ error: 'Failed to mark listing for strategy globally' });
  }
});

app.delete('/api/global/three-day-strategy-listings/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params;
    await removeGlobalThreeDayStrategyListing(listingId);
    // Emit global update for real-time synchronization
    emitGlobalUpdate('global-three-day-strategy-removed', { listingId });
    res.json({ success: true, message: 'Listing unmarked for strategy globally' });
  } catch (error) {
    console.error('Error removing global three day strategy listing:', error);
    res.status(500).json({ error: 'Failed to unmark listing for strategy globally' });
  }
});

// Starred festival routes
app.get('/api/global/starred-festival-mapped-listings', async (req, res) => {
  try {
    const mappedListings = await getStarredFestivalMappedListings();
    res.json({ success: true, mappedListings });
  } catch (error) {
    console.error('Error getting starred festival mapped listings:', error);
    res.status(500).json({ error: 'Failed to get starred festival mapped listings' });
  }
});

app.post('/api/global/starred-festival-mapped-listings/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params;
    await addStarredFestivalMappedListing(listingId);
    // Emit global update for real-time synchronization
    emitGlobalUpdate('starred-festival-mapped-added', { listingId });
    res.json({ success: true, message: 'Starred festival marked as mapped globally' });
  } catch (error) {
    console.error('Error adding starred festival mapped listing:', error);
    res.status(500).json({ error: 'Failed to mark starred festival as mapped globally' });
  }
});

app.delete('/api/global/starred-festival-mapped-listings/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params;
    await removeStarredFestivalMappedListing(listingId);
    // Emit global update for real-time synchronization
    emitGlobalUpdate('starred-festival-mapped-removed', { listingId });
    res.json({ success: true, message: 'Starred festival unmarked as mapped globally' });
  } catch (error) {
    console.error('Error removing starred festival mapped listing:', error);
    res.status(500).json({ error: 'Failed to unmark starred festival as mapped globally' });
  }
});

app.get('/api/global/starred-festival-strategy-listings', async (req, res) => {
  try {
    const strategyListings = await getStarredFestivalStrategyListings();
    res.json({ success: true, strategyListings });
  } catch (error) {
    console.error('Error getting starred festival strategy listings:', error);
    res.status(500).json({ error: 'Failed to get starred festival strategy listings' });
  }
});

app.post('/api/global/starred-festival-strategy-listings/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params;
    await addStarredFestivalStrategyListing(listingId);
    // Emit global update for real-time synchronization
    emitGlobalUpdate('starred-festival-strategy-added', { listingId });
    res.json({ success: true, message: 'Starred festival marked for strategy globally' });
  } catch (error) {
    console.error('Error adding starred festival strategy listing:', error);
    res.status(500).json({ error: 'Failed to mark starred festival for strategy globally' });
  }
});

app.delete('/api/global/starred-festival-strategy-listings/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params;
    await removeStarredFestivalStrategyListing(listingId);
    // Emit global update for real-time synchronization
    emitGlobalUpdate('starred-festival-strategy-removed', { listingId });
    res.json({ success: true, message: 'Starred festival unmarked for strategy globally' });
  } catch (error) {
    console.error('Error removing starred festival strategy listing:', error);
    res.status(500).json({ error: 'Failed to unmark starred festival for strategy globally' });
  }
});

app.get('/api/global/starred-festival-strategy-dates', async (req, res) => {
  try {
    const strategyDates = await getStarredFestivalStrategyDates();
    res.json({ success: true, strategyDates });
  } catch (error) {
    console.error('Error getting starred festival strategy dates:', error);
    res.status(500).json({ error: 'Failed to get starred festival strategy dates' });
  }
});

app.post('/api/global/starred-festival-strategy-dates/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params;
    const { strategyDate } = req.body;
    await setStarredFestivalStrategyDate(listingId, strategyDate);
    // Emit global update for real-time synchronization
    emitGlobalUpdate('starred-festival-strategy-date-updated', { listingId, strategyDate });
    res.json({ success: true, message: 'Starred festival strategy date set globally' });
  } catch (error) {
    console.error('Error saving starred festival strategy date:', error);
    res.status(500).json({ error: 'Failed to save starred festival strategy date globally' });
  }
});

app.delete('/api/global/starred-festival-strategy-dates/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params;
    await removeStarredFestivalStrategyDate(listingId);
    // Emit global update for real-time synchronization
    emitGlobalUpdate('starred-festival-strategy-date-removed', { listingId });
    res.json({ success: true, message: 'Starred festival strategy date removed globally' });
  } catch (error) {
    console.error('Error removing starred festival strategy date:', error);
    res.status(500).json({ error: 'Failed to remove starred festival strategy date globally' });
  }
});

// Proxy middleware for ZeroHero API - only handle specific endpoints
app.get('/api/v1/events', async (req, res) => {
  try {
    console.log('Proxying request to ZeroHero API:', req.url);
    const response = await queueApiCall(() => zeroHeroApi({
      method: 'get',
      url: 'https://api.zerohero.com/v1/events',
      headers: {
        'Host': 'api.zerohero.com',
        'Authorization': `Bearer ${config.zeroHero.apiKey}`,
        'Content-Type': 'application/json',
      },
      params: req.query,
    }));

    console.log('ZeroHero API response status:', response.status);
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Proxy error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.status,
      data: error.response?.data
    });
    res.status(error.response?.status || 500).json({
      error: error.message,
      details: error.response?.data || 'Internal server error'
    });
  }
});

app.get('/api/v1/listings', async (req, res) => {
  try {
    console.log('Proxying listings request to ZeroHero API:', req.url);
    console.log('Request query params:', req.query);
    console.log('Using API key:', config.zeroHero.apiKey ? '***' + config.zeroHero.apiKey.slice(-4) : 'NOT_SET');
    
    const response = await queueApiCall(() => zeroHeroApi({
      method: 'get',
      url: 'https://api.zerohero.com/v1/listings',
      headers: {
        'Host': 'api.zerohero.com',
        'Broker-Key': config.zeroHero.apiKey,
        'Content-Type': 'application/json',
      },
      params: req.query,
    }));

    console.log('ZeroHero listings API response status:', response.status);
    console.log('Response data keys:', Object.keys(response.data || {}));
    console.log('Response data resultData length:', response.data?.resultData?.length || 0);
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Proxy error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.status,
      data: error.response?.data
    });
    
    // Handle rate limiting specifically
    if (error.response?.status === 429) {
      console.log('Rate limit hit, applying exponential backoff...');
      await handleRateLimit();
      res.status(429).json({
        error: 'Rate limit exceeded. Please try again in a few moments.',
        retryAfter: Math.min(rateLimitCount * 2, 10)
      });
      return;
    }
    
    res.status(error.response?.status || 500).json({
      error: error.message,
      details: error.response?.data || 'Internal server error'
    });
  }
});

// External listings endpoint specifically for purchase data
app.get('/api/v1/external/listings', async (req, res) => {
  try {
    console.log('Proxying external listings request to ZeroHero API:', req.url);
    const response = await queueApiCall(() => zeroHeroApi({
      method: 'get',
      url: 'https://api.zerohero.com/v1/listings',
      headers: {
        'Host': 'api.zerohero.com',
        'Authorization': `Bearer ${config.zeroHero.apiKey}`,
        'Content-Type': 'application/json',
      },
      params: req.query,
    }));

    console.log('ZeroHero external listings API response status:', response.status);
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('External listings proxy error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.status,
      data: error.response?.data
    });
    
    // Handle rate limiting specifically
    if (error.response?.status === 429) {
      console.log('Rate limit hit, applying exponential backoff...');
      await handleRateLimit();
      res.status(429).json({
        error: 'Rate limit exceeded. Please try again in a few moments.',
        retryAfter: Math.min(rateLimitCount * 2, 10)
      });
      return;
    }
    
    res.status(error.response?.status || 500).json({
      error: error.message,
      details: error.response?.data || 'Internal server error'
    });
  }
});

// ZeroHero listings endpoint for verification (4+ days away)
app.get('/api/zerohero/listings', async (req, res) => {
  try {
    console.log('Proxying ZeroHero listings request for verification:', req.url);
    const response = await queueApiCall(() => zeroHeroApi({
      method: 'get',
      url: 'https://api.zerohero.com/v1/listings',
      headers: {
        'Host': 'api.zerohero.com',
        'Broker-Key': config.zeroHero.apiKey,
        'accept': 'application/json',
      },
      params: req.query,
    }));

    console.log('ZeroHero verification listings API response status:', response.status);
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('ZeroHero verification listings proxy error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.status,
      data: error.response?.data
    });
    
    // Handle rate limiting specifically
    if (error.response?.status === 429) {
      console.log('Rate limit hit, applying exponential backoff...');
      await handleRateLimit();
      res.status(429).json({
        error: 'Rate limit exceeded. Please try again in a few moments.',
        retryAfter: Math.min(rateLimitCount * 2, 10)
      });
      return;
    }
    
    res.status(error.response?.status || 500).json({
      error: error.message,
      details: error.response?.data || 'Internal server error'
    });
  }
});

app.post('/api/v1/listings', async (req, res) => {
  try {
    console.log('Proxying POST listings request to ZeroHero API');
    const response = await zeroHeroApi({
      method: 'post',
      url: 'https://api.zerohero.com/v1/listings',
      headers: {
        'Host': 'api.zerohero.com',
        'Authorization': `Bearer ${config.zeroHero.apiKey}`,
        'Content-Type': 'application/json',
      },
      data: req.body,
    });

    console.log('ZeroHero POST listings API response status:', response.status);
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Proxy error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.status,
      data: error.response?.data
    });
    res.status(error.response?.status || 500).json({
      error: error.message,
      details: error.response?.data || 'Internal server error'
    });
  }
});

app.put('/api/v1/listings/:listingId/tags', async (req, res) => {
  try {
    const { listingId } = req.params;
    const { tags, replaceTags = false } = req.body;
    
    console.log(`Proxying PUT tags request to ZeroHero API for listing ${listingId}`);
    const response = await zeroHeroApi({
      method: 'put',
      url: `https://api.zerohero.com/v1/listings/${listingId}`,
      headers: {
        'Host': 'api.zerohero.com',
        'Authorization': `Bearer ${config.zeroHero.apiKey}`,
        'Content-Type': 'application/json',
      },
      data: { tags, replaceTags },
    });

    console.log('ZeroHero PUT tags API response status:', response.status);
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Proxy error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.status,
      data: error.response?.data
    });
    res.status(error.response?.status || 500).json({
      error: error.message,
      details: error.response?.data || 'Internal server error'
    });
  }
});

app.get('/api/v1/orders/sales', async (req, res) => {
  try {
    console.log('Proxying sales orders request to ZeroHero API:', req.url);
    const response = await queueApiCall(() => zeroHeroApi({
      method: 'get',
      url: 'https://api.zerohero.com/v1/orders/sales',
      headers: {
        'Host': 'api.zerohero.com',
        'Authorization': `Bearer ${config.zeroHero.apiKey}`,
        'Content-Type': 'application/json',
      },
      params: req.query,
    }));

    console.log('ZeroHero sales orders API response status:', response.status);
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Proxy error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.status,
      data: error.response?.data
    });
    
    // Handle rate limiting specifically
    if (error.response?.status === 429) {
      console.log('Rate limit hit, applying exponential backoff...');
      await handleRateLimit();
      res.status(429).json({
        error: 'Rate limit exceeded. Please try again in a few moments.',
        retryAfter: Math.min(rateLimitCount * 2, 10)
      });
      return;
    }
    
    res.status(error.response?.status || 500).json({
      error: error.message,
      details: error.response?.data || 'Internal server error'
    });
  }
});

app.get('/api/v1/orders/purchase', async (req, res) => {
  try {
    console.log('Proxying purchase orders request to ZeroHero API:', req.url);
    const response = await queueApiCall(() => zeroHeroApi({
      method: 'get',
      url: 'https://api.zerohero.com/v1/orders/purchase',
      headers: {
        'Host': 'api.zerohero.com',
        'Authorization': `Bearer ${config.zeroHero.apiKey}`,
        'Content-Type': 'application/json',
      },
      params: req.query,
    }));

    console.log('ZeroHero purchase orders API response status:', response.status);
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Proxy error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.status,
      data: error.response?.data
    });
    
    // Handle rate limiting specifically
    if (error.response?.status === 429) {
      console.log('Rate limit hit, applying exponential backoff...');
      await handleRateLimit();
      res.status(429).json({
        error: 'Rate limit exceeded. Please try again in a few moments.',
        retryAfter: Math.min(rateLimitCount * 2, 10)
      });
      return;
    }
    
    res.status(error.response?.status || 500).json({
      error: error.message,
      details: error.response?.data || 'Internal server error'
    });
  }
});

// Batch endpoint to fetch multiple event data in one request
app.get('/api/v1/batch/event-data', async (req, res) => {
  try {
    const { eventIds } = req.query;
    if (!eventIds) {
      return res.status(400).json({ error: 'eventIds parameter required' });
    }

    console.log('Proxying batch request for events:', eventIds);
    
    // Fetch all data in parallel but through the queue
    const [eventsResponse, listingsResponse, salesResponse] = await Promise.all([
      queueApiCall(() => zeroHeroApi({
        method: 'get',
        url: 'https://api.zerohero.com/v1/events',
        headers: {
          'Host': 'api.zerohero.com',
          'Authorization': `Bearer ${config.zeroHero.apiKey}`,
          'Content-Type': 'application/json',
        },
        params: { eventIds },
      })),
      queueApiCall(() => zeroHeroApi({
        method: 'get',
        url: 'https://api.zerohero.com/v1/listings',
        headers: {
          'Host': 'api.zerohero.com',
          'Authorization': `Bearer ${config.zeroHero.apiKey}`,
          'Content-Type': 'application/json',
        },
        params: { eventIds },
      })),
      queueApiCall(() => zeroHeroApi({
        method: 'get',
        url: 'https://api.zerohero.com/v1/orders/sales',
        headers: {
          'Host': 'api.zerohero.com',
          'Authorization': `Bearer ${config.zeroHero.apiKey}`,
          'Content-Type': 'application/json',
        },
        params: { eventIds },
      }))
    ]);

    console.log('Batch request completed successfully');
    res.json({
      events: eventsResponse.data,
      listings: listingsResponse.data,
      sales: salesResponse.data
    });
  } catch (error) {
    console.error('Batch request error:', error);
    
    // Handle rate limiting specifically
    if (error.response?.status === 429) {
      console.log('Rate limit hit in batch request, applying exponential backoff...');
      await handleRateLimit();
      res.status(429).json({
        error: 'Rate limit exceeded. Please try again in a few moments.',
        retryAfter: Math.min(rateLimitCount * 2, 10)
      });
      return;
    }
    
    res.status(error.response?.status || 500).json({
      error: error.message,
      details: error.response?.data || 'Internal server error'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  try {
    res.json({ 
      status: 'OK', 
      message: 'Proxy server is running', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      message: 'Health check failed',
      error: error.message 
    });
  }
});

// Root endpoint for Railway health checks
app.get('/', (req, res) => {
  try {
    res.json({ 
      status: 'OK', 
      message: 'Festival Reports API Server',
      health: '/health',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      message: 'Health check failed',
      error: error.message 
    });
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('🔌 User disconnected:', socket.id);
  });
  
  // Join user to their personal room for updates
  socket.on('join-user-room', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`👤 User ${userId} joined their room`);
  });
  
  // Join global room for shared updates
  socket.on('join-global-room', () => {
    socket.join('global');
    console.log('🌍 User joined global room');
  });
});

// Function to emit real-time updates
export function emitUpdate(room, event, data) {
  io.to(room).emit(event, data);
}

// Function to emit global updates
export function emitGlobalUpdate(event, data) {
  io.to('global').emit(event, data);
}

server.listen(PORT, () => {
  console.log(`🚀 Proxy server running on http://localhost:${PORT}`);
  console.log(`📡 Proxying requests to ZeroHero API`);
  console.log(`🔑 API key configured:`, config.zeroHero.apiKey ? `***${config.zeroHero.apiKey.slice(-4)}` : `NOT_SET`);
  console.log(`💾 User data storage enabled`);
  console.log(`🔌 Socket.io real-time updates enabled`);
}); 