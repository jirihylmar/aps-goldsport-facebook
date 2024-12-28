# Facebook Ad Text Pushers

OPENED @hylmarj Sat Dec 28 17:25:30 CEST 2024 pusher test fail on creative. No solution found after many attempts.

Works: 

- node src/runners/fetchDetails.js ski_instructors_are_waiting_for_you__awareness__120215151271950063
- node src/runners/updateTexts.js 120215151271950063 /home/hylmarj/doc-digital-horizon-goldsport/data/ski_instructors_are_waiting_for_you/texts.json


Does not work:

- node src/runners/fetchDetails.js families_with_children__traffic__120215323827970063
- node src/runners/updateTexts.js 120215323827970063 /home/hylmarj/doc-digital-horizon-goldsport/data/visit_our_snow_beach/texts.json

nor

- node src/runners/fetchDetails.js adult_ski_beginner__traffic__120215321990480063
- node src/runners/updateTexts.js 120215321990480063 /home/hylmarj/doc-digital-horizon-goldsport/data/never_too_late/texts.json

---

Modules for updating text content in Facebook ads using the Marketing API. Handles multiple language variants and creative variations while maintaining original ad structure.


## TextPusher

### Overview

TextPusher handles updating text content in Facebook ads while:
- Preserving original creative assets (images, videos)
- Supporting multiple language variations
- Handling language-specific URL formats
- Maintaining ad optimization settings

### URL Formats

URLs are automatically formatted based on ad language:

**Czech (cs):**
- Website URL: `https://www.classicskischool.cz/`
- Display URL: `www.classicskischool.cz`

**Other Languages (en, de, pl):**
- Website URL: `https://www.classicskischool.cz/{language}/`
- Display URL: `www.classicskischool.cz/{language}/`

### Technical Implementation

The pusher maintains ad structure by:
1. Preserving original creative assets and settings
2. Creating new creative with updated texts
3. Updating ad to use new creative

```javascript
// Example usage
const pusher = new TextPusher();
await pusher.loadAndPushTexts(adId, textsFilePath);
```

### Methods

#### loadAndPushTexts(adId, textsFilePath)
Main method for updating ad texts:
- Reads text configuration file
- Determines correct language from ad name
- Applies appropriate URL format
- Updates ad creative

#### updateAdCreative(adId, texts)
Internal method that:
- Retrieves original creative details
- Preserves all assets and settings
- Creates new creative with updated texts
- Updates links based on language

### Critical Requirements

1. **Text Structure**
   - Texts must be provided in correct format
   - Each text component (primary_text, headline, description) required
   - Language codes must match ad naming

2. **Asset Preservation**
   - All original images/videos preserved
   - Original CTA types maintained
   - Original optimization settings kept

3. **Language Handling**
   - Language extracted from ad name (e.g., "__en", "__cs")
   - URLs formatted according to language
   - All texts must exist for specified language

### Error Handling

The pusher includes handling for:
- Missing/invalid ad creative
- Invalid language codes
- Missing text content
- API failures

### Implementation Notes

1. **Asset Feed Spec Structure**
   ```javascript
   asset_feed_spec: {
       images: [/* original images */],
       videos: [/* original videos */],
       bodies: [{ text: "updated text" }],
       titles: [{ text: "updated headline" }],
       descriptions: [{ text: "updated description" }],
       link_urls: [{ 
           website_url: "formatted URL",
           display_url: "formatted display URL"
       }]
   }
   ```

2. **Creative Settings**
   ```javascript
   {
       object_story_spec: {
           page_id: "original page ID",
           instagram_actor_id: "original IG ID"
       },
       object_type: "SHARE",
       name: "New Creative..."
   }
   ```

### Troubleshooting Common Issues

1. **Missing Creative**
   - Verify ad ID exists
   - Check API permissions
   - Ensure ad is active

2. **Language Issues**
   - Verify ad name contains language code
   - Check text file has language content
   - Validate URL format matches language

3. **Text Update Failures**
   - Confirm text format correct
   - Check all required fields present
   - Verify no text length violations


