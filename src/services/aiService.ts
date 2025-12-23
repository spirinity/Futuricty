// AI service for generating location summaries using our backend API
import { cacheService } from "./cacheService";

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

export type AISource = "ai" | "fallback";

export interface AIResult {
  summary: string;
  source: AISource;
}

// Generate AI summary for a location based on user mode and language
export const generateLocationSummary = async (
  locationData: LocationData,
  userMode: UserMode = "residents",
  language: Language = "en"
): Promise<AIResult> => {
  // Validate input data
  if (!locationData || !locationData.address) {
    return {
      summary: "Unable to generate summary: Invalid location data.",
      source: "fallback",
    };
  }

  if (!locationData.facilityCounts || !locationData.scores) {
    return {
      summary: "Unable to generate summary: Missing required data.",
      source: "fallback",
    };
  }

  // Create a unique prompt for caching
  const prompt = `${locationData.address}-${JSON.stringify(
    locationData.facilityCounts
  )}-${JSON.stringify(locationData.scores)}`;

  return cacheService.cacheAIResponse(
    prompt,
    userMode,
    language,
    async () => {
      try {
        // Call our backend API
        const result = await callBackendAPI(locationData, userMode, language);
        if (result && result.summary) {
          return result;
        }

        // Fallback to mock summary
        return generateMockSummary(locationData, userMode, language);
      } catch (error) {
        console.error("AI API call failed:", error);
        return generateMockSummary(locationData, userMode, language);
      }
    },
    60 * 60 * 1000 // 1 hour cache for AI responses
  );
};

// Backend API call to our Vercel Edge Function
const callBackendAPI = async (
  locationData: LocationData,
  userMode: UserMode,
  language: Language
): Promise<AIResult> => {
  try {
    // Check for client-side API key first
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (apiKey) {
      const prompt = generatePrompt(locationData, userMode, language);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2500,
              topP: 0.8,
              topK: 40,
            },
          }),
        }
      );

      if (!response.ok) {
        console.warn(
          `Gemini API error: ${response.status} ${response.statusText}`
        );
        // Fallback to backend if direct call fails
      } else {
        const data = await response.json();

        if (
          data.candidates &&
          data.candidates[0] &&
          data.candidates[0].content &&
          data.candidates[0].content.parts &&
          data.candidates[0].content.parts[0]
        ) {
          return {
            summary: data.candidates[0].content.parts[0].text,
            source: "ai",
          };
        }
      }
    }

    const response = await fetch("/api/gemini", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        locationData,
        userMode,
        language,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();

    if (data.summary) {
      return {
        summary: data.summary,
        source: data.source === "ai" ? "ai" : "fallback",
      };
    }

    throw new Error("Invalid response from backend API");
  } catch (error) {
    console.error("AI API call failed:", error);
    throw error;
  }
};

