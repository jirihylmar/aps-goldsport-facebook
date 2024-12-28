const fs = require('fs');
const path = require('path');
const BaseFetcher = require('../fetchers/base/baseFetcher');

class TextPusher extends BaseFetcher {
    constructor() {
        super();
    }

    async updateAdCreative(adId, texts) {
        try {
            const adResponse = await this.makeApiCall(
                `/${adId}`,
                'GET',
                { 
                    fields: ['creative{id,object_story_spec,object_type,asset_feed_spec},account_id,name']
                }
            );

            if (!adResponse.creative) {
                throw new Error(`Could not find creative for ad ${adId}`);
            }

            const accountId = adResponse.account_id || this.accountId;
            const originalCreative = adResponse.creative;

            // Extract language from ad name
            const languageMatch = adResponse.name.match(/__([a-z]{2})(?:_|$)/);
            const language = languageMatch ? languageMatch[1] : 'en';

            // Create URLs based on language
            const baseUrl = language === 'cs' 
                ? 'https://www.classicskischool.cz/'
                : `https://www.classicskischool.cz/${language}/`;
            
            const displayUrl = language === 'cs'
                ? 'www.classicskischool.cz'
                : `www.classicskischool.cz/${language}/`;

            // Get campaign ID from ad name if present
            const campaignMatch = adResponse.name.match(/(\d+)(?:__[a-z]{2})?$/);
            const campaignId = campaignMatch ? campaignMatch[1] : '';
            const fullUrl = campaignId ? `${baseUrl}?id=${campaignId}` : baseUrl;

            // Get original labels from first items
            const originalBody = originalCreative.asset_feed_spec.bodies[0];
            const originalTitle = originalCreative.asset_feed_spec.titles[0];
            const originalLinkUrl = originalCreative.asset_feed_spec.link_urls[0];

            // Create new creative keeping all original structure
            const createResponse = await this.makeApiCall(
                `/act_${accountId}/adcreatives`,
                'POST',
                {
                    object_story_spec: originalCreative.object_story_spec,
                    asset_feed_spec: {
                        images: originalCreative.asset_feed_spec.images,
                        videos: originalCreative.asset_feed_spec.videos,
                        bodies: texts.map(text => ({
                            text: text.primary_text,
                            adlabels: originalBody.adlabels
                        })),
                        titles: texts.map(text => ({
                            text: text.headline,
                            adlabels: originalTitle.adlabels
                        })),
                        descriptions: texts.map(text => ({
                            text: text.description
                        })),
                        link_urls: [{
                            website_url: fullUrl,
                            display_url: displayUrl,
                            adlabels: originalLinkUrl.adlabels
                        }],
                        call_to_action_types: originalCreative.asset_feed_spec.call_to_action_types,
                        ad_formats: ["AUTOMATIC_FORMAT"],
                        asset_customization_rules: originalCreative.asset_feed_spec.asset_customization_rules,
                        optimization_type: originalCreative.asset_feed_spec.optimization_type,
                        additional_data: originalCreative.asset_feed_spec.additional_data
                    },
                    object_type: originalCreative.object_type,
                    name: `${originalCreative.name || 'Creative'} - Updated ${new Date().toISOString()}`
                }
            );

            if (!createResponse.id) {
                throw new Error('Failed to create new creative');
            }

            // Update the ad with the new creative
            const updateAdResponse = await this.makeApiCall(
                `/${adId}`,
                'POST',
                {
                    creative: { creative_id: createResponse.id }
                }
            );

            return updateAdResponse;

        } catch (error) {
            console.error('Detailed error:', JSON.stringify(error, null, 2));
            return this.handleError(error, 'updateAdCreative');
        }
    }

    async loadAndPushTexts(adId, textsFilePath) {
        try {
            // Read texts configuration
            const textsConfig = JSON.parse(fs.readFileSync(textsFilePath, 'utf8'));

            // Find the theme (assuming first theme)
            const theme = textsConfig.themes[0];
            if (!theme) {
                throw new Error('No theme found in texts configuration');
            }

            // Get ad details to determine language
            const outputDir = path.join(process.cwd(), 'src', 'output');
            const files = fs.readdirSync(outputDir)
                .filter(f => f.startsWith('campaign_') && f.endsWith('_details.json'))
                .sort()
                .reverse();

            let adDetails = null;
            for (const file of files) {
                const content = JSON.parse(fs.readFileSync(path.join(outputDir, file), 'utf8'));
                // Look through adSets for the ad
                for (const adSet of content.adSets) {
                    const ad = adSet.ads.find(ad => ad.id === adId);
                    if (ad) {
                        adDetails = ad;
                        break;
                    }
                }
                if (adDetails) break;
            }

            if (!adDetails) {
                throw new Error(`Could not find details for ad ${adId}`);
            }

            // Extract language from ad name
            const languageMatch = adDetails.name.match(/__([a-z]{2})(?:_|$)/);
            if (!languageMatch) {
                throw new Error(`Could not extract language from ad name: ${adDetails.name}`);
            }
            const language = languageMatch[1];

            // Get language-specific texts
            const texts = theme.content[language];
            if (!texts) {
                throw new Error(`No texts found for language ${language}`);
            }

            // Push all text variations to Facebook
            const updateResult = await this.updateAdCreative(adId, texts);

            if (updateResult.success !== false) {
                // Save record of successful update
                const timestamp = new Date().toISOString().replace(/:/g, '-');
                const outputPath = path.join(outputDir,
                    `text_push_${adId}___${adDetails.name}___${timestamp}.json`);
                fs.writeFileSync(outputPath, JSON.stringify({
                    adId,
                    adName: adDetails.name,
                    timestamp,
                    textsFile: textsFilePath,
                    language,
                    updatedTexts: texts,
                    apiResponse: updateResult
                }, null, 2));

                console.log('Text update completed successfully');
                return { success: true, result: updateResult };
            } else {
                throw new Error('Failed to update ad creative: ' + updateResult.error);
            }

        } catch (error) {
            return this.handleError(error, 'loadAndPushTexts');
        }
    }
}

module.exports = TextPusher;