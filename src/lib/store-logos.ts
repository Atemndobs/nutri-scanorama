// Map store names to their logo files
export const storeLogos: Record<string, string> = {
  'dm': '/images/Dm-drogerie.svg',
  'lidl': '/images/Lidl_logo.png',
  'aldi': '/images/aldi_sud.jpg',
  'edeka': '/images/edeka.png',
  'nahkauf': '/images/nahkauf.png',
  'rewe': '/images/rewe.png',
  'rossmann': '/images/rossman.png'
};

// Function to get logo URL for a store
export function getStoreLogo(storeName: string): string | undefined {
  if (!storeName) return undefined;
  
  // Convert store name to lowercase for case-insensitive matching
  const normalizedName = storeName.toLowerCase();
  
  // Check for exact match
  if (storeLogos[normalizedName]) {
    return storeLogos[normalizedName];
  }
  
  // Check for partial matches
  for (const [key, logo] of Object.entries(storeLogos)) {
    if (normalizedName.includes(key)) {
      return logo;
    }
  }
  
  return undefined;
}
