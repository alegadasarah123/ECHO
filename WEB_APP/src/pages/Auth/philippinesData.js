// philippinesData.js

const PSGC_BASE_URL = 'https://psgc.rootscratch.com';

// Main data structure that will be populated
export const philippinesLocations = {};

// Helper function to fetch data from PSGC API
const fetchPSGCData = async (endpoint) => {
  try {
    const response = await fetch(`${PSGC_BASE_URL}${endpoint}`);
    if (!response.ok) throw new Error(`Failed to fetch ${endpoint}`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching data:', error);
    return [];
  }
};

// Initialize the Philippines location data
export const initializePhilippinesData = async () => {
  try {
    console.log('Initializing Philippines location data from PSGC API...');
    
    // Clear existing data
    Object.keys(philippinesLocations).forEach(key => delete philippinesLocations[key]);
    
    // Get all regions
    const regions = await fetchPSGCData('/regions');
    
    for (const region of regions) {
      const regionName = region.name;
      
      console.log(`Processing region: ${regionName}`);
      
      // Initialize region structure
      philippinesLocations[regionName] = {
        cities: [],
        barangays: {}
      };
      
      // Get provinces for this region
      const provinces = await fetchPSGCData(`/regions/${region.psgc_id}/provinces`);
      
      for (const province of provinces) {
        // Get cities and municipalities for this province
        const cities = await fetchPSGCData(`/provinces/${province.psgc_id}/cities-municipalities`);
        
        // Add cities to the region's city list
        const cityNames = cities.map(city => city.name);
        philippinesLocations[regionName].cities.push(...cityNames);
        
        // Get barangays for each city
        for (const city of cities) {
          const barangays = await fetchPSGCData(`/cities-municipalities/${city.psgc_id}/barangays`);
          const barangayNames = barangays.map(barangay => barangay.name);
          
          philippinesLocations[regionName].barangays[city.name] = barangayNames;
        }
      }
      
      // Remove duplicates from cities array
      philippinesLocations[regionName].cities = [...new Set(philippinesLocations[regionName].cities)];
    }
    
    console.log('Philippines location data initialized successfully!');
    return true;
  } catch (error) {
    console.error('Error initializing Philippines data:', error);
    return false;
  }
};

// Alternative: Lazy loading version (loads data on demand)
export const createLazyPhilippinesData = () => {
  const cache = {};
  
  return {
    // Get all provinces (regions)
    getProvinces: () => {
      return Object.keys(philippinesLocations);
    },
    
    // Get cities for a specific province
    getCities: async (province) => {
      if (!province) return [];
      
      // If data is already loaded, return from cache
      if (philippinesLocations[province]?.cities) {
        return philippinesLocations[province].cities;
      }
      
      // Otherwise, fetch from API
      try {
        const regions = await fetchPSGCData('/regions');
        const region = regions.find(r => r.name === province);
        
        if (!region) return [];
        
        const provinces = await fetchPSGCData(`/regions/${region.psgc_id}/provinces`);
        const allCities = [];
        
        for (const prov of provinces) {
          const cities = await fetchPSGCData(`/provinces/${prov.psgc_id}/cities-municipalities`);
          allCities.push(...cities.map(city => city.name));
        }
        
        // Cache the result
        if (!philippinesLocations[province]) {
          philippinesLocations[province] = { cities: [], barangays: {} };
        }
        philippinesLocations[province].cities = [...new Set(allCities)];
        
        return philippinesLocations[province].cities;
      } catch (error) {
        console.error('Error fetching cities:', error);
        return [];
      }
    },
    
    // Get barangays for a specific province and city
    getBarangays: async (province, city) => {
      if (!province || !city) return [];
      
      // If data is already loaded, return from cache
      if (philippinesLocations[province]?.barangays?.[city]) {
        return philippinesLocations[province].barangays[city];
      }
      
      // Otherwise, fetch from API
      try {
        const regions = await fetchPSGCData('/regions');
        const region = regions.find(r => r.name === province);
        
        if (!region) return [];
        
        const provinces = await fetchPSGCData(`/regions/${region.psgc_id}/provinces`);
        
        for (const prov of provinces) {
          const cities = await fetchPSGCData(`/provinces/${prov.psgc_id}/cities-municipalities`);
          const foundCity = cities.find(c => c.name === city);
          
          if (foundCity) {
            const barangays = await fetchPSGCData(`/cities-municipalities/${foundCity.psgc_id}/barangays`);
            const barangayNames = barangays.map(barangay => barangay.name);
            
            // Cache the result
            if (!philippinesLocations[province]) {
              philippinesLocations[province] = { cities: [], barangays: {} };
            }
            if (!philippinesLocations[province].barangays[city]) {
              philippinesLocations[province].barangays[city] = [];
            }
            philippinesLocations[province].barangays[city] = barangayNames;
            
            return barangayNames;
          }
        }
        
        return [];
      } catch (error) {
        console.error('Error fetching barangays:', error);
        return [];
      }
    }
  };
};

// Export the lazy data loader
export const lazyPhilippinesData = createLazyPhilippinesData();

// Legacy functions for backward compatibility
export const provinces = Object.keys(philippinesLocations);

export const getCities = (province) => {
  return province ? philippinesLocations[province]?.cities || [] : [];
};

export const getBarangays = (province, city) => {
  if (!province || !city) return [];
  return philippinesLocations[province]?.barangays?.[city] || [];
};