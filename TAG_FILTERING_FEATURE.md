# Tag Filtering Feature for Sales Performance

## Overview
The Sales Performance tab now includes comprehensive tag filtering capabilities, allowing users to filter sales data based on tags associated with individual sale items. This feature provides granular control over which sales are displayed and analyzed.

## Features

### 1. Include Tags (Must Have)
- **Purpose**: Show only sales that contain items with at least one of the specified tags
- **Behavior**: Sales must have at least one item matching any of the selected include tags
- **Use Case**: Focus on specific ticket categories (e.g., VIP, Premium, Front Row)

### 2. Exclude Tags (Must Not Have)
- **Purpose**: Hide sales that contain items with any of the specified tags
- **Behavior**: Sales are excluded if ANY item has one of the excluded tags
- **Use Case**: Filter out unwanted categories (e.g., Economy, Back Row, Presale)

### 3. Combined Filtering
- **Purpose**: Apply both include and exclude filters simultaneously
- **Behavior**: Sales must meet both criteria:
  - Have at least one item with an include tag
  - Have no items with any exclude tags
- **Use Case**: Show only VIP tickets that are not presale

### 4. Dynamic Summary Statistics
- **Real-time Updates**: All summary metrics (Revenue, Profit, Margin) update automatically based on filtered results
- **Visual Indicators**: Summary cards show whether they display "All Sales" or "Filtered" data
- **Accurate Analysis**: Users can see the true impact of their tag filters on business metrics

## Implementation Details

### Data Flow
1. **Sales Data Loading**: Fetches sales data from the ZeroHero API
2. **Listings Data Loading**: Automatically fetches listings data to extract tags
3. **Tag Extraction**: Maps sale items to their associated tags
4. **Filtering**: Applies tag filters to create the final filtered dataset
5. **Statistics Calculation**: Recalculates all summary metrics based on filtered data

### Tag Sources
- **Primary**: Tags directly attached to sale items
- **Fallback**: Tags from associated listings (matched by listing ID)
- **Secondary**: Tags from listings matched by section/row (simplified matching)

### Filtering Logic
```javascript
// Pseudo-code for the filtering algorithm
function applyTagFilters(sales, includeTags, excludeTags) {
  return sales.filter(sale => {
    // First: Check if any item has excluded tags
    if (excludeTags.length > 0) {
      const hasExcludedTag = sale.items.some(item => 
        item.tags.some(itemTag => 
          excludeTags.some(excludeTag => 
            itemTag.toLowerCase().includes(excludeTag.toLowerCase())
          )
        )
      );
      if (hasExcludedTag) return false;
    }
    
    // Second: Check if any item matches include criteria
    if (includeTags.length > 0) {
      const hasIncludedTag = sale.items.some(item => 
        item.tags.some(itemTag => 
          includeTags.some(includeTag => 
            itemTag.toLowerCase().includes(includeTag.toLowerCase())
          )
        )
      );
      if (!hasIncludedTag) return false;
    }
    
    return true;
  });
}
```

## User Interface

### Tag Filter Section
- **Location**: Below the date filters, above the sales table
- **Layout**: Two-column grid (Include Tags | Exclude Tags)
- **Always Visible**: No longer depends on available tags being loaded

### Include Tags Panel
- **Header**: "Include Tags (must have at least one)"
- **Controls**: Text input field with "Add" button
- **Functionality**: Type tag name and press Enter or click Add
- **Styling**: Blue theme with positive connotations

### Exclude Tags Panel
- **Header**: "Exclude Tags (must not have any)"
- **Controls**: Text input field with "Add" button
- **Functionality**: Type tag name and press Enter or click Add
- **Styling**: Red theme with negative connotations

### Active Filters Display
- **Include Tags**: Blue badges with "+" prefix and remove button
- **Exclude Tags**: Red badges with "-" prefix and remove button
- **Clear All**: Button to remove all active filters
- **Dynamic**: Only appears when filters are active

### Filter Summary
- **Status Messages**: Clear indication of current filter state
- **Results Count**: Shows filtered vs. total sales count
- **Visual Indicators**: Emojis and colors for quick understanding

## Summary Statistics Updates

### Dynamic Calculation
- **Total Revenue**: Automatically recalculates based on filtered sales data
- **Total Profit**: Updates to reflect only the profit from filtered sales
- **Profit Margin**: Recalculated using filtered revenue and profit data

