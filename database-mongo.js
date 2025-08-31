import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

// MongoDB connection
let isConnected = false;

export async function connectToDatabase() {
  if (isConnected) return;
  
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is required');
    }
    
    await mongoose.connect(mongoUri);
    
    isConnected = true;
    console.log('✅ Connected to MongoDB Atlas');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  is_admin: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
  last_login: { type: Date }
});

const User = mongoose.model('User', userSchema);

// Bookmark Schema
const bookmarkSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  event_id: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});

bookmarkSchema.index({ user_id: 1, event_id: 1 }, { unique: true });
const Bookmark = mongoose.model('Bookmark', bookmarkSchema);

// Custom Marketplace Links Schema
const customMarketplaceLinkSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  event_id: { type: String, required: true },
  marketplace_type: { type: String, required: true },
  link: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

customMarketplaceLinkSchema.index({ user_id: 1, event_id: 1, marketplace_type: 1 }, { unique: true });
const CustomMarketplaceLink = mongoose.model('CustomMarketplaceLink', customMarketplaceLinkSchema);

// Custom Listing Links Schema
const customListingLinkSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  listing_id: { type: String, required: true },
  marketplace_type: { type: String, required: true },
  link: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

customListingLinkSchema.index({ user_id: 1, listing_id: 1, marketplace_type: 1 }, { unique: true });
const CustomListingLink = mongoose.model('CustomListingLink', customListingLinkSchema);

// Manual Categories Schema
const manualCategorySchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  section: { type: String, required: true },
  category: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

manualCategorySchema.index({ user_id: 1, section: 1 }, { unique: true });
const ManualCategory = mongoose.model('ManualCategory', manualCategorySchema);

// Autopriced Listings Schema
const autopricedListingSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  listing_id: { type: String, required: true },
  is_autopriced: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

autopricedListingSchema.index({ user_id: 1, listing_id: 1 }, { unique: true });
const AutopricedListing = mongoose.model('AutopricedListing', autopricedListingSchema);

// Listing Tags Schema
const listingTagSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  listing_id: { type: String, required: true },
  tag: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});

listingTagSchema.index({ user_id: 1, listing_id: 1, tag: 1 }, { unique: true });
const ListingTag = mongoose.model('ListingTag', listingTagSchema);

// Unverification Dates Schema
const unverificationDateSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  listing_id: { type: String, required: true },
  unverification_date: { type: Date, required: true },
  created_at: { type: Date, default: Date.now }
});

unverificationDateSchema.index({ user_id: 1, listing_id: 1 }, { unique: true });
const UnverificationDate = mongoose.model('UnverificationDate', unverificationDateSchema);

// Verification Mapped Listings Schema
const verificationMappedListingSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  listing_id: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});

verificationMappedListingSchema.index({ user_id: 1, listing_id: 1 }, { unique: true });
const VerificationMappedListing = mongoose.model('VerificationMappedListing', verificationMappedListingSchema);

// Verification Strategy Listings Schema
const verificationStrategyListingSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  listing_id: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});

verificationStrategyListingSchema.index({ user_id: 1, listing_id: 1 }, { unique: true });
const VerificationStrategyListing = mongoose.model('VerificationStrategyListing', verificationStrategyListingSchema);

// Verification Strategy Dates Schema
const verificationStrategyDateSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  listing_id: { type: String, required: true },
  strategy_date: { type: Date, required: true },
  created_at: { type: Date, default: Date.now }
});

verificationStrategyDateSchema.index({ user_id: 1, listing_id: 1 }, { unique: true });
const VerificationStrategyDate = mongoose.model('VerificationStrategyDate', verificationStrategyDateSchema);

// Three Day Mapped Listings Schema
const threeDayMappedListingSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  listing_id: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});

threeDayMappedListingSchema.index({ user_id: 1, listing_id: 1 }, { unique: true });
const ThreeDayMappedListing = mongoose.model('ThreeDayMappedListing', threeDayMappedListingSchema);

