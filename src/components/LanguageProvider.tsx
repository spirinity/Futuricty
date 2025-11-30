import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'id';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation keys
const translations = {
  en: {
    // Navigation and UI
    'app.title': 'Futuricity',
    'app.subtitle': 'Building Tomorrow',
    'select.location': 'Select a Location',
    'click.map': 'Click on the map to choose a location',
    'analyze.location': 'Analyze Location',
    'recalculate.score': 'Recalculate Score',
    'analyzing': 'Analyzing...',
    'recalculating': 'Recalculating...',
    
    // Map Controls
    'map.controls': 'Map Controls',
    'map.controls.description': 'Toggle distance circles display',
    'show.distance.circles': 'Show Distance Circles',
    'display.radius': 'Display {radius}m radius circles',
    'current.location': 'Current Location',
    'loading.address': 'Loading address...',
    'no.location.selected': 'No location selected. Click on the map to choose a location.',
    
    // AI Summary
    'ai.location.summary': 'AI Location Summary',
    'generating.ai.summary': 'Generating AI summary...',
    'click.recalculate.ai': 'Click "Recalculate Score" to generate an AI summary.',
    'unable.generate.summary': 'Unable to generate summary at this time.',
    'generating.ai.insights': 'Generating AI insights...',
    'click.recalculate.ai.insights': 'Click recalculate to generate AI insights',
    'smart.insights.residents': 'Smart insights for residents',
    'business.opportunity.analysis': 'Business opportunity analysis',
    'urban.planning.insights': 'Urban planning insights',
    'selected.area.analysis': 'Selected area for analysis',
    'selected.area.business': 'Selected area for business analysis',
    'selected.area.planning': 'Selected area for urban planning',
    'current.location.residents': 'Current Location',
    'current.location.business': 'Business Location',
    'current.location.planning': 'Planning Area',
    
    // Facility Categories
    'facility.categories': 'Facility Categories',
    'facilities.category': 'Facilities Category',
    'facilities.category.description': 'Toggle what to show on the map',
    'show.all': 'Show All',
    'hide.all': 'Hide All',
    'show.control.panel': 'Show Control Panel',
    'hide.control.panel': 'Hide Control Panel',
    'show': 'Show',
    'hide': 'Hide',
    'meters': 'm',
    'available.radius.options': 'Available radius options:',
    'found.nearby.facilities': 'Found {count} nearby facilities',
    'livability.score.calculated': 'Livability score calculated: {score}/100',
    'failed.calculate.score': 'Failed to calculate livability score',
    'try.again.select.different': 'Please try again or select a different location',
    'health.emoji': '🏥 Health',
    'education.emoji': '🏫 Education',
    'markets.emoji': '🛒 Markets',
    'transport.emoji': '🚌 Transport',
    'walkability.emoji': '🚶 Walkability',
    'recreation.emoji': '🌳 Recreation',
    'safety.emoji': '🚦 Safety',
    'police.emoji': '👮 Police',
    'religious.emoji': '🙏 Religious',
    'accessibility.emoji': '♿ Accessibility',
    'distance': 'Distance:',
    'score.impact': 'Score Impact:',
    'no.location.selected.residents': 'No location selected',
    'no.location.selected.business': 'No business location selected',
    'no.location.selected.planning': 'No planning area selected',
    'click.map.choose.residents': 'Click on the map to choose a location',
    'click.map.choose.business': 'Click on the map to choose a business location',
    'click.map.choose.planning': 'Click on the map to choose a planning area',
    'facility.counts': 'Facility Counts',
    'found.in.selected.area': 'Found in the selected area',
    'healthcare': 'Healthcare',
    'education': 'Education',
    'safety': 'Safety',
    'transport': 'Transport',
    'walkability': 'Walkability',
    'police': 'Police',
    'accessibility': 'Accessibility',
    'religious': 'Religious',
    'recreation': 'Recreation',
    'market': 'Market',
    
    // Livability Score
    'score.breakdown': 'Score Breakdown',
    'nearby.facilities': 'Nearby Facilities',
    'nearby.facilities.description': 'All amenities within 500m (excluding safety & walkability)',
    'no.facilities.found': 'No facilities found within 500m',
    'access.to.services': 'Access to Services',
    'healthcare.education.markets': 'Healthcare, education, markets',
    'mobility.transport': 'Mobility & Transport',
    'public.transport.walkability': 'Public transport, walkability',
    'safety.security': 'Safety & Security',
    'public.safety.indicators': 'Public safety indicators',
    'environment': 'Environment',
    'green.spaces.air.quality': 'Green spaces, air quality',
    
    // Score Levels
    'excellent': 'Excellent',
    'good': 'Good',
    'fair': 'Fair',
    'poor': 'Poor',
    'excellent.range': 'Excellent (80-100)',
    'good.range': 'Good (60-79)',
    'fair.range': 'Fair (40-59)',
    'poor.range': 'Poor (0-39)',
    
    // Facility Names
    'health': 'Health',
    'markets': 'Markets',
    'facilities': 'facilities',
    
    // Search
    'search.placeholder': 'Search for a location...',
    'search.results': 'Search Results',
    'search.searching': 'Searching for locations...',
    'search.no.results': 'No results found',
    'search.type.minimum': 'Type at least 3 characters to search',
    'no.results': 'No results found',
    
    // Theme
    'light': 'Light',
    'dark': 'Dark',
    'system': 'System',
    
    // Language
    'language': 'Language',
    'english': 'English',
    'indonesian': 'Indonesian',
    
    // User Mode
    'residents': 'Residents',
    'business': 'Business',
    'planner': 'Planner',
    'residents.mode': 'Residents Mode',
    'business.owner.mode': 'Business Owner Mode',
    'urban.planner.mode': 'Urban Planner Mode',
    
    // Mobile UI
    'analysis.details': 'Analysis Details',
    'control.panel': 'Control Panel',
    'complete.livability.breakdown': 'Complete livability breakdown',
    'select.location.analyze.results': 'Select a location and analyze to see results',
    'no.analysis.yet': 'No Analysis Yet',
    'select.location.click.analyze': 'Select a location on the map and click analyze to see livability results',
    'analyzing.location': 'Analyzing Location...',
    'analyzing.business.data': 'Analyzing Business Data...',
    'analyzing.planning.data': 'Analyzing Planning Data...',
    'recalculating.business.data': 'Recalculating Business Data...',
    'recalculating.planning.data': 'Recalculating Planning Data...',
    'analyze.business.potential': 'Analyze Business Potential',
    'analyze.planning.data': 'Analyze Planning Data',
    'recalculate.business.data': 'Recalculate Business Data',
    'recalculate.planning.data': 'Recalculate Planning Data',
    'livability.score': 'Livability Score',
    'swipe.up.details': 'Swipe up for details',
    'selected.location': 'Selected Location',
    
    // My Places
    'my.places.mode': 'My Places Mode',
    'my.places.intro': 'Click on the map to select a location or POI, then add your custom places. These will be included in livability calculations.',
    'add.place': 'Add Place',
    'edit.place': 'Edit Place',
    'add.place.desc': 'Add your custom place to this location. It will be included in livability calculations.',
    'name': 'Name',
    'name.placeholder': 'e.g., My Favorite Cafe',
    'category': 'Category',
    'select.category': 'Select category',
    'description': 'Description',
    'description.placeholder': 'Add any notes about this POI...',
    'latitude': 'Latitude',
    'longitude': 'Longitude',
    'cancel': 'Cancel',
    'update': 'Update',
    'add': 'Add',
    'no.places.yet': 'No places yet.',
    'select.location.add.place': "Select a location and click 'Add Place'",
    'confirm.delete.place': 'Are you sure you want to delete this place?',
    'place.deleted': 'Place deleted',
    'place.updated': 'Place updated successfully!',
    'place.added': 'Place added successfully!',
    'failed.save.poi': 'Failed to save POI',
    'enter.name': 'Please enter a name for the place',
    'select.location.first': 'Please select a location on the map first',
    'export.pois': 'Export POIs',
    'import.pois': 'Import POIs',
    'pois.exported': 'Places exported successfully!',
    'pois.imported': 'Places imported successfully!',
    'invalid.file.format': 'Invalid places file format',
    'failed.import.pois': 'Failed to import POIs',
    'enter.my.places.mode': 'Enter My Places Mode',
    'exit.my.places.mode': 'Exit My Places Mode',
    'my.places': 'My Places',
    'enter.custom.poi.mode': 'Enter My Places Mode',
    'exit.custom.poi.mode': 'Exit My Places Mode',
    'map.panned.to.place': 'Map panned to place location',
    
    // Tutorial
    'welcome.title': 'Welcome to Futuricity',
    'welcome.description': 'Your advanced tool for analyzing urban livability and planning better cities.',
    'search.title': 'Find Locations',
    'search.description': 'Search for any location or simply click on the map to select a point of interest.',
    'analyze.title': 'Analyze Livability',
    'analyze.description': 'View detailed scores, facility breakdowns, and AI-powered insights for any selected area.',
    'customize.title': 'Customize Your View',
    'customize.description': 'Toggle map layers, switch themes, and manage your own custom points of interest.',
    'skip': 'Skip',
    'next': 'Next',
    'get.started': 'Get Started'
  },
  id: {
    // Navigation and UI
    'app.title': 'Futuricity',
    'app.subtitle': 'Membangun Masa Depan',
    'select.location': 'Pilih Lokasi',
    'click.map': 'Klik pada peta untuk memilih lokasi',
    'analyze.location': 'Analisis Lokasi',
    'recalculate.score': 'Hitung Ulang Skor',
    'analyzing': 'Menganalisis...',
    'recalculating': 'Menghitung ulang...',
    
    // Map Controls
    'map.controls': 'Kontrol Peta',
    'map.controls.description': 'Aktifkan tampilan lingkaran jarak',
    'show.distance.circles': 'Tampilkan Lingkaran Jarak',
    'display.radius': 'Tampilkan lingkaran radius {radius}m',
    'current.location': 'Lokasi Saat Ini',
    'loading.address': 'Memuat alamat...',
    'no.location.selected': 'Tidak ada lokasi yang dipilih. Klik pada peta untuk memilih lokasi.',
    
    // AI Summary
    'ai.location.summary': 'Ringkasan Lokasi AI',
    'generating.ai.summary': 'Membuat ringkasan AI...',
    'click.recalculate.ai': 'Klik "Hitung Ulang Skor" untuk membuat ringkasan AI.',
    'unable.generate.summary': 'Tidak dapat membuat ringkasan saat ini.',
    'generating.ai.insights': 'Membuat wawasan AI...',
    'click.recalculate.ai.insights': 'Klik hitung ulang untuk membuat wawasan AI',
    'smart.insights.residents': 'Wawasan pintar untuk masyarakat',
    'business.opportunity.analysis': 'Analisis peluang bisnis',
    'urban.planning.insights': 'Wawasan perencanaan kota',
    'selected.area.analysis': 'Area terpilih untuk analisis',
    'selected.area.business': 'Area terpilih untuk analisis bisnis',
    'selected.area.planning': 'Area terpilih untuk perencanaan kota',
    'current.location.residents': 'Lokasi Saat Ini',
    'current.location.business': 'Lokasi Bisnis',
    'current.location.planning': 'Area Perencanaan',
    
    'facility.categories': 'Kategori Fasilitas',
    'facilities.category': 'Kategori Fasilitas',
    'facilities.category.description': 'Aktifkan apa yang ditampilkan di peta',
    'show.all': 'Tampilkan Semua',
    'hide.all': 'Sembunyikan Semua',
    'show.control.panel': 'Tampilkan Panel Kontrol',
    'hide.control.panel': 'Sembunyikan Panel Kontrol',
    'show': 'Tampilkan',
    'hide': 'Sembunyikan',
    'meters': 'm',
    'available.radius.options': 'Opsi radius yang tersedia:',
    'found.nearby.facilities': 'Ditemukan {count} fasilitas terdekat',
    'livability.score.calculated': 'Skor kelayakan huni dihitung: {score}/100',
    'failed.calculate.score': 'Gagal menghitung skor kelayakan huni',
    'try.again.select.different': 'Silakan coba lagi atau pilih lokasi yang berbeda',
    'health.emoji': '🏥 Kesehatan',
    'education.emoji': '🏫 Pendidikan',
    'markets.emoji': '🛒 Pasar',
    'transport.emoji': '🚌 Transportasi',
    'walkability.emoji': '🚶 Kemudahan Jalan Kaki',
    'recreation.emoji': '🌳 Rekreasi',
    'safety.emoji': '🚦 Keamanan',
    'police.emoji': '👮 Kepolisian',
    'religious.emoji': '🙏 Tempat Ibadah',
    'accessibility.emoji': '♿ Aksesibilitas',
    'distance': 'Jarak:',
    'score.impact': 'Dampak Skor:',
    'no.location.selected.residents': 'Tidak ada lokasi yang dipilih',
    'no.location.selected.business': 'Tidak ada lokasi bisnis yang dipilih',
    'no.location.selected.planning': 'Tidak ada area perencanaan yang dipilih',
    'click.map.choose.residents': 'Klik pada peta untuk memilih lokasi',
    'click.map.choose.business': 'Klik pada peta untuk memilih lokasi bisnis',
    'click.map.choose.planning': 'Klik pada peta untuk memilih area perencanaan',
    'facility.counts': 'Jumlah Fasilitas',
    'found.in.selected.area': 'Ditemukan di area yang dipilih',
    'healthcare': 'Kesehatan',
    'education': 'Pendidikan',
    'safety': 'Keamanan',
    'transport': 'Transportasi',
    'walkability': 'Kemudahan Jalan Kaki',
    'police': 'Kepolisian',
    'accessibility': 'Aksesibilitas',
    'religious': 'Tempat Ibadah',
    'recreation': 'Rekreasi',
    'market': 'Pasar',
    
    // Livability Score
    'score.breakdown': 'Rincian Skor',
    'nearby.facilities': 'Fasilitas Terdekat',
    'nearby.facilities.description': 'Semua fasilitas dalam radius 500m (tidak termasuk keamanan & kemudahan jalan kaki)',
    'no.facilities.found': 'Tidak ada fasilitas ditemukan dalam radius 500m',
    'access.to.services': 'Akses ke Layanan',
    'healthcare.education.markets': 'Kesehatan, pendidikan, pasar',
    'mobility.transport': 'Mobilitas & Transportasi',
    'public.transport.walkability': 'Transportasi umum, kemudahan jalan kaki',
    'safety.security': 'Keamanan & Keselamatan',
    'public.safety.indicators': 'Indikator keamanan publik',
    'environment': 'Lingkungan',
    'green.spaces.air.quality': 'Ruang hijau, kualitas udara',
    
    // Score Levels
    'excellent': 'Sangat Baik',
    'good': 'Baik',
    'fair': 'Cukup',
    'poor': 'Kurang',
    'excellent.range': 'Sangat Baik (80-100)',
    'good.range': 'Baik (60-79)',
    'fair.range': 'Cukup (40-59)',
    'poor.range': 'Kurang (0-39)',
    
    // Facility Names
    'health': 'Kesehatan',
    'markets': 'Pasar',
    'facilities': 'fasilitas',
    
    // Search
    'search.placeholder': 'Cari lokasi...',
    'search.results': 'Hasil Pencarian',
    'search.searching': 'Mencari lokasi...',
    'search.no.results': 'Tidak ada hasil ditemukan',
    'search.type.minimum': 'Ketik minimal 3 karakter untuk mencari',
    'no.results': 'Tidak ada hasil ditemukan',
    
    // Theme
    'light': 'Terang',
    'dark': 'Gelap',
    'system': 'Sistem',
    
    // Language
    'language': 'Bahasa',
    'english': 'Inggris',
    'indonesian': 'Indonesia',
    
    // User Mode
    'residents': 'Masyarakat',
    'business': 'Bisnis',
    'planner': 'Perencana',
    'residents.mode': 'Mode Masyarakat',
    'business.owner.mode': 'Mode Pemilik Bisnis',
    'urban.planner.mode': 'Mode Perencana Kota',
    
    // Mobile UI
    'analysis.details': 'Detail Analisis',
    'control.panel': 'Panel Kontrol',
    'complete.livability.breakdown': 'Rincian lengkap kelayakan huni',
    'select.location.analyze.results': 'Pilih lokasi dan analisis untuk melihat hasil',
    'no.analysis.yet': 'Belum Ada Analisis',
    'select.location.click.analyze': 'Pilih lokasi di peta dan klik analisis untuk melihat hasil kelayakan huni',
    'analyzing.location': 'Menganalisis Lokasi...',
    'analyzing.business.data': 'Menganalisis Data Bisnis...',
    'analyzing.planning.data': 'Menganalisis Data Perencanaan...',
    'recalculating.business.data': 'Menghitung Ulang Data Bisnis...',
    'recalculating.planning.data': 'Menghitung Ulang Data Perencanaan...',
    'analyze.business.potential': 'Analisis Potensi Bisnis',
    'analyze.planning.data': 'Analisis Data Perencanaan',
    'recalculate.business.data': 'Hitung Ulang Data Bisnis',
    'recalculate.planning.data': 'Hitung Ulang Data Perencanaan',
    'livability.score': 'Skor Kelayakan Huni',
    'swipe.up.details': 'Geser ke atas untuk detail',
    'selected.location': 'Lokasi Terpilih',
    
    // My Places
    'my.places.mode': 'Mode My Places',
    'my.places.intro': 'Klik pada peta untuk memilih lokasi atau POI, lalu tambahkan tempat kustom Anda. Ini akan disertakan dalam perhitungan kelayakan huni.',
    'add.place': 'Tambah Tempat',
    'edit.place': 'Edit Tempat',
    'add.place.desc': 'Tambahkan tempat kustom Anda ke lokasi ini. Ini akan disertakan dalam perhitungan kelayakan huni.',
    'name': 'Nama',
    'name.placeholder': 'contoh: Kafe Favorit Saya',
    'category': 'Kategori',
    'select.category': 'Pilih kategori',
    'description': 'Deskripsi',
    'description.placeholder': 'Tambahkan catatan tentang POI ini...',
    'latitude': 'Lintang',
    'longitude': 'Bujur',
    'cancel': 'Batal',
    'update': 'Perbarui',
    'add': 'Tambah',
    'no.places.yet': 'Belum ada tempat.',
    'select.location.add.place': "Pilih lokasi dan klik 'Tambah Tempat'",
    'confirm.delete.place': 'Apakah Anda yakin ingin menghapus tempat ini?',
    'place.deleted': 'Tempat dihapus',
    'place.updated': 'Tempat berhasil diperbarui!',
    'place.added': 'Tempat berhasil ditambahkan!',
    'failed.save.poi': 'Gagal menyimpan POI',
    'enter.name': 'Mohon masukkan nama tempat',
    'select.location.first': 'Mohon pilih lokasi di peta terlebih dahulu',
    'export.pois': 'Ekspor POI',
    'import.pois': 'Impor POI',
    'pois.exported': 'Tempat berhasil diekspor!',
    'pois.imported': 'Tempat berhasil diimpor!',
    'invalid.file.format': 'Format file tempat tidak valid',
    'failed.import.pois': 'Gagal mengimpor POI',
    'enter.my.places.mode': 'Masuk Mode My Places',
    'exit.my.places.mode': 'Keluar Mode My Places',
    'my.places': 'My Places',
    'enter.custom.poi.mode': 'Masuk Mode My Places',
    'exit.custom.poi.mode': 'Keluar Mode My Places',
    'map.panned.to.place': 'Peta digeser ke lokasi tempat',

    // Tutorial
    'welcome.title': 'Selamat Datang di Futuricity',
    'welcome.description': 'Alat canggih Anda untuk menganalisis kelayakan huni perkotaan dan merencanakan kota yang lebih baik.',
    'search.title': 'Temukan Lokasi',
    'search.description': 'Cari lokasi mana pun atau cukup klik pada peta untuk memilih tempat menarik.',
    'analyze.title': 'Analisis Kelayakan Huni',
    'analyze.description': 'Lihat skor terperinci, rincian fasilitas, dan wawasan bertenaga AI untuk area yang dipilih.',
    'customize.title': 'Sesuaikan Tampilan Anda',
    'customize.description': 'Alihkan lapisan peta, ganti tema, dan kelola tempat menarik kustom Anda sendiri.',
    'skip': 'Lewati',
    'next': 'Lanjut',
    'get.started': 'Mulai'
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  // Load language preference from localStorage
  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') as Language;
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'id')) {
      setLanguage(savedLanguage);
    }
  }, []);

  // Save language preference to localStorage
  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
  };

  // Translation function
  const t = (key: string, params?: Record<string, string | number>): string => {
    let translation = translations[language][key as keyof typeof translations[typeof language]] || key;
    
    // Handle parameter interpolation
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        translation = translation.replace(`{${param}}`, String(value));
      });
    }
    
    return translation;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