## Initial Approach Problems
Our initial attempts faced several issues:

1. **First Attempt**: Tried to directly update the creative
   ```javascript
   // ❌ Didn't work
   await this.makeApiCall(
       `/${creativeId}`,
       'POST',
       {
           title: newText.title,
           body: newText.body,
           link_description: newText.description
       }
   );
   ```
   Problem: Cannot directly modify existing creative content

2. **Second Attempt**: Tried to update the underlying post
   ```javascript
   // ❌ Didn't work - Permission error
   await this.makeApiCall(
       `/${postId}`,
       'POST',
       {
           message: newText.body
       }
   );
   ```
   Problem: No permissions to edit the underlying post

3. **Third Attempt**: Tried creating a simple link ad creative
   ```javascript
   // ❌ Didn't work - Wrong format
   await this.makeApiCall(
       `/act_${accountId}/adcreatives`,
       'POST',
       {
           object_story_spec: {
               link_data: {
                   message: newText.body,
                   link: "https://ryzovisteharrachov.cz/"
               }
           }
       }
   );
   ```
   Problem: Didn't match the dynamic creative format

## Working Solution
The solution that worked involves:

1. **Recognizing the Ad Type**: Understanding it's a dynamic creative ad using `asset_feed_spec`

2. **Preserving Original Structure**: Keeping all the original creative's structure:
   ```javascript
   {
       object_story_spec: {
           page_id: originalCreative.object_story_spec.page_id,
           instagram_actor_id: originalCreative.object_story_spec.instagram_actor_id
       },
       asset_feed_spec: {
           images: originalCreative.asset_feed_spec.images,
           videos: originalCreative.asset_feed_spec.videos,
           // Other original settings...
       }
   }
   ```

3. **Correct Text Update Format**: Using the proper structure for text updates:
   ```javascript
   bodies: [{
       text: newText.body
   }],
   titles: [{
       text: newText.title
   }],
   descriptions: [{
       text: newText.description
   }]
   ```

4. **Removed Problematic Fields**: 
   - Removed `degrees_of_freedom_spec`
   - Removed attempt to modify standard enhancements
   - Removed direct link_data modifications

5. **Kept Essential Settings**:
   ```javascript
   optimization_type: "REGULAR",
   ad_formats: ["AUTOMATIC_FORMAT"],
   call_to_action_types: originalCreative.asset_feed_spec.call_to_action_types,
   link_urls: originalCreative.asset_feed_spec.link_urls
   ```

## Critical Insights

1. **Ad Format Recognition**
   - The ads were using dynamic creative optimization
   - Required using asset_feed_spec instead of simple link_data

2. **Asset Preservation**
   - All original images and videos must be included
   - Original CTAs and links must be preserved
   - Instagram integration settings must be maintained

3. **Text Update Structure**
   - Text updates must be in arrays of objects with `text` property
   - Each text type (body, title, description) needs its own array

4. **API Requirements**
   - Cannot modify existing creatives
   - Must create new creative and update ad to use it
   - Must maintain all original optimization settings

## Final Working Code Structure
```javascript
const createResponse = await this.makeApiCall(
    `/act_${accountId}/adcreatives`,
    'POST',
    {
        object_story_spec: {
            page_id: originalCreative.object_story_spec.page_id,
            instagram_actor_id: originalCreative.object_story_spec.instagram_actor_id
        },
        asset_feed_spec: {
            // Original assets
            images: originalCreative.asset_feed_spec.images,
            videos: originalCreative.asset_feed_spec.videos,
            
            // Updated text
            bodies: [{ text: newText.body }],
            titles: [{ text: newText.title }],
            descriptions: [{ text: newText.description }],
            
            // Original settings
            call_to_action_types: originalCreative.asset_feed_spec.call_to_action_types,
            link_urls: originalCreative.asset_feed_spec.link_urls,
            
            // Required settings
            ad_formats: ["AUTOMATIC_FORMAT"],
            optimization_type: "REGULAR"
        },
        object_type: "SHARE",
        name: `New Creative for Ad ${adId} - ${new Date().toISOString()}`
    }
);
```