// Three Day Strategy Listings Schema
const threeDayStrategyListingSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  listing_id: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});

threeDayStrategyListingSchema.index({ user_id: 1, listing_id: 1 }, { unique: true });
const ThreeDayStrategyListing = mongoose.model('ThreeDayStrategyListing', threeDayStrategyListingSchema);

// Global Verification Mapped Listings Schema (shared across users)
const globalVerificationMappedListingSchema = new mongoose.Schema({
  listing_id: { type: String, required: true, unique: true },
  created_at: { type: Date, default: Date.now }
});

const GlobalVerificationMappedListing = mongoose.model('GlobalVerificationMappedListing', globalVerificationMappedListingSchema);

// Global Verification Strategy Listings Schema (shared across users)
const globalVerificationStrategyListingSchema = new mongoose.Schema({
  listing_id: { type: String, required: true, unique: true },
  created_at: { type: Date, default: Date.now }
});

const GlobalVerificationStrategyListing = mongoose.model('GlobalVerificationStrategyListing', globalVerificationStrategyListingSchema);

// Global Verification Strategy Dates Schema (shared across users)
const globalVerificationStrategyDateSchema = new mongoose.Schema({
  listing_id: { type: String, required: true, unique: true },
  strategy_date: { type: Date, required: true },
  created_at: { type: Date, default: Date.now }
});

const GlobalVerificationStrategyDate = mongoose.model('GlobalVerificationStrategyDate', globalVerificationStrategyDateSchema);

// Global Three Day Mapped Listings Schema (shared across users)
const globalThreeDayMappedListingSchema = new mongoose.Schema({
  listing_id: { type: String, required: true, unique: true },
  created_at: { type: Date, default: Date.now }
});

const GlobalThreeDayMappedListing = mongoose.model('GlobalThreeDayMappedListing', globalThreeDayMappedListingSchema);

// Global Three Day Strategy Listings Schema (shared across users)
const globalThreeDayStrategyListingSchema = new mongoose.Schema({
  listing_id: { type: String, required: true, unique: true },
  created_at: { type: Date, default: Date.now }
});

const GlobalThreeDayStrategyListing = mongoose.model('GlobalThreeDayStrategyListing', globalThreeDayStrategyListingSchema);

// Starred Festival Mapped Listings Schema (shared across users)
const starredFestivalMappedListingSchema = new mongoose.Schema({
  listing_id: { type: String, required: true, unique: true },
  created_at: { type: Date, default: Date.now }
});

const StarredFestivalMappedListing = mongoose.model('StarredFestivalMappedListing', starredFestivalMappedListingSchema);

// Starred Festival Strategy Listings Schema (shared across users)
const starredFestivalStrategyListingSchema = new mongoose.Schema({
  listing_id: { type: String, required: true, unique: true },
  created_at: { type: Date, default: Date.now }
});

const StarredFestivalStrategyListing = mongoose.model('StarredFestivalStrategyListing', starredFestivalStrategyListingSchema);

// Starred Festival Strategy Dates Schema (shared across users)
const starredFestivalStrategyDateSchema = new mongoose.Schema({
  listing_id: { type: String, required: true, unique: true },
  strategy_date: { type: Date, required: true },
  created_at: { type: Date, default: Date.now }
});

const StarredFestivalStrategyDate = mongoose.model('StarredFestivalStrategyDate', starredFestivalStrategyDateSchema);

// Database initialization function
export async function initDatabase() {
  await connectToDatabase();
  console.log('✅ MongoDB database initialized');
}

// User management functions
export async function createUser(email, passwordHash, isAdmin = false) {
  const user = new User({
    email,
    password_hash: passwordHash,
    is_admin: isAdmin
  });
  await user.save();
  return user._id;
}

export async function getUserByEmail(email) {
  return await User.findOne({ email });
}

export async function getUserById(id) {
  return await User.findById(id);
}

export async function updateUser(userId, userData) {
  return await User.findByIdAndUpdate(userId, userData, { new: true });
}

