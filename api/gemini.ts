// Vercel Edge Function for Gemini AI API
import { NextRequest, NextResponse } from 'next/server';

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

interface RequestBody {
  locationData: LocationData;
  userMode: UserMode;
  language: Language;
}

export const config = {
  runtime: 'edge',
};

export default async function handler(req: NextRequest) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return NextResponse.json(
      { error: 'Method not allowed' },
      { status: 405 }
    );
  }

  try {
    const body: RequestBody = await req.json();
    const { locationData, userMode, language } = body;

    // Validate input data
    if (!locationData || !locationData.address) {
      return NextResponse.json(
        { error: 'Invalid location data' },
        { status: 400 }
      );
    }

    if (!locationData.facilityCounts || !locationData.scores) {
      return NextResponse.json(
        { error: 'Missing required data' },
        { status: 400 }
      );
    }

    // Get API key from environment variables
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    // Generate prompt based on user mode and language
    const prompt = generatePrompt(locationData, userMode, language);

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 150,
            topP: 0.8,
            topK: 40
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      
      // Return fallback response instead of throwing error
      const fallbackSummary = generateFallbackSummary(locationData, userMode, language);
      return NextResponse.json({ summary: fallbackSummary });
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
      const summary = data.candidates[0].content.parts[0].text;
      return NextResponse.json({ summary });
    }
    
    // Fallback if response format is unexpected
    const fallbackSummary = generateFallbackSummary(locationData, userMode, language);
    return NextResponse.json({ summary: fallbackSummary });

  } catch (error) {
    console.error('API error:', error);
    
    // Return fallback response for any error
    try {
      const body: RequestBody = await req.json();
      const fallbackSummary = generateFallbackSummary(body.locationData, body.userMode, body.language);
      return NextResponse.json({ summary: fallbackSummary });
    } catch {
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
}

// Generate prompt based on user mode and language
function generatePrompt(locationData: LocationData, userMode: UserMode, language: Language): string {
  const baseData = language === 'id' 
    ? `Lokasi: ${locationData.address}
Skor Keseluruhan: ${locationData.scores.overall}/100
Fasilitas: ${locationData.facilityCounts.health} kesehatan, ${locationData.facilityCounts.education} pendidikan, ${locationData.facilityCounts.market} belanja, ${locationData.facilityCounts.transport} transportasi, ${locationData.facilityCounts.walkability} kemudahan jalan kaki, ${locationData.facilityCounts.recreation} rekreasi
Skor: Layanan ${locationData.scores.services}, Mobilitas ${locationData.scores.mobility}, Keamanan ${locationData.scores.safety}, Lingkungan ${locationData.scores.environment}
Terdekat: ${locationData.nearbyFacilities.slice(0, 5).join(', ')}`
    : `Location: ${locationData.address}
Overall Score: ${locationData.scores.overall}/100
Facilities: ${locationData.facilityCounts.health} healthcare, ${locationData.facilityCounts.education} education, ${locationData.facilityCounts.market} shopping, ${locationData.facilityCounts.transport} transport, ${locationData.facilityCounts.walkability} walkability, ${locationData.facilityCounts.recreation} recreation
Scores: Services ${locationData.scores.services}, Mobility ${locationData.scores.mobility}, Safety ${locationData.scores.safety}, Environment ${locationData.scores.environment}
Nearby: ${locationData.nearbyFacilities.slice(0, 5).join(', ')}`;

  if (language === 'id') {
    switch (userMode) {
      case 'residents':
        return `Ringkas kelayakan huni lokasi ini dalam 2-3 kalimat untuk seseorang yang sedang mempertimbangkan untuk tinggal di sana. Fokus pada kekuatan dan apa yang membuat area ini unik. Gunakan bahasa yang ramah dan membantu.

${baseData}`;
      
      case 'business-owner':
        return `Analisis potensi bisnis lokasi ini dalam 2-3 kalimat untuk pemilik bisnis yang sedang mempertimbangkan untuk membuka bisnis di sana. Fokus pada peluang pasar, aksesibilitas pelanggan, dan lingkungan bisnis. Gunakan bahasa yang profesional dan strategis.

${baseData}`;
      
      case 'urban-planner':
        return `Berikan analisis perencanaan kota untuk lokasi ini dalam 2-3 kalimat untuk perencana kota dan pengembang. Fokus pada kesenjangan infrastruktur, peluang pengembangan, dan pertimbangan perencanaan. Gunakan bahasa yang analitis dan profesional.

${baseData}`;
      
      default:
        return `Ringkas kelayakan huni lokasi ini dalam 2-3 kalimat untuk seseorang yang sedang mempertimbangkan untuk tinggal di sana. Fokus pada kekuatan dan apa yang membuat area ini unik. Gunakan bahasa yang ramah dan membantu.

${baseData}`;
    }
  } else {
    switch (userMode) {
      case 'residents':
        return `Summarize this location's livability in 2-3 sentences for someone considering living there. Focus on the strengths and what makes this area unique. Be conversational and helpful.

${baseData}`;
      
      case 'business-owner':
        return `Analyze this location's business potential in 2-3 sentences for a business owner considering opening a business there. Focus on market opportunities, customer accessibility, and business environment. Be professional and strategic.

${baseData}`;
      
      case 'urban-planner':
        return `Provide an urban planning analysis of this location in 2-3 sentences for urban planners and developers. Focus on infrastructure gaps, development opportunities, and planning considerations. Be analytical and professional.

${baseData}`;
      
      default:
        return `Summarize this location's livability in 2-3 sentences for someone considering living there. Focus on the strengths and what makes this area unique. Be conversational and helpful.

${baseData}`;
    }
  }
}

// Fallback summary generation (same as the original mock function)
function generateFallbackSummary(data: LocationData, userMode: UserMode, language: Language): string {
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
}