// Generate prompt based on user mode and language
function generatePrompt(
  locationData: LocationData,
  userMode: UserMode,
  language: Language
): string {
  const baseData =
    language === "id"
      ? `Lokasi: ${locationData.address}
Skor Keseluruhan: ${locationData.scores.overall}/100
Fasilitas: ${locationData.facilityCounts.health} kesehatan, ${
          locationData.facilityCounts.education
        } pendidikan, ${locationData.facilityCounts.market} belanja, ${
          locationData.facilityCounts.transport
        } transportasi, ${
          locationData.facilityCounts.walkability
        } kemudahan jalan kaki, ${
          locationData.facilityCounts.recreation
        } rekreasi
Skor: Layanan ${locationData.scores.services}, Mobilitas ${
          locationData.scores.mobility
        }, Keamanan ${locationData.scores.safety}, Lingkungan ${
          locationData.scores.environment
        }
Terdekat: ${locationData.nearbyFacilities.slice(0, 5).join(", ")}`
      : `Location: ${locationData.address}
Overall Score: ${locationData.scores.overall}/100
Facilities: ${locationData.facilityCounts.health} healthcare, ${
          locationData.facilityCounts.education
        } education, ${locationData.facilityCounts.market} shopping, ${
          locationData.facilityCounts.transport
        } transport, ${locationData.facilityCounts.walkability} walkability, ${
          locationData.facilityCounts.recreation
        } recreation
Scores: Services ${locationData.scores.services}, Mobility ${
          locationData.scores.mobility
        }, Safety ${locationData.scores.safety}, Environment ${
          locationData.scores.environment
        }
Nearby: ${locationData.nearbyFacilities.slice(0, 5).join(", ")}`;

  if (language === "id") {
    switch (userMode) {
      case "residents":
        return `Anda adalah konsultan properti ahli. Berikan analisis SINGKAT & PADAT (sekitar 100 kata) tentang lokasi ini.

INSTRUKSI KHUSUS:
- Tulis dalam 1-2 paragraf narasi saja.
- DILARANG menggunakan bold, italic, atau list angka/poin.
- JANGAN SEBUTKAN ANGKA SKOR SPESIFIK (misal: "skor 100", "(277)"). Gunakan kata deskriptif (misal: "sangat tinggi", "jarang", "memadai").
- Langsung bahas inti: kaitan kualitas lokasi dengan kenyamanan hidup sehari-hari.

Data referensi: ${baseData}`;

      case "business-owner":
        return `Anda adalah konsultan bisnis. Berikan analisis potensi bisnis yang SINGKAT (sekitar 100 kata).

INSTRUKSI KHUSUS:
- Tulis dalam 1-2 paragraf narasi saja.
- DILARANG menggunakan bold, italic, atau list angka/poin.
- JANGAN SEBUTKAN ANGKA SKOR SPESIFIK. Gunakan deskripsi kualitatif.
- Langsung sebutkan peluang bisnis utama dan alasannya berdasarkan data.

Data referensi: ${baseData}`;

      case "urban-planner":
        return `Anda adalah Urban Planner. Berikan audit tata kota yang SINGKAT (sekitar 100 kata).

INSTRUKSI KHUSUS:
- Tulis dalam 1-2 paragraf narasi saja.
- DILARANG menggunakan bold, italic, atau list angka/poin.
- JANGAN SEBUTKAN ANGKA SKOR SPESIFIK. Gunakan deskripsi kualitatif.
- Fokus pada evaluasi infrastruktur utama dan satu rekomendasi perbaikan paling krusial.

Data referensi: ${baseData}`;

      default:
        return `Berikan analisis kelayakan huni singkat (maks 100 kata) dalam 1 paragraf tanpa formatting (bold/list) dan TANPA MENYEBUT ANGKA SKOR. Data: ${baseData}`;
    }
  } else {
    // English Prompts
    switch (userMode) {
      case "residents":
        return `You are a Property Consultant. Provide a CONCISE analysis (approx 100 words) of this location.

STRICT INSTRUCTIONS:
- Write exactly 1-2 paragraphs of narrative.
- NO bold text, italics, or bullet points.
- DO NOT MENTION SPECIFIC SCORE NUMBERS (e.g., "score 100", "(277)"). Use descriptive words (e.g., "excellent", "scarce", "abundant").
- Get straight to the point: how livable is this area?

Reference Data: ${baseData}`;

      case "business-owner":
        return `You are a Business Consultant. Provide a CONCISE business analysis (approx 100 words).

STRICT INSTRUCTIONS:
- Write exactly 1-2 paragraphs of narrative.
- NO bold text, italics, or bullet points.
- DO NOT MENTION SPECIFIC SCORE NUMBERS. Use qualitative descriptions.
- Immediately identify key business opportunities and why they fit here.

Reference Data: ${baseData}`;

      case "urban-planner":
        return `You are an Urban Planner. Provide a CONCISE urban audit (approx 100 words).

STRICT INSTRUCTIONS:
- Write exactly 1-2 paragraphs of narrative.
- NO bold text, italics, or bullet points.
- DO NOT MENTION SPECIFIC SCORE NUMBERS. Use qualitative descriptions.
- Focus on key infrastructure pros/cons and one main recommendation.

Reference Data: ${baseData}`;

      default:
        return `Provide a concise livability analysis (max 100 words) in 1 paragraph. NO bold/italics/lists. NO SPECIFIC NUMBERS. Data: ${baseData}`;
    }
  }
}