export async function deleteUser(userId) {
  return await User.findByIdAndDelete(userId);
}

export async function toggleAdminStatus(userId) {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  
  user.is_admin = !user.is_admin;
  await user.save();
  return user.is_admin;
}

export async function updateLastLogin(userId) {
  return await User.findByIdAndUpdate(userId, { last_login: new Date() });
}

export async function getAllUsers() {
  return await User.find({}, { password_hash: 0 });
}

export async function updateUserPassword(userId, passwordHash) {
  return await User.findByIdAndUpdate(userId, { password_hash: passwordHash });
}

// Bookmark functions
export async function getBookmarks(userId) {
  const bookmarks = await Bookmark.find({ user_id: userId });
  // Return only the event IDs for compatibility with frontend
  return bookmarks.map(bookmark => bookmark.event_id);
}

export async function addBookmark(userId, eventId) {
  try {
    const bookmark = new Bookmark({ user_id: userId, event_id: eventId });
    await bookmark.save();
    return true;
  } catch (error) {
    if (error.code === 11000) return false; // Already exists
    throw error;
  }
}

export async function removeBookmark(userId, eventId) {
  const result = await Bookmark.deleteOne({ user_id: userId, event_id: eventId });
  return result.deletedCount > 0;
}

// Custom marketplace links functions
export async function getCustomMarketplaceLinks(userId, eventId) {
  const links = await CustomMarketplaceLink.find({ user_id: userId, event_id: eventId });
  // Return as object for frontend compatibility: { marketplace_type: link }
  const linksObject = {};
  links.forEach(link => {
    linksObject[link.marketplace_type.toLowerCase()] = link.link;
  });
  return linksObject;
}

export async function setCustomMarketplaceLink(userId, eventId, marketplaceType, link) {
  return await CustomMarketplaceLink.findOneAndUpdate(
    { user_id: userId, event_id: eventId, marketplace_type: marketplaceType },
    { link, updated_at: new Date() },
    { upsert: true, new: true }
  );
}

// Custom listing links functions
export async function getCustomListingLinks(userId, listingId) {
  return await CustomListingLink.find({ user_id: userId, listing_id: listingId });
}

export async function setCustomListingLink(userId, listingId, marketplaceType, link) {
  return await CustomMarketplaceLink.findOneAndUpdate(
    { user_id: userId, listing_id: listingId, marketplace_type: marketplaceType },
    { link, updated_at: new Date() },
    { upsert: true, new: true }
  );
}

// Manual categories functions
export async function getManualCategories(userId) {
  const categories = await ManualCategory.find({ user_id: userId });
  // Return as object for frontend compatibility: { section: category }
  const categoryObject = {};
  categories.forEach(cat => {
    categoryObject[cat.section] = cat.category;
  });
  return categoryObject;
}

export async function setManualCategory(userId, section, category) {
  return await ManualCategory.findOneAndUpdate(
    { user_id: userId, section },
    { category, updated_at: new Date() },
    { upsert: true, new: true }
  );
}

export async function deleteManualCategory(userId, section) {
  return await ManualCategory.deleteOne({ user_id: userId, section });
}

// Autopriced listings functions
export async function getAutopricedListings(userId) {
  const listings = await AutopricedListing.find({ user_id: userId });
  // Return as object for frontend compatibility: { listing_id: is_autopriced }
  const listingsObject = {};
  listings.forEach(listing => {
    listingsObject[listing.listing_id] = listing.is_autopriced;
  });
  return listingsObject;
}

export async function setAutopricedListing(userId, listingId, isAutopriced) {
  return await AutopricedListing.findOneAndUpdate(
    { user_id: userId, listing_id: listingId },
    { is_autopriced: isAutopriced, updated_at: new Date() },
    { upsert: true, new: true }
  );
}

