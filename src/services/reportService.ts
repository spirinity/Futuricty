import { jsPDF } from 'jspdf';

export interface ReportInput {
  address: string;
  coordinates: { lat: number; lng: number };
  scores: {
    overall: number;
    services: number;
    mobility: number;
    safety: number;
    environment: number;
  };
  facilityCounts: {
    health: number;
    education: number;
    market: number;
    transport: number;
    walkability: number;
    recreation: number;
    safety: number;
    accessibility: number;
    police: number;
    religious: number;
  };
  nearbyFacilities?: string[];
  aiSummary?: string;
  userMode?: string;
  language?: string;
}

export function generatePdfReport(data: ReportInput) {
  const doc = new jsPDF();
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const margin = 20;
  let cursorY = 20;

  // -- UTILS --
  const drawHeader = () => {
    // Brand Color Background
    doc.setFillColor(15, 23, 42); // slate-900 like
    doc.rect(0, 0, width, 40, "F");

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("Futuricity Report", margin, 20);

    // Date & Mode
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Date: ${new Date().toLocaleDateString()} | Time: ${new Date().toLocaleTimeString()}`,
      margin,
      30
    );
    const modeText = `Mode: ${data.userMode || "Resident"} | Lang: ${
      data.language === "id" ? "ID" : "EN"
    }`;
    doc.text(modeText, width - margin - doc.getTextWidth(modeText), 30);
    
    cursorY = 55; // Reset cursor below header
  };

  const drawSectionTitle = (title: string) => {
    // Check page break
    if (cursorY > height - 40) {
      doc.addPage();
      cursorY = 30;
    }
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42); // Dark color
    doc.text(title, margin, cursorY);
    
    // Underline
    doc.setDrawColor(59, 130, 246); // Blue-500
    doc.setLineWidth(1);
    doc.line(margin, cursorY + 2, margin + 20, cursorY + 2);
    
    cursorY += 15;
  };

  const drawScoreBox = (label: string, score: number, x: number, y: number) => {
    // Simplified score box
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(x, y, 40, 30, 2, 2, "FD");

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(label, x + 20, y + 10, { align: "center" });

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    if (score >= 80) doc.setTextColor(22, 163, 74); // green-600
    else if (score >= 60) doc.setTextColor(37, 99, 235); // blue-600
    else if (score >= 40) doc.setTextColor(234, 179, 8); // yellow-500
    else doc.setTextColor(220, 38, 38); // red-600
    
    doc.text(String(Math.round(score)), x + 20, y + 22, { align: "center" });
  };

  // -- CONTENT --
  
  // 1. Header
  drawHeader();

  // 2. Location Info
  drawSectionTitle("Location Details");
  doc.setFontSize(11);
  doc.setTextColor(51, 65, 85); // slate-700
  doc.setFont("helvetica", "normal");
  
  // Address might be long, so split it
  const addressLines = doc.splitTextToSize(data.address, width - (margin * 2));
  doc.text(addressLines, margin, cursorY);
  cursorY += (addressLines.length * 6) + 5;
  
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`Coordinates: ${data.coordinates.lat.toFixed(6)}, ${data.coordinates.lng.toFixed(6)}`, margin, cursorY);
  cursorY += 20;

  // 3. Scores
  // Draw Main Score (Big) and Subscores (Small)
  // Overall
  doc.setFillColor(240, 253, 244); // green-50
  if (data.scores.overall < 80) doc.setFillColor(239, 246, 255); // blue-50
  if (data.scores.overall < 60) doc.setFillColor(254, 252, 232); // yellow-50
  if (data.scores.overall < 40) doc.setFillColor(254, 242, 242); // red-50
  
  doc.roundedRect(margin, cursorY, width - (margin * 2), 40, 3, 3, "F");
  
  doc.setFontSize(12);
  doc.setTextColor(71, 85, 105);
  doc.text("Overall Livability Score", margin + 10, cursorY + 15);
  
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(String(Math.round(data.scores.overall)), margin + 10, cursorY + 30);
  doc.setFontSize(14);
  doc.text("/ 100", margin + 35, cursorY + 30);
  
  cursorY += 50;

  // Subscores Grid
  const startX = margin;
  drawScoreBox("Services", data.scores.services, startX, cursorY);
  drawScoreBox("Mobility", data.scores.mobility, startX + 45, cursorY);
  drawScoreBox("Safety", data.scores.safety, startX + 90, cursorY);
  drawScoreBox("Environment", data.scores.environment, startX + 135, cursorY);
  
  cursorY += 45;

  // 4. Facility Counts
  drawSectionTitle("Facilities Overview");
  
  const facilityKeys = Object.keys(data.facilityCounts);
  const colWidth = (width - (margin * 2)) / 2;
  let row = 0;
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);

  facilityKeys.forEach((key, index) => {
    const isRightCol = index % 2 !== 0;
    const x = isRightCol ? margin + colWidth : margin;
    const y = cursorY + (Math.floor(index / 2) * 8);
    
    // Capitalize key
    const label = key.charAt(0).toUpperCase() + key.slice(1);
    const value = data.facilityCounts[key as keyof typeof data.facilityCounts];
    
    doc.text(`${label}:`, x, y);
    doc.setFont("helvetica", "bold");
    doc.text(String(value), x + 40, y);
    doc.setFont("helvetica", "normal");
  });
  
  cursorY += (Math.ceil(facilityKeys.length / 2) * 8) + 15;

  // 5. AI Summary
  if (data.aiSummary) {
     // Check page break for AI summary
     if (cursorY > height - 60) {
        doc.addPage();
        cursorY = 20;
     }

     drawSectionTitle("AI Analysis");
     
     // Background box
     doc.setFillColor(241, 245, 249); // slate-100
     doc.roundedRect(margin, cursorY, width - (margin * 2), 40, 2, 2, "F"); 
     
     // Just wrap text plainly, simple drawing
     doc.setFontSize(10);
     doc.setTextColor(30, 41, 59);
     doc.setFont("helvetica", "italic");
     
     const summaryLines = doc.splitTextToSize(data.aiSummary, width - (margin * 2) - 10);
     // Adjust box height to text
     const boxHeight = (summaryLines.length * 5) + 10;
     doc.roundedRect(margin, cursorY, width - (margin * 2), boxHeight, 2, 2, "F");
     
     doc.text(summaryLines, margin + 5, cursorY + 8);
     cursorY += boxHeight + 20;
  }
  
  // 6. Footer
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text("Generated by Futuricity - Urban Analytics Platform", width / 2, height - 10, { align: "center" });

  // Save
  const safeAddress = data.address.replace(/[^a-z0-9]+/gi, '_').slice(0, 30);
  doc.save(`Futuricity_Report_${safeAddress}.pdf`);
}


