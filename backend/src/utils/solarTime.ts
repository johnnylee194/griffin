/**
 * Calculate true solar time from Beijing time
 *
 * Formula: Local Solar Time = Beijing Time + (longitude - 120°E) × 4 minutes
 * East of 120°E: add time (sun is later)
 * West of 120°E: subtract time (sun is earlier)
 *
 * Example: Chengdu longitude ~104°E
 *   104 - 120 = -16°
 *   -16 × 4 = -64 minutes
 *   So Chengdu's true solar time is about 64 minutes later than Beijing time
 */

const BEIJING_STANDARD_LONGITUDE = 120; // Beijing is at 120°E

/**
 * Calculate true solar time from Beijing time and location
 * @param birthTime - Birth time in Beijing time zone (format: "HH:mm")
 * @param latitude - Latitude of birth location (not used in this simple calculation)
 * @param longitude - Longitude of birth location
 * @returns True solar time in "HH:mm" format
 */
export function calculateTrueSolarTime(
  birthTime: string,
  latitude: number,
  longitude: number
): string {
  const [hours, minutes] = birthTime.split(':').map(Number);

  // Calculate minute offset: (longitude - 120) × 4 minutes
  const minuteOffset = Math.round((longitude - BEIJING_STANDARD_LONGITUDE) * 4);

  // Convert birth time to total minutes since midnight
  const totalMinutes = hours * 60 + minutes + minuteOffset;

  // Handle day overflow/underflow
  const normalizedMinutes = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);

  // Convert back to HH:mm format
  const adjustedHours = Math.floor(normalizedMinutes / 60);
  const adjustedMinutes = normalizedMinutes % 60;

  return `${adjustedHours.toString().padStart(2, '0')}:${adjustedMinutes.toString().padStart(2, '0')}`;
}

/**
 * Get timezone offset in minutes from Beijing time
 * @param longitude - Longitude of location
 * @returns Offset in minutes (positive = east of Beijing, negative = west)
 */
export function getTimezoneOffset(longitude: number): number {
  return Math.round((longitude - BEIJING_STANDARD_LONGITUDE) * 4);
}