// Listing tags functions
export async function getListingTags(userId) {
  const tags = await ListingTag.find({ user_id: userId });
  // Return as object for frontend compatibility: { listing_id: [tags] }
  const tagsObject = {};
  tags.forEach(tag => {
    if (!tagsObject[tag.listing_id]) {
      tagsObject[tag.listing_id] = [];
    }
    tagsObject[tag.listing_id].push(tag.tag);
  });
  return tagsObject;
}

export async function addListingTag(userId, listingId, tag) {
  try {
    const listingTag = new ListingTag({ user_id: userId, listing_id: listingId, tag });
    await listingTag.save();
    return true;
  } catch (error) {
    if (error.code === 11000) return false; // Already exists
    throw error;
  }
}

export async function removeListingTag(userId, listingId, tag) {
  const result = await ListingTag.deleteOne({ user_id: userId, listing_id: listingId, tag });
  return result.deletedCount > 0;
}

export async function addBulkListingTags(userId, listingIds, tag) {
  const operations = listingIds.map(listingId => ({
    insertOne: {
      document: { user_id: userId, listing_id: listingId, tag }
    }
  }));
  
  try {
    await ListingTag.bulkWrite(operations, { ordered: false });
    return true;
  } catch (error) {
    // Some tags might already exist, which is fine
    return true;
  }
}

// Unverification dates functions
export async function getUnverificationDates(userId) {
  const dates = await UnverificationDate.find({ user_id: userId });
  // Return as object for frontend compatibility: { listing_id: unverification_date }
  const datesObject = {};
  dates.forEach(date => {
    datesObject[date.listing_id] = date.unverification_date;
  });
  return datesObject;
}

export async function setUnverificationDate(userId, listingId, unverificationDate) {
  return await UnverificationDate.findOneAndUpdate(
    { user_id: userId, listing_id: listingId },
    { unverification_date: new Date(unverificationDate) },
    { upsert: true, new: true }
  );
}

export async function removeUnverificationDate(userId, listingId) {
  const result = await UnverificationDate.deleteOne({ user_id: userId, listing_id: listingId });
  return result.deletedCount > 0;
}

// Verification mapped listings functions
export async function getVerificationMappedListings(userId) {
  const listings = await VerificationMappedListing.find({ user_id: userId });
  // Return only the listing IDs for frontend compatibility
  return listings.map(listing => listing.listing_id);
}

export async function addVerificationMappedListing(userId, listingId) {
  try {
    const mappedListing = new VerificationMappedListing({ user_id: userId, listing_id: listingId });
    await mappedListing.save();
    return true;
  } catch (error) {
    if (error.code === 11000) return false; // Already exists
    throw error;
  }
}

export async function removeVerificationMappedListing(userId, listingId) {
  const result = await VerificationMappedListing.deleteOne({ user_id: userId, listing_id: listingId });
  return result.deletedCount > 0;
}

// Verification strategy listings functions
export async function getVerificationStrategyListings(userId) {
  const listings = await VerificationStrategyListing.find({ user_id: userId });
  // Return only the listing IDs for frontend compatibility
  return listings.map(listing => listing.listing_id);
}

export async function addVerificationStrategyListing(userId, listingId) {
  try {
    const strategyListing = new VerificationStrategyListing({ user_id: userId, listing_id: listingId });
    await strategyListing.save();
    return true;
  } catch (error) {
    if (error.code === 11000) return false; // Already exists
    throw error;
  }
}

export async function removeVerificationStrategyListing(userId, listingId) {
  const result = await VerificationStrategyListing.deleteOne({ user_id: userId, listing_id: listingId });
  return result.deletedCount > 0;
}

// Verification strategy dates functions
export async function getVerificationStrategyDates(userId) {
  const dates = await VerificationStrategyDate.find({ user_id: userId });
  // Return as object for frontend compatibility: { listing_id: strategy_date }
  const datesObject = {};
  dates.forEach(date => {
    datesObject[date.listing_id] = date.strategy_date;
  });
  return datesObject;
}

