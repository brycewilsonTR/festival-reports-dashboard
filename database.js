import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db;

// Initialize database
export async function initDatabase() {
  db = await open({
    filename: path.join(__dirname, 'userdata.db'),
    driver: sqlite3.Database
  });

  // Create tables if they don't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      is_admin BOOLEAN NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    );

    CREATE TABLE IF NOT EXISTS bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      event_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      UNIQUE(user_id, event_id)
    );

    CREATE TABLE IF NOT EXISTS custom_marketplace_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      event_id TEXT NOT NULL,
      marketplace_type TEXT NOT NULL,
      link TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      UNIQUE(user_id, event_id, marketplace_type)
    );

    CREATE TABLE IF NOT EXISTS custom_listing_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      listing_id TEXT NOT NULL,
      marketplace_type TEXT NOT NULL,
      link TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      UNIQUE(user_id, listing_id, marketplace_type)
    );

    CREATE TABLE IF NOT EXISTS manual_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      section TEXT NOT NULL,
      category TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      UNIQUE(user_id, section)
    );

    CREATE TABLE IF NOT EXISTS autopriced_listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      listing_id TEXT NOT NULL,
      is_autopriced BOOLEAN NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      UNIQUE(user_id, listing_id)
    );

    CREATE TABLE IF NOT EXISTS listing_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      listing_id TEXT NOT NULL,
      tag TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      UNIQUE(user_id, listing_id, tag)
    );

    CREATE TABLE IF NOT EXISTS unverification_dates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      listing_id TEXT NOT NULL,
      unverification_date DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      UNIQUE(user_id, listing_id)
    );

    CREATE TABLE IF NOT EXISTS verification_mapped_listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      listing_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      UNIQUE(user_id, listing_id)
    );

    CREATE TABLE IF NOT EXISTS verification_strategy_listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      listing_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      UNIQUE(user_id, listing_id)
    );

    CREATE TABLE IF NOT EXISTS verification_strategy_dates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      listing_id TEXT NOT NULL,
      strategy_date DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      UNIQUE(user_id, listing_id)
    );

    CREATE TABLE IF NOT EXISTS three_day_mapped_listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      listing_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      UNIQUE(user_id, listing_id)
    );

    CREATE TABLE IF NOT EXISTS three_day_strategy_listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      listing_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      UNIQUE(user_id, listing_id)
    );

    CREATE TABLE IF NOT EXISTS starred_festival_mapped_listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      listing_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      UNIQUE(user_id, listing_id)
    );

    CREATE TABLE IF NOT EXISTS starred_festival_strategy_listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      listing_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      UNIQUE(user_id, listing_id)
    );

    CREATE TABLE IF NOT EXISTS starred_festival_strategy_dates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      listing_id TEXT NOT NULL,
      strategy_date TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      UNIQUE(user_id, listing_id)
    );
  `);

  // Initialize default admin user if no users exist
  try {
    const userCount = await db.get('SELECT COUNT(*) as count FROM users');
    if (userCount.count === 0) {
      // Create default admin user: bryce.wilson@ticketrescue.com with password 'bryce'
      const defaultPassword = 'bryce';
      const defaultPasswordHash = await bcrypt.hash(defaultPassword, 10);
      await createUser('bryce.wilson@ticketrescue.com', defaultPasswordHash, true);
      console.log('Default admin user created: bryce.wilson@ticketrescue.com');
    }
  } catch (error) {
    console.error('Error initializing default admin user:', error);
  }

  return db;
}

// User management
export async function createUser(email, passwordHash, isAdmin = false) {
  try {
    const result = await db.run(
      'INSERT INTO users (email, password_hash, is_admin) VALUES (?, ?, ?)', 
      [email, passwordHash, isAdmin]
    );
    return result.lastID;
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      // User already exists, get their ID
      const user = await db.get('SELECT id FROM users WHERE email = ?', [email]);
      return user.id;
    }
    throw error;
  }
}

export async function getUserByEmail(email) {
  return await db.get('SELECT * FROM users WHERE email = ?', [email]);
}

export async function getUserById(userId) {
  return await db.get('SELECT * FROM users WHERE id = ?', [userId]);
}

export async function updateUser(userId, userData) {
  const { email, isAdmin } = userData;
  await db.run(
    'UPDATE users SET email = ?, is_admin = ? WHERE id = ?',
    [email, isAdmin, userId]
  );
}

export async function deleteUser(userId) {
  await db.run('DELETE FROM users WHERE id = ?', [userId]);
}

export async function toggleAdminStatus(userId) {
  await db.run(
    'UPDATE users SET is_admin = CASE WHEN is_admin = 1 THEN 0 ELSE 1 END WHERE id = ?',
    [userId]
  );
}

export async function updateLastLogin(userId) {
  await db.run(
    'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
    [userId]
  );
}

export async function getAllUsers() {
  return await db.all('SELECT id, email, is_admin, created_at, last_login FROM users ORDER BY created_at DESC');
}

export async function updateUserPassword(userId, passwordHash) {
  await db.run(
    'UPDATE users SET password_hash = ? WHERE id = ?',
    [passwordHash, userId]
  );
}

// Bookmarks
export async function getBookmarks(userId) {
  const bookmarks = await db.all('SELECT event_id FROM bookmarks WHERE user_id = ? ORDER BY created_at DESC', [userId]);
  return bookmarks.map(b => b.event_id);
}

export async function addBookmark(userId, eventId) {
  try {
    await db.run('INSERT INTO bookmarks (user_id, event_id) VALUES (?, ?)', [userId, eventId]);
    return true;
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      return false; // Already bookmarked
    }
    throw error;
  }
}

export async function removeBookmark(userId, eventId) {
  const result = await db.run('DELETE FROM bookmarks WHERE user_id = ? AND event_id = ?', [userId, eventId]);
  return result.changes > 0;
}

// Custom marketplace links
export async function getCustomMarketplaceLinks(userId, eventId) {
  const links = await db.all(
    'SELECT marketplace_type, link FROM custom_marketplace_links WHERE user_id = ? AND event_id = ?',
    [userId, eventId]
  );
  const result = {};
  links.forEach(link => {
    result[link.marketplace_type] = link.link;
  });
  return result;
}

export async function setCustomMarketplaceLink(userId, eventId, marketplaceType, link) {
  await db.run(`
    INSERT OR REPLACE INTO custom_marketplace_links (user_id, event_id, marketplace_type, link, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
  `, [userId, eventId, marketplaceType, link]);
}

// Custom listing links
export async function getCustomListingLinks(userId, listingId) {
  const links = await db.all(
    'SELECT marketplace_type, link FROM custom_listing_links WHERE user_id = ? AND listing_id = ?',
    [userId, listingId]
  );
  const result = {};
  links.forEach(link => {
    result[link.marketplace_type] = link.link;
  });
  return result;
}

export async function setCustomListingLink(userId, listingId, marketplaceType, link) {
  await db.run(`
    INSERT OR REPLACE INTO custom_listing_links (user_id, listing_id, marketplace_type, link, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
  `, [userId, listingId, marketplaceType, link]);
}

// Manual categories
export async function getManualCategories(userId) {
  const categories = await db.all(
    'SELECT section, category FROM manual_categories WHERE user_id = ?',
    [userId]
  );
  const result = {};
  categories.forEach(cat => {
    result[cat.section] = cat.category;
  });
  return result;
}

export async function setManualCategory(userId, section, category) {
  await db.run(`
    INSERT OR REPLACE INTO manual_categories (user_id, section, category, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `, [userId, section, category]);
}

export async function deleteManualCategory(userId, section) {
  await db.run('DELETE FROM manual_categories WHERE user_id = ? AND section = ?', [userId, section]);
}

// Autopriced listings
export async function getAutopricedListings(userId) {
  const listings = await db.all(
    'SELECT listing_id, is_autopriced FROM autopriced_listings WHERE user_id = ?',
    [userId]
  );
  const result = {};
  listings.forEach(listing => {
    result[listing.listing_id] = listing.is_autopriced === 1;
  });
  return result;
}

export async function setAutopricedListing(userId, listingId, isAutopriced) {
  await db.run(`
    INSERT OR REPLACE INTO autopriced_listings (user_id, listing_id, is_autopriced, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `, [userId, listingId, isAutopriced ? 1 : 0]);
}

// Listing tags functions
export async function getListingTags(userId) {
  const rows = await db.all(
    'SELECT listing_id, tag FROM listing_tags WHERE user_id = ? ORDER BY listing_id, tag',
    [userId]
  );
  
  const tags = {};
  rows.forEach(row => {
    if (!tags[row.listing_id]) {
      tags[row.listing_id] = [];
    }
    tags[row.listing_id].push(row.tag);
  });
  
  return tags;
}

// Unverification dates functions
export async function getUnverificationDates(userId) {
  const rows = await db.all(
    'SELECT listing_id, unverification_date FROM unverification_dates WHERE user_id = ? ORDER BY listing_id',
    [userId]
  );
  
  const dates = {};
  rows.forEach(row => {
    dates[row.listing_id] = row.unverification_date;
  });
  
  return dates;
}

export async function setUnverificationDate(userId, listingId, unverificationDate) {
  await db.run(`
    INSERT OR REPLACE INTO unverification_dates (user_id, listing_id, unverification_date, created_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `, [userId, listingId, unverificationDate]);
}

export async function removeUnverificationDate(userId, listingId) {
  await db.run(
    'DELETE FROM unverification_dates WHERE user_id = ? AND listing_id = ?',
    [userId, listingId]
  );
}

// Verification mapped listings functions
export async function getVerificationMappedListings(userId) {
  const rows = await db.all(
    'SELECT listing_id FROM verification_mapped_listings WHERE user_id = ?',
    [userId]
  );
  return rows.map(row => row.listing_id);
}

export async function addVerificationMappedListing(userId, listingId) {
  await db.run(
    'INSERT OR IGNORE INTO verification_mapped_listings (user_id, listing_id) VALUES (?, ?)',
    [userId, listingId]
  );
}

export async function removeVerificationMappedListing(userId, listingId) {
  await db.run(
    'DELETE FROM verification_mapped_listings WHERE user_id = ? AND listing_id = ?',
    [userId, listingId]
  );
}

// Verification strategy listings functions
export async function getVerificationStrategyListings(userId) {
  const rows = await db.all(
    'SELECT listing_id FROM verification_strategy_listings WHERE user_id = ?',
    [userId]
  );
  return rows.map(row => row.listing_id);
}

export async function addVerificationStrategyListing(userId, listingId) {
  await db.run(
    'INSERT OR IGNORE INTO verification_strategy_listings (user_id, listing_id) VALUES (?, ?)',
    [userId, listingId]
  );
}

export async function removeVerificationStrategyListing(userId, listingId) {
  await db.run(
    'DELETE FROM verification_strategy_listings WHERE user_id = ? AND listing_id = ?',
    [userId, listingId]
  );
}

// Verification strategy dates functions
export async function getVerificationStrategyDates(userId) {
  const rows = await db.all(
    'SELECT listing_id, strategy_date FROM verification_strategy_dates WHERE user_id = ?',
    [userId]
  );
  
  const dates = {};
  rows.forEach(row => {
    dates[row.listing_id] = row.strategy_date;
  });
  
  return dates;
}

export async function setVerificationStrategyDate(userId, listingId, strategyDate) {
  await db.run(`
    INSERT OR REPLACE INTO verification_strategy_dates (user_id, listing_id, strategy_date, created_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `, [userId, listingId, strategyDate]);
}

export async function removeVerificationStrategyDate(userId, listingId) {
  await db.run(
    'DELETE FROM verification_strategy_dates WHERE user_id = ? AND listing_id = ?',
    [userId, listingId]
  );
}

// Three day mapped listings functions
export async function getThreeDayMappedListings(userId) {
  const rows = await db.all(
    'SELECT listing_id FROM three_day_mapped_listings WHERE user_id = ?',
    [userId]
  );
  return rows.map(row => row.listing_id);
}

export async function addThreeDayMappedListing(userId, listingId) {
  await db.run(
    'INSERT OR IGNORE INTO three_day_mapped_listings (user_id, listing_id) VALUES (?, ?)',
    [userId, listingId]
  );
}

export async function removeThreeDayMappedListing(userId, listingId) {
  await db.run(
    'DELETE FROM three_day_mapped_listings WHERE user_id = ? AND listing_id = ?',
    [userId, listingId]
  );
}

// Three day strategy listings functions
export async function getThreeDayStrategyListings(userId) {
  const rows = await db.all(
    'SELECT listing_id FROM three_day_strategy_listings WHERE user_id = ?',
    [userId]
  );
  return rows.map(row => row.listing_id);
}

export async function addThreeDayStrategyListing(userId, listingId) {
  await db.run(
    'INSERT OR IGNORE INTO three_day_strategy_listings (user_id, listing_id) VALUES (?, ?)',
    [userId, listingId]
  );
}

export async function removeThreeDayStrategyListing(userId, listingId) {
  await db.run(
    'DELETE FROM three_day_strategy_listings WHERE user_id = ? AND listing_id = ?',
    [userId, listingId]
  );
}

export async function getExpiredUnverificationDates() {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const rows = await db.all(
    'SELECT user_id, listing_id FROM unverification_dates WHERE unverification_date <= ?',
    [today]
  );
  return rows;
}

export async function addListingTag(userId, listingId, tag) {
  await db.run(
    'INSERT OR IGNORE INTO listing_tags (user_id, listing_id, tag) VALUES (?, ?, ?)',
    [userId, listingId, tag]
  );
}

export async function removeListingTag(userId, listingId, tag) {
  await db.run(
    'DELETE FROM listing_tags WHERE user_id = ? AND listing_id = ? AND tag = ?',
    [userId, listingId, tag]
  );
}

export async function addBulkListingTags(userId, listingIds, tag) {
  const stmt = await db.prepare(
    'INSERT OR IGNORE INTO listing_tags (user_id, listing_id, tag) VALUES (?, ?, ?)'
  );
  
  for (const listingId of listingIds) {
    await stmt.run([userId, listingId, tag]);
  }
  
  await stmt.finalize();
}

// Global verification functions (shared across all users)
export async function getGlobalVerificationMappedListings() {
  const rows = await db.all(
    'SELECT DISTINCT listing_id FROM verification_mapped_listings'
  );
  return rows.map(row => row.listing_id);
}

export async function addGlobalVerificationMappedListing(listingId) {
  // Add for a default user (user_id = 1) to maintain table structure
  await db.run(
    'INSERT OR IGNORE INTO verification_mapped_listings (user_id, listing_id) VALUES (1, ?)',
    [listingId]
  );
}

export async function removeGlobalVerificationMappedListing(listingId) {
  await db.run(
    'DELETE FROM verification_mapped_listings WHERE listing_id = ?',
    [listingId]
  );
}

export async function getGlobalVerificationStrategyListings() {
  const rows = await db.all(
    'SELECT DISTINCT listing_id FROM verification_strategy_listings'
  );
  return rows.map(row => row.listing_id);
}

export async function addGlobalVerificationStrategyListing(listingId) {
  // Add for a default user (user_id = 1) to maintain table structure
  await db.run(
    'INSERT OR IGNORE INTO verification_strategy_listings (user_id, listing_id) VALUES (1, ?)',
    [listingId]
  );
}

export async function removeGlobalVerificationStrategyListing(listingId) {
  await db.run(
    'DELETE FROM verification_strategy_listings WHERE listing_id = ?',
    [listingId]
  );
}

export async function getGlobalVerificationStrategyDates() {
  const rows = await db.all(
    'SELECT listing_id, strategy_date FROM verification_strategy_dates GROUP BY listing_id HAVING MAX(created_at)'
  );
  
  const dates = {};
  rows.forEach(row => {
    dates[row.listing_id] = row.strategy_date;
  });
  
  return dates;
}

export async function setGlobalVerificationStrategyDate(listingId, strategyDate) {
  // First remove all existing entries for this listing
  await db.run('DELETE FROM verification_strategy_dates WHERE listing_id = ?', [listingId]);
  // Then add the new one
  await db.run(`
    INSERT INTO verification_strategy_dates (user_id, listing_id, strategy_date, created_at)
    VALUES (1, ?, ?, CURRENT_TIMESTAMP)
  `, [listingId, strategyDate]);
}

export async function removeGlobalVerificationStrategyDate(listingId) {
  await db.run(
    'DELETE FROM verification_strategy_dates WHERE listing_id = ?',
    [listingId]
  );
}

export async function getGlobalThreeDayMappedListings() {
  const rows = await db.all(
    'SELECT DISTINCT listing_id FROM three_day_mapped_listings'
  );
  return rows.map(row => row.listing_id);
}

export async function addGlobalThreeDayMappedListing(listingId) {
  // Add for a default user (user_id = 1) to maintain table structure
  await db.run(
    'INSERT OR IGNORE INTO three_day_mapped_listings (user_id, listing_id) VALUES (1, ?)',
    [listingId]
  );
}

export async function removeGlobalThreeDayMappedListing(listingId) {
  await db.run(
    'DELETE FROM three_day_mapped_listings WHERE listing_id = ?',
    [listingId]
  );
}

export async function getGlobalThreeDayStrategyListings() {
  const rows = await db.all(
    'SELECT DISTINCT listing_id FROM three_day_strategy_listings'
  );
  return rows.map(row => row.listing_id);
}

export async function addGlobalThreeDayStrategyListing(listingId) {
  // Add for a default user (user_id = 1) to maintain table structure
  await db.run(
    'INSERT OR IGNORE INTO three_day_strategy_listings (user_id, listing_id) VALUES (1, ?)',
    [listingId]
  );
}

export async function removeGlobalThreeDayStrategyListing(listingId) {
  await db.run(
    'DELETE FROM three_day_strategy_listings WHERE listing_id = ?',
    [listingId]
  );
}

// Starred festival functions (shared across all users)
export async function getStarredFestivalMappedListings() {
  const rows = await db.all(
    'SELECT DISTINCT listing_id FROM starred_festival_mapped_listings'
  );
  return rows.map(row => row.listing_id);
}

export async function addStarredFestivalMappedListing(listingId) {
  // Add for a default user (user_id = 1) to maintain table structure
  await db.run(
    'INSERT OR IGNORE INTO starred_festival_mapped_listings (user_id, listing_id) VALUES (1, ?)',
    [listingId]
  );
}

export async function removeStarredFestivalMappedListing(listingId) {
  await db.run(
    'DELETE FROM starred_festival_mapped_listings WHERE listing_id = ?',
    [listingId]
  );
}

export async function getStarredFestivalStrategyListings() {
  const rows = await db.all(
    'SELECT DISTINCT listing_id FROM starred_festival_strategy_listings'
  );
  return rows.map(row => row.listing_id);
}

export async function addStarredFestivalStrategyListing(listingId) {
  // Add for a default user (user_id = 1) to maintain table structure
  await db.run(
    'INSERT OR IGNORE INTO starred_festival_strategy_listings (user_id, listing_id) VALUES (1, ?)',
    [listingId]
  );
}

export async function removeStarredFestivalStrategyListing(listingId) {
  await db.run(
    'DELETE FROM starred_festival_strategy_listings WHERE listing_id = ?',
    [listingId]
  );
}

export async function getStarredFestivalStrategyDates() {
  const rows = await db.all(
    'SELECT listing_id, strategy_date FROM starred_festival_strategy_dates GROUP BY listing_id HAVING MAX(created_at)'
  );
  
  const dates = {};
  rows.forEach(row => {
    dates[row.listing_id] = row.strategy_date;
  });
  
  return dates;
}

export async function setStarredFestivalStrategyDate(listingId, strategyDate) {
  // First remove all existing entries for this listing
  await db.run('DELETE FROM starred_festival_strategy_dates WHERE listing_id = ?', [listingId]);
  // Then add the new one
  await db.run(`
    INSERT INTO starred_festival_strategy_dates (user_id, listing_id, strategy_date, created_at)
    VALUES (1, ?, ?, CURRENT_TIMESTAMP)
  `, [listingId, strategyDate]);
}

export async function removeStarredFestivalStrategyDate(listingId) {
  await db.run(
    'DELETE FROM starred_festival_strategy_dates WHERE listing_id = ?',
    [listingId]
  );
}

// Get database instance
export function getDatabase() {
  return db;
} 