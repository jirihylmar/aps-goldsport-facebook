const BaseFetcher = require('../base/baseFetcher');

class AdDetailsFetcher extends BaseFetcher {
    constructor() {
        super();
    }

    async fetchAds(adSetId) {
        try {
            const fields = [
                'id',
                'name',
                'status',
                'creative'
            ];

            const response = await this.makeApiCall(
                `/${adSetId}/ads`,
                'GET',
                { fields: fields.join(',') }
            );

            return response.data || [];
        } catch (error) {
            return this.handleError(error, 'fetchAds');
        }
    }

    async fetchCreativeDetails(creativeId) {
        try {
            const fields = [
                'id',
                'name',
                'title',
                'body',
                'image_url',
                'video_id',
                'thumbnail_url',
                'link_url',
                'call_to_action_type',
                'object_story_spec',
                'asset_feed_spec'
            ];

            const response = await this.makeApiCall(
                `/${creativeId}`,
                'GET',
                { fields: fields.join(',') }
            );

            return response;
        } catch (error) {
            return this.handleError(error, 'fetchCreativeDetails');
        }
    }

    async processCreativeContent(creative) {
        if (!creative) return {};

        const content = {
            media: [],
            text: {},
            urls: [],
            placements: []
        };

        // Process asset feed spec if available
        if (creative.asset_feed_spec) {
            const spec = creative.asset_feed_spec;

            // Process images
            if (spec.images) {
                content.media.push(...spec.images.map(img => ({
                    type: 'image',
                    hash: img.hash,
                    labels: img.adlabels
                })));
            }

            // Process videos
            if (spec.videos) {
                content.media.push(...spec.videos.map(video => ({
                    type: 'video',
                    id: video.video_id,
                    thumbnail: video.thumbnail_url,
                    labels: video.adlabels
                })));
            }

            // Process text content
            if (spec.titles && spec.titles[0]) {
                content.text.title = spec.titles[0].text;
            }
            if (spec.bodies && spec.bodies[0]) {
                content.text.body = spec.bodies[0].text;
            }
            if (spec.descriptions && spec.descriptions[0]) {
                content.text.description = spec.descriptions[0].text;
            }

            // Process URLs
            if (spec.link_urls) {
                content.urls = spec.link_urls.map(url => ({
                    website: url.website_url,
                    display: url.display_url,
                    labels: url.adlabels
                }));
            }

            // Process CTA
            if (spec.call_to_action_types) {
                content.callToAction = spec.call_to_action_types[0];
            }

            // Process placement rules
            if (spec.asset_customization_rules) {
                content.placements = spec.asset_customization_rules.map(rule => ({
                    priority: rule.priority,
                    platforms: rule.customization_spec.publisher_platforms,
                    positions: {
                        facebook: rule.customization_spec.facebook_positions,
                        instagram: rule.customization_spec.instagram_positions
                    },
                    age: {
                        min: rule.customization_spec.age_min,
                        max: rule.customization_spec.age_max
                    }
                }));
            }
        }

        // Add page and Instagram info if available
        if (creative.object_story_spec) {
            content.pages = {
                facebook: creative.object_story_spec.page_id,
                instagram: creative.object_story_spec.instagram_actor_id
            };
        }

        return content;
    }

    async fetchMediaDetails(creativeId) {
        try {
            const creative = await this.fetchCreativeDetails(creativeId);
            const content = await this.processCreativeContent(creative);
            
            return {
                id: creative.id,
                name: creative.name,
                content: content
            };
        } catch (error) {
            console.error(`Error processing creative ${creativeId}:`, error);
            return {
                type: 'unknown',
                error: error.message
            };
        }
    }

    async fetchTextContent(creativeId) {
        try {
            const creative = await this.fetchCreativeDetails(creativeId);
            const content = await this.processCreativeContent(creative);
            
            return content.text || {};
        } catch (error) {
            console.error(`Error fetching text content for creative ${creativeId}:`, error);
            return {};
        }
    }
}

module.exports = AdDetailsFetcher;