export async function setVerificationStrategyDate(userId, listingId, strategyDate) {
  return await VerificationStrategyDate.findOneAndUpdate(
    { user_id: userId, listing_id: listingId },
    { strategy_date: new Date(strategyDate) },
    { upsert: true, new: true }
  );
}

export async function removeVerificationStrategyDate(userId, listingId) {
  const result = await VerificationStrategyDate.deleteOne({ user_id: userId, listing_id: listingId });
  return result.deletedCount > 0;
}

// Three day mapped listings functions
export async function getThreeDayMappedListings(userId) {
  const listings = await ThreeDayMappedListing.find({ user_id: userId });
  // Return only the listing IDs for frontend compatibility
  return listings.map(listing => listing.listing_id);
}

export async function addThreeDayMappedListing(userId, listingId) {
  try {
    const mappedListing = new ThreeDayMappedListing({ user_id: userId, listing_id: listingId });
    await mappedListing.save();
    return true;
  } catch (error) {
    if (error.code === 11000) return false; // Already exists
    throw error;
  }
}

export async function removeThreeDayMappedListing(userId, listingId) {
  const result = await ThreeDayMappedListing.deleteOne({ user_id: userId, listing_id: listingId });
  return result.deletedCount > 0;
}

// Three day strategy listings functions
export async function getThreeDayStrategyListings(userId) {
  const listings = await ThreeDayStrategyListing.find({ user_id: userId });
  // Return only the listing IDs for frontend compatibility
  return listings.map(listing => listing.listing_id);
}

export async function addThreeDayStrategyListing(userId, listingId) {
  try {
    const strategyListing = new ThreeDayStrategyListing({ user_id: userId, listing_id: listingId });
    await strategyListing.save();
    return true;
  } catch (error) {
    if (error.code === 11000) return false; // Already exists
    throw error;
  }
}

export async function removeThreeDayStrategyListing(userId, listingId) {
  const result = await ThreeDayStrategyListing.deleteOne({ user_id: userId, listing_id: listingId });
  return result.deletedCount > 0;
}

// Global verification mapped listings functions (shared across users)
export async function getGlobalVerificationMappedListings() {
  const listings = await GlobalVerificationMappedListing.find({}, 'listing_id');
  return listings.map(listing => listing.listing_id);
}

export async function addGlobalVerificationMappedListing(listingId) {
  try {
    const mappedListing = new GlobalVerificationMappedListing({ listing_id: listingId });
    await mappedListing.save();
    return true;
  } catch (error) {
    if (error.code === 11000) return false; // Already exists
    throw error;
  }
}

export async function removeGlobalVerificationMappedListing(listingId) {
  const result = await GlobalVerificationMappedListing.deleteOne({ listing_id: listingId });
  return result.deletedCount > 0;
}

// Global verification strategy listings functions (shared across users)
export async function getGlobalVerificationStrategyListings() {
  const listings = await GlobalVerificationStrategyListing.find({}, 'listing_id');
  return listings.map(listing => listing.listing_id);
}

export async function addGlobalVerificationStrategyListing(listingId) {
  try {
    const strategyListing = new GlobalVerificationStrategyListing({ listing_id: listingId });
    await strategyListing.save();
    return true;
  } catch (error) {
    if (error.code === 11000) return false; // Already exists
    throw error;
  }
}

export async function removeGlobalVerificationStrategyListing(listingId) {
  const result = await GlobalVerificationStrategyListing.deleteOne({ listing_id: listingId });
  return result.deletedCount > 0;
}

// Global verification strategy dates functions (shared across users)
export async function getGlobalVerificationStrategyDates() {
  const dates = await GlobalVerificationStrategyDate.find({}, 'listing_id strategy_date');
  const result = {};
  dates.forEach(date => {
    result[date.listing_id] = date.strategy_date;
  });
  return result;
}

export async function setGlobalVerificationStrategyDate(listingId, strategyDate) {
  return await GlobalVerificationStrategyDate.findOneAndUpdate(
    { listing_id: listingId },
    { strategy_date: new Date(strategyDate) },
    { upsert: true, new: true }
  );
}