### Visual Indicators
- **Filtered Status**: Summary cards show "Filtered" when tag filters are active
- **All Sales Status**: Summary cards show "All Sales" when no filters are applied
- **Real-time Updates**: Statistics update immediately as filters change

### Business Impact
- **Accurate Analysis**: Users can see the true performance of specific ticket categories
- **Comparative Analysis**: Easy to compare filtered vs. unfiltered performance
- **Decision Support**: Better insights for pricing and inventory decisions

## Table Enhancements

### New Tags Column
- **Position**: Between Row and Quantity columns
- **Content**: Tag badges for each sale item
- **Fallback**: "No tags" message when no tags are present

### Tag Display
- **Format**: Small rounded badges with gray background
- **Layout**: Flexible wrapping for multiple tags
- **Readability**: Clear contrast and appropriate sizing

## Performance Considerations

### Optimizations
- **Batch Loading**: Listings data loaded once per sales data refresh
- **Caching**: Tags cached in component state
- **Efficient Filtering**: Filters applied only when data changes
- **Smart Recalculation**: Summary statistics only recalculate when necessary

### API Calls
- **Minimal Impact**: Only one additional API call per sales data refresh
- **Smart Fetching**: Only fetches listings for events with sales data
- **Error Handling**: Non-critical failures don't break sales display

## Usage Examples

### Example 1: VIP Analysis
```
Include Tags: [VIP, Premium]
Exclude Tags: []
Result: Shows only sales with VIP or Premium tickets
Summary: Revenue, Profit, and Margin reflect only VIP/Premium sales
```

### Example 2: Exclude Presale
```
Include Tags: []
Exclude Tags: [Presale, Pre-sale]
Result: Shows all sales except those with presale tickets
Summary: Revenue, Profit, and Margin exclude presale transactions
```

### Example 3: Premium Front Row Only
```
Include Tags: [Premium, Front Row]
Exclude Tags: [Economy, Back Row]
Result: Shows only premium front row tickets
Summary: All metrics reflect only premium front row performance
```

## Technical Notes

### State Management
- `includeTagInput`: Current text input value for include tags
- `excludeTagInput`: Current text input value for exclude tags
- `selectedTags`: Array of tags to include
- `excludeTags`: Array of tags to exclude
- `listingsData`: Map of listing ID to tags

### Effect Dependencies
- Tags loaded automatically when sales data changes
- Filters applied reactively when tag selections change
- Summary statistics update immediately to reflect filter changes
- UI updates in real-time for optimal user experience

### Error Handling
- Listings loading failures don't break sales display
- Graceful fallback when tags are unavailable
- Console logging for debugging purposes

## Future Enhancements

### Potential Improvements
1. **Tag Suggestions**: Auto-complete for existing tags
2. **Saved Filters**: Allow users to save and reuse filter combinations
3. **Advanced Matching**: Regex support for complex tag patterns
4. **Tag Statistics**: Show count of sales for each tag
5. **Export Filtered Data**: Download filtered results as CSV
6. **Filter Presets**: Quick access to common filter combinations

### Performance Optimizations
1. **Virtual Scrolling**: Handle large datasets more efficiently
2. **Debounced Filtering**: Reduce filter calculations during rapid changes
3. **Indexed Search**: Pre-index tags for faster filtering
4. **Lazy Loading**: Load tags on-demand for specific sections

## Testing

### Test Coverage
- **Unit Tests**: Core filtering logic tested with mock data
- **Edge Cases**: Empty tags, missing data, invalid inputs
- **Performance**: Large dataset handling
- **Integration**: End-to-end filtering workflow
- **Summary Updates**: Verification that statistics update correctly

### Test Data
- Mock sales with various tag combinations
- Edge cases (no tags, all tags, mixed scenarios)
- Performance tests with large datasets

## Conclusion

The enhanced tag filtering feature significantly improves the Sales Performance tab by providing users with:

1. **Simplified Interface**: Text input fields instead of long checkbox lists
2. **Real-time Statistics**: All summary metrics update based on filtered results
3. **Better Insights**: Accurate performance analysis for specific ticket categories
4. **Improved UX**: Faster tag entry and immediate visual feedback

The implementation is robust, performant, and user-friendly, making it easy for users to focus on specific ticket categories, exclude unwanted data, and gain deeper insights into their sales performance based on ticket characteristics and tags. The dynamic summary statistics ensure users always see accurate, relevant business metrics that reflect their current filter selections. 