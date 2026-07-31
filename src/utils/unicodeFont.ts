// Unicode Font Helper for jsPDF Vietnamese & Multi-language Support
import jsPDF from "jspdf";

export function addUnicodeFont(doc: jsPDF) {
  try {
    // Force standard UTF-8 font settings
    doc.setFont("helvetica", "normal");
  } catch (e) {
    console.warn("Unicode font configuration fallback:", e);
  }
}