export async function removeGlobalVerificationStrategyDate(listingId) {
  const result = await GlobalVerificationStrategyDate.deleteOne({ listing_id: listingId });
  return result.deletedCount > 0;
}

// Global three day mapped listings functions (shared across users)
export async function getGlobalThreeDayMappedListings() {
  const listings = await GlobalThreeDayMappedListing.find({}, 'listing_id');
  return listings.map(listing => listing.listing_id);
}

export async function addGlobalThreeDayMappedListing(listingId) {
  try {
    const mappedListing = new GlobalThreeDayMappedListing({ listing_id: listingId });
    await mappedListing.save();
    return true;
  } catch (error) {
    if (error.code === 11000) return false; // Already exists
    throw error;
  }
}

export async function removeGlobalThreeDayMappedListing(listingId) {
  const result = await GlobalThreeDayMappedListing.deleteOne({ listing_id: listingId });
  return result.deletedCount > 0;
}

// Global three day strategy listings functions (shared across users)
export async function getGlobalThreeDayStrategyListings() {
  const listings = await GlobalThreeDayStrategyListing.find({}, 'listing_id');
  return listings.map(listing => listing.listing_id);
}

export async function addGlobalThreeDayStrategyListing(listingId) {
  try {
    const strategyListing = new GlobalThreeDayStrategyListing({ listing_id: listingId });
    await strategyListing.save();
    return true;
  } catch (error) {
    if (error.code === 11000) return false; // Already exists
    throw error;
  }
}

export async function removeGlobalThreeDayStrategyListing(listingId) {
  const result = await GlobalThreeDayStrategyListing.deleteOne({ listing_id: listingId });
  return result.deletedCount > 0;
}

// Starred festival mapped listings functions (shared across users)
export async function getStarredFestivalMappedListings() {
  const listings = await StarredFestivalMappedListing.find({}, 'listing_id');
  return listings.map(listing => listing.listing_id);
}

export async function addStarredFestivalMappedListing(listingId) {
  try {
    const mappedListing = new StarredFestivalMappedListing({ listing_id: listingId });
    await mappedListing.save();
    return true;
  } catch (error) {
    if (error.code === 11000) return false; // Already exists
    throw error;
  }
}

export async function removeStarredFestivalMappedListing(listingId) {
  const result = await StarredFestivalMappedListing.deleteOne({ listing_id: listingId });
  return result.deletedCount > 0;
}

// Starred festival strategy listings functions (shared across users)
export async function getStarredFestivalStrategyListings() {
  const listings = await StarredFestivalStrategyListing.find({}, 'listing_id');
  return listings.map(listing => listing.listing_id);
}

export async function addStarredFestivalStrategyListing(listingId) {
  try {
    const strategyListing = new StarredFestivalStrategyListing({ listing_id: listingId });
    await strategyListing.save();
    return true;
  } catch (error) {
    if (error.code === 11000) return false; // Already exists
    throw error;
  }
}

export async function removeStarredFestivalStrategyListing(listingId) {
  const result = await StarredFestivalStrategyListing.deleteOne({ listing_id: listingId });
  return result.deletedCount > 0;
}

// Starred festival strategy dates functions (shared across users)
export async function getStarredFestivalStrategyDates() {
  const dates = await StarredFestivalStrategyDate.find({}, 'listing_id strategy_date');
  const result = {};
  dates.forEach(date => {
    result[date.listing_id] = date.strategy_date;
  });
  return result;
}

export async function setStarredFestivalStrategyDate(listingId, strategyDate) {
  return await StarredFestivalStrategyDate.findOneAndUpdate(
    { listing_id: listingId },
    { strategy_date: new Date(strategyDate) },
    { upsert: true, new: true }
  );
}

export async function removeStarredFestivalStrategyDate(listingId) {
  const result = await StarredFestivalStrategyDate.deleteOne({ listing_id: listingId });
  return result.deletedCount > 0;
} 