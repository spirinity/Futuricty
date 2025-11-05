// AI service for generating location summaries using our backend API
import { cacheService } from './cacheService';

interface LocationData {
  address: string;
  facilityCounts: {
    health: number;
    education: number;
    market: number;
    transport: number;
    walkability: number;
    recreation: number;
    safety: number;
    police: number;
    religious: number;
    accessibility: number;
  };
  scores: {
    overall: number;
    services: number;
    mobility: number;
    safety: number;
    environment: number;
  };
  nearbyFacilities: string[];
}

type UserMode = "residents" | "business-owner" | "urban-planner";
type Language = "en" | "id";

// Generate AI summary for a location based on user mode and language
export const generateLocationSummary = async (locationData: LocationData, userMode: UserMode = "residents", language: Language = "en"): Promise<string> => {
  // Validate input data
  if (!locationData || !locationData.address) {
    return 'Unable to generate summary: Invalid location data.';
  }
  
  if (!locationData.facilityCounts || !locationData.scores) {
    return 'Unable to generate summary: Missing required data.';
  }
  
  // Create a unique prompt for caching
  const prompt = `${locationData.address}-${JSON.stringify(locationData.facilityCounts)}-${JSON.stringify(locationData.scores)}`;
  
  return cacheService.cacheAIResponse(
    prompt,
    userMode,
    language,
    async () => {
      try {
        // Call our backend API
        const summary = await callBackendAPI(locationData, userMode, language);
        if (summary) {
          return summary;
        }
        
        // Fallback to mock summary
        return generateMockSummary(locationData, userMode, language);
      } catch (error) {
        console.error('AI API call failed:', error);
        return generateMockSummary(locationData, userMode, language);
      }
    },
    60 * 60 * 1000 // 1 hour cache for AI responses
  );
};

// Backend API call to our Vercel Edge Function
const callBackendAPI = async (locationData: LocationData, userMode: UserMode, language: Language): Promise<string> => {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        locationData,
        userMode,
        language
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.summary) {
      return data.summary;
    }
    
    throw new Error('Invalid response from backend API');
  } catch (error) {
    throw error;
  }
};

