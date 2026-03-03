/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns distance in meters
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

/**
 * Estimate travel time based on distance
 * Simple model: assume average speed of 50 km/h in emergency
 */
function estimateTravelTime(distanceMeters) {
    const avgSpeedMps = 50000 / 3600; // 50 km/h in m/s
    return Math.round(distanceMeters / avgSpeedMps);
}

/**
 * Check if capability requirements are met
 */
function matchesCapability(resourceCapabilities, requiredCapability) {
    if (!requiredCapability) return true;
    return resourceCapabilities.includes(requiredCapability);
}

module.exports = {
    calculateDistance,
    estimateTravelTime,
    matchesCapability
};