// Basic mock summary as fallback
const generateMockSummary = (
  data: LocationData,
  userMode: UserMode,
  language: Language
): AIResult => {
  const { scores, facilityCounts, address } = data;

  let summary = "";

  if (userMode === "residents") {
    // Overall assessment for residents
    if (language === "id") {
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
    if (language === "id") {
      const strengths = [];
      if (scores.services >= 70)
        strengths.push("akses layanan yang sangat baik");
      if (scores.mobility >= 70)
        strengths.push("konektivitas transportasi umum yang bagus");
      if (scores.safety >= 70) strengths.push("peringkat keamanan yang tinggi");
      if (scores.environment >= 70)
        strengths.push("fasilitas rekreasi yang baik");

      if (strengths.length > 0) {
        summary += `Area ini unggul dalam ${strengths
          .slice(0, 2)
          .join(" dan ")}. `;
      }

      // Facility highlights for residents
      const facilityHighlights = [];
      if (facilityCounts.education > 0)
        facilityHighlights.push(
          `${facilityCounts.education} fasilitas pendidikan`
        );
      if (facilityCounts.health > 0)
        facilityHighlights.push(
          `${facilityCounts.health} pilihan layanan kesehatan`
        );
      if (facilityCounts.market > 0)
        facilityHighlights.push(`${facilityCounts.market} tempat belanja`);

      if (facilityHighlights.length > 0) {
        summary += `Masyarakat memiliki akses ke ${facilityHighlights
          .slice(0, 2)
          .join(" dan ")} dalam jarak berjalan kaki.`;
      }
    } else {
      const strengths = [];
      if (scores.services >= 70) strengths.push("excellent access to services");
      if (scores.mobility >= 70)
        strengths.push("great public transport connectivity");
      if (scores.safety >= 70) strengths.push("high safety ratings");
      if (scores.environment >= 70)
        strengths.push("good recreational facilities");

      if (strengths.length > 0) {
        summary += `The area excels in ${strengths
          .slice(0, 2)
          .join(" and ")}. `;
      }

      // Facility highlights for residents
      const facilityHighlights = [];
      if (facilityCounts.education > 0)
        facilityHighlights.push(
          `${facilityCounts.education} education facilities`
        );
      if (facilityCounts.health > 0)
        facilityHighlights.push(`${facilityCounts.health} healthcare options`);
      if (facilityCounts.market > 0)
        facilityHighlights.push(`${facilityCounts.market} shopping venues`);

      if (facilityHighlights.length > 0) {
        summary += `Residents have access to ${facilityHighlights
          .slice(0, 2)
          .join(" and ")} within walking distance.`;
      }
    }
  } else if (userMode === "business-owner") {
    // Business analysis
    if (language === "id") {
      if (scores.overall >= 80) {
        summary += `Lokasi ini di ${address} menawarkan peluang bisnis yang sangat baik dengan skor kelayakan huni yang tinggi sebesar ${scores.overall}/100. `;
      } else if (scores.overall >= 60) {
        summary += `Area ini di ${address} menawarkan potensi bisnis yang baik dengan skor kelayakan huni yang solid sebesar ${scores.overall}/100. `;
      } else {
        summary += `Lokasi ini di ${address} memiliki potensi bisnis yang sedang dengan skor kelayakan huni ${scores.overall}/100. `;
      }

      // Business-focused insights
      if (facilityCounts.market > 0)
        summary += `Keberadaan ${facilityCounts.market} tempat belanja menunjukkan aktivitas komersial yang aktif. `;
      if (scores.mobility >= 70)
        summary += `Konektivitas transportasi yang sangat baik memastikan aksesibilitas pelanggan. `;
      if (scores.safety >= 70)
        summary += `Peringkat keamanan yang tinggi menunjukkan lingkungan bisnis yang stabil. `;

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
      if (facilityCounts.market > 0)
        summary += `The presence of ${facilityCounts.market} shopping venues indicates active commercial activity. `;
      if (scores.mobility >= 70)
        summary += `Excellent transport connectivity ensures customer accessibility. `;
      if (scores.safety >= 70)
        summary += `High safety ratings suggest a stable business environment. `;

      summary += `Consider the demographic profile and service gaps when planning your business strategy.`;
    }
  } else {
    // Urban planning analysis
    if (language === "id") {
      if (scores.overall >= 80) {
        summary += `Lokasi ini di ${address} menunjukkan pengembangan kota yang kuat dengan skor kelayakan huni yang tinggi sebesar ${scores.overall}/100. `;
      } else if (scores.overall >= 60) {
        summary += `Area ini di ${address} menunjukkan perencanaan kota yang baik dengan skor kelayakan huni yang solid sebesar ${scores.overall}/100. `;
      } else {
        summary += `Lokasi ini di ${address} menawarkan peluang perencanaan kota dengan skor kelayakan huni ${scores.overall}/100. `;
      }

      // Planning-focused insights
      if (facilityCounts.health < 2)
        summary += `Infrastruktur kesehatan dapat ditingkatkan. `;
      if (facilityCounts.education < 2)
        summary += `Fasilitas pendidikan mungkin perlu diperluas. `;
      if (scores.mobility < 60)
        summary += `Pengembangan infrastruktur transportasi direkomendasikan. `;

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
      if (facilityCounts.health < 2)
        summary += `Healthcare infrastructure could be enhanced. `;
      if (facilityCounts.education < 2)
        summary += `Educational facilities may need expansion. `;
      if (scores.mobility < 60)
        summary += `Transport infrastructure development is recommended. `;

      summary += `Focus on infrastructure gaps and sustainable development opportunities.`;
    }
  }

  return { summary, source: "fallback" };
};
