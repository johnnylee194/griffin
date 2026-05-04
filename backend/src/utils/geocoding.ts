import axios from 'axios';

const AMAP_URL = 'https://restapi.amap.com/v3/geocode/geo';
const AMAP_KEY = process.env.AMAP_API_KEY || '';

// Memory cache for geocoding results
const cache = new Map<string, { latitude: number; longitude: number }>();

/**
 * Geocode a city name to latitude/longitude using AMap (高德地图) API
 * @param cityName - City name to geocode (e.g., "成都", "北京", "渠县")
 * @returns Promise<{ latitude: number, longitude: number }>
 * @throws Error if city not found or API error
 */
export async function geocode(cityName: string): Promise<{ latitude: number; longitude: number }> {
  if (!AMAP_KEY) {
    throw new Error('AMAP_API_KEY environment variable is not set');
  }

  const normalizedName = cityName.trim();

  // Check cache first
  if (cache.has(normalizedName)) {
    return cache.get(normalizedName)!;
  }

  try {
    const response = await axios.get(AMAP_URL, {
      params: {
        key: AMAP_KEY,
        address: normalizedName,
      },
      timeout: 10000,
    });

    const data = response.data;

    if (data.status !== '1') {
      throw new Error(`AMap geocoding failed: ${data.info || 'unknown error'}`);
    }

    const geocodes = data.geocodes;
    if (!geocodes || geocodes.length === 0) {
      throw new Error(`City not found: ${normalizedName}`);
    }

    const result = {
      // AMap returns [longitude, latitude], but we need { latitude, longitude }
      latitude: parseFloat(geocodes[0].location.split(',')[1]),
      longitude: parseFloat(geocodes[0].location.split(',')[0]),
    };

    // Cache the result
    cache.set(normalizedName, result);

    return result;
  } catch (error: any) {
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      throw new Error(`Geocoding timeout for: ${normalizedName}`);
    }
    if (error.response?.status === 429) {
      throw new Error('AMap rate limit exceeded. Please try again later.');
    }
    throw new Error(`Geocoding failed for ${normalizedName}: ${error.message}`);
  }
}

/**
 * Clear the geocoding cache (useful for testing)
 */
export function clearGeocodeCache(): void {
  cache.clear();
}
