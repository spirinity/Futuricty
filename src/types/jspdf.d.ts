declare module 'jspdf' {
  export class jsPDF {
    constructor(...args: any[]);
    setFont(font: string, style?: string): void;
    setFontSize(size: number): void;
    text(text: string | string[], x: number, y: number): void;
    splitTextToSize(text: string, maxSize: number): string[];
    addPage(): void;
    save(filename?: string): void;
  }
}


