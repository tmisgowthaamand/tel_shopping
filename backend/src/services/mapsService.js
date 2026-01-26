const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

class MapsService {
    constructor() {
        this.apiKey = config.googleMaps.apiKey;
        this.baseUrl = 'https://maps.googleapis.com/maps/api';
    }

    /**
     * Get human-readable address from coordinates (Reverse Geocoding)
     */
    async reverseGeocode(latitude, longitude) {
        if (!this.apiKey || this.apiKey === 'placeholder_maps_key') {
            logger.warn('Google Maps API key not configured. Returning raw coordinates.');
            return `Lat: ${latitude.toFixed(6)}, Long: ${longitude.toFixed(6)}`;
        }

        try {
            const response = await axios.get(`${this.baseUrl}/geocode/json`, {
                params: {
                    latlng: `${latitude},${longitude}`,
                    key: this.apiKey,
                },
            });

            if (response.data.status === 'OK' && response.data.results.length > 0) {
                return response.data.results[0].formatted_address;
            }

            logger.warn('Reverse geocoding failed:', response.data.status);
            return `Lat: ${latitude.toFixed(6)}, Long: ${longitude.toFixed(6)}`;
        } catch (error) {
            logger.error('Error in reverse geocoding:', error.message);
            return `Lat: ${latitude.toFixed(6)}, Long: ${longitude.toFixed(6)}`;
        }
    }

    /**
     * Get coordinates from address (Geocoding)
     */
    async geocode(address) {
        if (!this.apiKey || this.apiKey === 'placeholder_maps_key') {
            throw new Error('Google Maps API key not configured');
        }

        try {
            const response = await axios.get(`${this.baseUrl}/geocode/json`, {
                params: {
                    address: address,
                    key: this.apiKey,
                },
            });

            if (response.data.status === 'OK' && response.data.results.length > 0) {
                const location = response.data.results[0].geometry.location;
                return {
                    address: response.data.results[0].formatted_address,
                    latitude: location.lat,
                    longitude: location.lng,
                };
            }

            throw new Error(`Geocoding failed: ${response.data.status}`);
        } catch (error) {
            logger.error('Error in geocoding:', error.message);
            throw error;
        }
    }
}

module.exports = new MapsService();