// Basic mock summary as fallback
const generateMockSummary = (data: LocationData, userMode: UserMode, language: Language): string => {
  const { scores, facilityCounts, address } = data;
  
  let summary = '';
  
  if (userMode === 'residents') {
    // Overall assessment for residents
    if (language === 'id') {
      if (scores.overall >= 80) {
        summary += `Area ini di ${address} menawarkan kelayakan huni yang sangat baik dengan skor yang kuat sebesar ${scores.overall}/100. `;
      } else if (scores.overall >= 60) {
        summary += `Lingkungan ini di ${address} memberikan kelayakan huni yang baik dengan skor yang solid sebesar ${scores.overall}/100. `;
      } else {
        summary += `Lokasi ini di ${address} memiliki kelayakan huni yang sedang dengan skor ${scores.overall}/100. `;
      }
    } else {
      if (scores.overall >= 80) {
        summary += `This area in ${address} offers excellent livability with a strong score of ${scores.overall}/100. `;
      } else if (scores.overall >= 60) {
        summary += `This neighborhood in ${address} provides good livability with a solid score of ${scores.overall}/100. `;
      } else {
        summary += `This location in ${address} has moderate livability with a score of ${scores.overall}/100. `;
      }
    }
    
    // Highlight strengths for residents
    if (language === 'id') {
      const strengths = [];
      if (scores.services >= 70) strengths.push('akses layanan yang sangat baik');
      if (scores.mobility >= 70) strengths.push('konektivitas transportasi umum yang bagus');
      if (scores.safety >= 70) strengths.push('peringkat keamanan yang tinggi');
      if (scores.environment >= 70) strengths.push('fasilitas rekreasi yang baik');
      
      if (strengths.length > 0) {
        summary += `Area ini unggul dalam ${strengths.slice(0, 2).join(' dan ')}. `;
      }
      
      // Facility highlights for residents
      const facilityHighlights = [];
      if (facilityCounts.education > 0) facilityHighlights.push(`${facilityCounts.education} fasilitas pendidikan`);
      if (facilityCounts.health > 0) facilityHighlights.push(`${facilityCounts.health} pilihan layanan kesehatan`);
      if (facilityCounts.market > 0) facilityHighlights.push(`${facilityCounts.market} tempat belanja`);
      
      if (facilityHighlights.length > 0) {
        summary += `Masyarakat memiliki akses ke ${facilityHighlights.slice(0, 2).join(' dan ')} dalam jarak berjalan kaki.`;
      }
    } else {
      const strengths = [];
      if (scores.services >= 70) strengths.push('excellent access to services');
      if (scores.mobility >= 70) strengths.push('great public transport connectivity');
      if (scores.safety >= 70) strengths.push('high safety ratings');
      if (scores.environment >= 70) strengths.push('good recreational facilities');
      
      if (strengths.length > 0) {
        summary += `The area excels in ${strengths.slice(0, 2).join(' and ')}. `;
      }
      
      // Facility highlights for residents
      const facilityHighlights = [];
      if (facilityCounts.education > 0) facilityHighlights.push(`${facilityCounts.education} education facilities`);
      if (facilityCounts.health > 0) facilityHighlights.push(`${facilityCounts.health} healthcare options`);
      if (facilityCounts.market > 0) facilityHighlights.push(`${facilityCounts.market} shopping venues`);
      
      if (facilityHighlights.length > 0) {
        summary += `Residents have access to ${facilityHighlights.slice(0, 2).join(' and ')} within walking distance.`;
      }
    }
  } else if (userMode === 'business-owner') {
    // Business analysis
    if (language === 'id') {
      if (scores.overall >= 80) {
        summary += `Lokasi ini di ${address} menawarkan peluang bisnis yang sangat baik dengan skor kelayakan huni yang tinggi sebesar ${scores.overall}/100. `;
      } else if (scores.overall >= 60) {
        summary += `Area ini di ${address} menawarkan potensi bisnis yang baik dengan skor kelayakan huni yang solid sebesar ${scores.overall}/100. `;
      } else {
        summary += `Lokasi ini di ${address} memiliki potensi bisnis yang sedang dengan skor kelayakan huni ${scores.overall}/100. `;
      }
      
      // Business-focused insights
      if (facilityCounts.market > 0) summary += `Keberadaan ${facilityCounts.market} tempat belanja menunjukkan aktivitas komersial yang aktif. `;
      if (scores.mobility >= 70) summary += `Konektivitas transportasi yang sangat baik memastikan aksesibilitas pelanggan. `;
      if (scores.safety >= 70) summary += `Peringkat keamanan yang tinggi menunjukkan lingkungan bisnis yang stabil. `;
      
      summary += `Pertimbangkan profil demografis dan kesenjangan layanan saat merencanakan strategi bisnis Anda.`;
    } else {
      if (scores.overall >= 80) {
        summary += `This location in ${address} presents excellent business opportunities with a high livability score of ${scores.overall}/100. `;
      } else if (scores.overall >= 60) {
        summary += `This area in ${address} offers good business potential with a solid livability score of ${scores.overall}/100. `;
      } else {
        summary += `This location in ${address} has moderate business potential with a livability score of ${scores.overall}/100. `;
      }
      
      // Business-focused insights
      if (facilityCounts.market > 0) summary += `The presence of ${facilityCounts.market} shopping venues indicates active commercial activity. `;
      if (scores.mobility >= 70) summary += `Excellent transport connectivity ensures customer accessibility. `;
      if (scores.safety >= 70) summary += `High safety ratings suggest a stable business environment. `;
      
      summary += `Consider the demographic profile and service gaps when planning your business strategy.`;
    }
  } else {
    // Urban planning analysis
    if (language === 'id') {
      if (scores.overall >= 80) {
        summary += `Lokasi ini di ${address} menunjukkan pengembangan kota yang kuat dengan skor kelayakan huni yang tinggi sebesar ${scores.overall}/100. `;
      } else if (scores.overall >= 60) {
        summary += `Area ini di ${address} menunjukkan perencanaan kota yang baik dengan skor kelayakan huni yang solid sebesar ${scores.overall}/100. `;
      } else {
        summary += `Lokasi ini di ${address} menawarkan peluang perencanaan kota dengan skor kelayakan huni ${scores.overall}/100. `;
      }
      
      // Planning-focused insights
      if (facilityCounts.health < 2) summary += `Infrastruktur kesehatan dapat ditingkatkan. `;
      if (facilityCounts.education < 2) summary += `Fasilitas pendidikan mungkin perlu diperluas. `;
      if (scores.mobility < 60) summary += `Pengembangan infrastruktur transportasi direkomendasikan. `;
      
      summary += `Fokus pada kesenjangan infrastruktur dan peluang pengembangan berkelanjutan.`;
    } else {
      if (scores.overall >= 80) {
        summary += `This location in ${address} demonstrates strong urban development with a high livability score of ${scores.overall}/100. `;
      } else if (scores.overall >= 60) {
        summary += `This area in ${address} shows good urban planning with a solid livability score of ${scores.overall}/100. `;
      } else {
        summary += `This location in ${address} presents urban planning opportunities with a livability score of ${scores.overall}/100. `;
      }
      
      // Planning-focused insights
      if (facilityCounts.health < 2) summary += `Healthcare infrastructure could be enhanced. `;
      if (facilityCounts.education < 2) summary += `Educational facilities may need expansion. `;
      if (scores.mobility < 60) summary += `Transport infrastructure development is recommended. `;
      
      summary += `Focus on infrastructure gaps and sustainable development opportunities.`;
    }
  }
  
  return summary;
};

