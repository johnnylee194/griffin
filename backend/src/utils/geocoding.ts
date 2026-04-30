import axios from 'axios';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'Griffin-Mahjong-App/1.0 (https://github.com/johnnylee194/griffin)';
const MIN_REQUEST_INTERVAL = 1001; // 1 req/s rate limit

// Memory cache for geocoding results
const cache = new Map<string, { latitude: number; longitude: number }>();

// Track last request time for rate limiting
let lastRequestTime = 0;

/**
 * Geocode a city name to latitude/longitude using Nominatim API
 * @param cityName - City name to geocode (e.g., "成都", "北京")
 * @returns Promise<{ latitude: number, longitude: number }>
 * @throws Error if city not found or API error
 */
export async function geocode(cityName: string): Promise<{ latitude: number; longitude: number }> {
  const normalizedName = cityName.trim();

  // Check cache first
  if (cache.has(normalizedName)) {
    return cache.get(normalizedName)!;
  }

  // Rate limiting: wait if needed
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }

  lastRequestTime = Date.now();

  try {
    const response = await axios.get(NOMINATIM_URL, {
      params: {
        q: normalizedName,
        format: 'json',
        limit: 1,
      },
      headers: {
        'User-Agent': USER_AGENT,
      },
      timeout: 10000, // 10s timeout
    });

    if (!response.data || response.data.length === 0) {
      throw new Error(`City not found: ${normalizedName}`);
    }

    const result = {
      latitude: parseFloat(response.data[0].lat),
      longitude: parseFloat(response.data[0].lon),
    };

    // Cache the result
    cache.set(normalizedName, result);

    return result;
  } catch (error: any) {
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      throw new Error(`Geocoding timeout for: ${normalizedName}`);
    }
    if (error.response?.status === 429) {
      throw new Error('Nominatim rate limit exceeded. Please try again later.');
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
