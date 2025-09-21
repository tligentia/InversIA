import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import * as docx from 'docx';
import type { Source, AnalysisContent, ReportData } from '../types';
import { getSentimentStyles, formatTextToHtml } from '../utils/formatter';


const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

const getSanitizedFileName = (name: string) => {
    return name
        .replace(/[^a-z0-9-]/gi, '_') // Reemplaza no alfanuméricos (excepto guiones) con guion bajo
        .replace(/_+/g, '_')         // Colapsa múltiples guiones bajos en uno solo
        .replace(/^_|_$/g, '')       // Elimina guiones bajos al principio o al final
        .toLowerCase();
};

const getReportFileName = (asset: ReportData['asset'], extension: string) => {
    const sanitizedName = getSanitizedFileName(asset.name);
    const date = new Date().toISOString().split('T')[0];
    return `${sanitizedName}_${date}.${extension}`;
};


// --- HTML GENERATION ---

const getHtmlStyles = () => `
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 0; }
  .report-container { max-width: 800px; margin: 2rem auto; background-color: white; padding: 2.5rem; border-radius: 0.5rem; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
  h1, h2, h3, h4 { color: #1e293b; line-height: 1.25; margin-top: 1.75em; margin-bottom: 0.75em;}
  h1 { font-size: 2.25rem; font-weight: 800; color: #b91c1c; text-align: center; margin-top: 0; }
  h2 { font-size: 1.5rem; font-weight: 700; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem; display: flex; align-items: center; gap: 0.75rem;}
  h3 { font-size: 1.25rem; font-weight: 600; display: flex; align-items: center; gap: 0.75rem;}
  h4 { font-size: 1.1rem; font-weight: 600; color: #334155; }
  p { margin-bottom: 1em; }
  a { color: #2563eb; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .header-sub { text-align: center; color: #475569; font-size: 1.125rem; margin-top: -1rem; margin-bottom: 2rem; }
  .asset-info { background-color: #f1f5f9; padding: 1.5rem; border-radius: 0.5rem; margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center; }
  .sentiment-badge { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.8rem; font-weight: 700; padding: 0.25rem 0.65rem; border-radius: 9999px; line-height: 1; }
  .summary { font-style: italic; color: #475569; border-left: 4px solid #cbd5e1; padding-left: 1rem; margin: 1rem 0; }
  .full-text { color: #334155; }
  .sources-list { list-style: none; padding: 0; margin-top: 1.5rem; border-top: 1px dashed #cbd5e1; padding-top: 1rem; }
  .sources-list li { margin-bottom: 0.5rem; }
  .sources-list a { font-size: 0.875rem; color: #475569; word-break: break-all; }
  .section { margin-bottom: 2rem; }
  .footer { text-align: center; margin-top: 3rem; font-size: 0.875rem; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 1rem; }
  @media print {
    @page {
        margin-top: 2.5cm;
        margin-bottom: 2.5cm;
        margin-left: 2cm;
        margin-right: 2cm;
    }
    body {
        background-color: #ffffff;
    }
    .report-container {
        box-shadow: none;
        border: none;
        margin: 0;
        padding: 0;
        border-radius: 0;
        max-width: 100%;
    }
  }
</style>
`;

const getSentimentHtml = (score: number) => {
    const styles = getSentimentStyles(score);
    return `<span class="sentiment-badge" style="background-color: ${styles.bgColor}; color: ${styles.textColor};">${styles.icon} ${styles.label}</span>`;
};

const getSourcesHtml = (sources?: Source[]) => {
    if (!sources || sources.length === 0) return '';
    return `
        <div class="sources">
            <h4>Fuentes Consultadas</h4>
            <ul class="sources-list">
                ${sources.map(s => `<li><a href="${s.uri}" target="_blank" rel="noopener noreferrer">${s.title}</a></li>`).join('')}
            </ul>
        </div>`;
};

const generateHtmlContent = ({ asset, globalAnalysis, analyses }: ReportData): string => {
    const date = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    let body = `
    <div class="report-container" id="report-content">
        <header class="header">
            <h1>InversIA</h1>
            <p class="header-sub">Informe de Análisis Estratégico para ${asset.name} (${asset.ticker}) &bull; ${date}</p>
        </header>

        ${globalAnalysis.content ? `
        <section class="section" style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 1.5rem; border-radius: 0.5rem;">
            <h2><i class="fas fa-globe-europe"></i> Visión Global Consolidada ${getSentimentHtml(globalAnalysis.content.sentiment)}</h2>
            <p class="summary" style="border-left-color: #ef4444;">${globalAnalysis.content.summary}</p>
            <div class="full-text">${formatTextToHtml(globalAnalysis.content.fullText)}</div>
            ${getSourcesHtml(globalAnalysis.sources)}
        </section>
        ` : ''}
        
        ${analyses.length > 0 ? `
        <section class="section">
            <h2>Vectores de Análisis</h2>
            ${analyses.map(v => v.content ? `
                <div class="vector-analysis">
                    <h3>${v.title} ${getSentimentHtml(v.content.sentiment)}</h3>
                    <p class="summary">${v.content.summary}</p>
                    <div class="full-text">${formatTextToHtml(v.content.fullText)}</div>
                    ${getSourcesHtml(v.sources)}
                </div>
            ` : '').join('')}
        </section>
        ` : ''}

        <footer class="footer">
            <p>Generado por InversIA por Tligent. &copy; ${new Date().getFullYear()}</p>
        </footer>
    </div>
    `;
    return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Informe de InversIA para ${asset.name}</title>${getHtmlStyles()}</head><body>${body}</body></html>`;
};


// --- FORMAT SPECIFIC EXPORTERS ---

export const exportAsHtml = (reportData: ReportData) => {
    const htmlContent = generateHtmlContent(reportData);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    downloadBlob(blob, getReportFileName(reportData.asset, 'html'));
};

export const exportAsPdf = async (reportData: ReportData) => {
    const htmlContent = generateHtmlContent(reportData);
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.innerHTML = htmlContent;
    document.body.appendChild(container);

    const contentEl = container.querySelector<HTMLElement>('.report-container');
    if (!contentEl) {
        document.body.removeChild(container);
        throw new Error('Could not find report content element for PDF generation.');
    }

    const canvas = await html2canvas(contentEl, { scale: 2 });
    document.body.removeChild(container);

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const pageTopBottomMargin = 25; // 2.5cm
    const pageLeftRightMargin = 20; // 2.0cm

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const contentWidth = pdfWidth - (pageLeftRightMargin * 2);
    const contentHeight = pdfHeight - (pageTopBottomMargin * 2);

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const ratio = canvasHeight / canvasWidth;
    
    const imgHeight = contentWidth * ratio;
    
    let heightLeft = imgHeight;
    let position = 0;
    
    pdf.addImage(imgData, 'PNG', pageLeftRightMargin, pageTopBottomMargin, contentWidth, imgHeight);
    heightLeft -= contentHeight;

    let pageCount = 1;
    while (heightLeft > 0) {
      position -= contentHeight;
      pageCount++;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', pageLeftRightMargin, position + pageTopBottomMargin, contentWidth, imgHeight);
      heightLeft -= contentHeight;
    }

    for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(100);
        const text = `${reportData.asset.name} | Página ${i} de ${pageCount}`;
        const textWidth = pdf.getStringUnitWidth(text) * pdf.getFontSize() / pdf.internal.scaleFactor;
        const x = (pdfWidth - textWidth) / 2;
        pdf.text(text, x, pdfHeight - (pageTopBottomMargin / 2));
    }
    
    pdf.save(getReportFileName(reportData.asset, 'pdf'));
};

const createSectionTitleWithSentiment = (text: string, headingLevel: any, score?: number): docx.Paragraph => {
    const children: docx.TextRun[] = [new docx.TextRun({ text })];

    if (score !== undefined) {
        const styles = getSentimentStyles(score);
        children.push(new docx.TextRun({ text: "  " })); // Spacer
        children.push(new docx.TextRun({
            text: `${styles.icon} ${styles.label}`,
            shading: {
                type: docx.ShadingType.CLEAR,
                fill: styles.bgColor.replace('#', ''),
                color: "auto",
            },
            color: styles.textColor.replace('#', ''),
            font: { name: "Calibri" },
            bold: true,
            size: 20, // 10pt
        }));
    }

    return new docx.Paragraph({
        children,
        heading: headingLevel,
        spacing: { before: 400, after: 200 }
    });
};

const createDocxContent = (content: AnalysisContent, sources?: Source[]): docx.Paragraph[] => {
    const paragraphs: docx.Paragraph[] = [
        new docx.Paragraph({
            children: [new docx.TextRun({ text: content.summary, italics: true })],
            style: "aside"
        }),
        ...content.fullText.split('\n').filter(t => t.trim()).map(line => new docx.Paragraph({ children: [new docx.TextRun({ text: line })], spacing: { after: 120 }})),
    ];

    if (sources && sources.length > 0) {
        paragraphs.push(new docx.Paragraph({
            children: [new docx.TextRun({ text: "Fuentes Consultadas" })],
            style: "sourceHeading",
            spacing: { before: 200, after: 100 },
        }));
        sources.forEach(source => {
            paragraphs.push(new docx.Paragraph({
                children: [
                     new docx.ExternalHyperlink({
                        children: [
                            new docx.TextRun({
                                text: source.title,
                                style: "Hyperlink",
                            }),
                        ],
                        link: source.uri,
                    }),
                ],
                bullet: { level: 0 },
                style: "sourceItem"
            }));
        });
    }

    return paragraphs;
};

export const exportAsDocx = async (reportData: ReportData) => {
    const { asset, globalAnalysis, analyses } = reportData;

    const children: (docx.Paragraph | docx.Table)[] = [
        new docx.Paragraph({ children: [new docx.TextRun({ text: "InversIA" })], heading: docx.HeadingLevel.TITLE, alignment: docx.AlignmentType.CENTER }),
        new docx.Paragraph({ children: [new docx.TextRun({ text: "Informe de Análisis Estratégico" })], alignment: docx.AlignmentType.CENTER, spacing: { after: 300 } }),
        new docx.Paragraph({ children: [new docx.TextRun({ text: `${asset.name} (${asset.ticker})` })], heading: docx.HeadingLevel.HEADING_1 }),
        new docx.Paragraph({ children: [new docx.TextRun({ text: `Fecha: ${new Date().toLocaleDateString('es-ES')}` })], style: "subtle" }),
    ];
    
    if (globalAnalysis.content) {
        children.push(createSectionTitleWithSentiment(`Visión Global Consolidada`, docx.HeadingLevel.HEADING_2, globalAnalysis.content.sentiment));
        children.push(...createDocxContent(globalAnalysis.content, globalAnalysis.sources));
    }
    
    if (analyses.length > 0) {
        children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: "Vectores de Análisis" })], heading: docx.HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }));
        analyses.forEach(v => {
            if (v.content) {
                children.push(createSectionTitleWithSentiment(v.title, docx.HeadingLevel.HEADING_3, v.content.sentiment));
                children.push(...createDocxContent(v.content, v.sources));
            }
        });
    }

    const doc = new docx.Document({
        creator: "InversIA",
        title: `Informe para ${asset.name}`,
        styles: {
            paragraphStyles: [{
                id: "aside", name: "Aside", basedOn: "Normal", next: "Normal",
                run: { color: "595959", italics: true },
            }, {
                id: "subtle", name: "Subtle", basedOn: "Normal", next: "Normal",
                run: { color: "888888", size: 18 },
            },{
                id: "sourceHeading", name: "Source Heading", basedOn: "Normal", next: "Normal",
                run: { bold: true, size: 22 },
            },{
                id: "sourceItem", name: "Source Item", basedOn: "Normal", next: "Normal",
                run: { size: 18 },
            }],
        },
        sections: [{ 
            properties: {
                page: {
                    margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, // 1 inch
                },
            },
            headers: { default: new docx.Header({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: `Informe InversIA: ${asset.name}` })], alignment: docx.AlignmentType.RIGHT })]})},
            footers: { default: new docx.Footer({ children: [new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [
                new docx.TextRun({ text: `${asset.name} (${asset.ticker})  |  ` }),
                new docx.TextRun({
                    children: [
                        "Página ",
                        docx.PageNumber.CURRENT,
                        " de ",
                        docx.PageNumber.TOTAL_PAGES,
                    ],
                }),
            ]})]})},
            children
        }],
    });
    const blob = await docx.Packer.toBlob(doc);
    downloadBlob(blob, getReportFileName(asset, 'docx'));
};


const generateMarkdownContent = ({ asset, globalAnalysis, analyses }: ReportData): string => {
    let md = `# Informe InversIA: ${asset.name} (${asset.ticker})\n\n`;
    md += `**Fecha:** ${new Date().toLocaleDateString('es-ES')}\n\n`;
    
    const formatSources = (sources?: Source[]) => {
        if (!sources || sources.length === 0) return '';
        return `\n**Fuentes:**\n${sources.map(s => `* [${s.title}](${s.uri})`).join('\n')}`;
    };
    
    const getSentimentMarkdown = (score: number) => {
        const styles = getSentimentStyles(score);
        return `${styles.icon} ${styles.label}`;
    };

    if (globalAnalysis.content) {
        md += `## Visión Global Consolidada - Sentimiento: ${getSentimentMarkdown(globalAnalysis.content.sentiment)}\n\n`;
        md += `> ${globalAnalysis.content.summary}\n\n`;
        md += `${globalAnalysis.content.fullText.replace(/•/g, '*')}\n`;
        md += formatSources(globalAnalysis.sources) + '\n\n---\n\n';
    }

    if (analyses.length > 0) {
        md += `## Vectores de Análisis\n\n`;
        analyses.forEach(v => {
            if(v.content) {
                md += `### ${v.title} - Sentimiento: ${getSentimentMarkdown(v.content.sentiment)}\n\n`;
                md += `> ${v.content.summary}\n\n`;
                md += `${v.content.fullText.replace(/•/g, '*')}\n`;
                md += formatSources(v.sources) + '\n\n';
            }
        });
    }
    return md;
};

export const exportAsMarkdown = (reportData: ReportData) => {
    const mdContent = generateMarkdownContent(reportData);
    const blob = new Blob([mdContent], { type: 'text/markdown' });
    downloadBlob(blob, getReportFileName(reportData.asset, 'md'));
};


const generateTxtContent = ({ asset, globalAnalysis, analyses }: ReportData): string => {
    let txt = `INFORME DE ANÁLISIS ESTRATÉGICO - InversIA\n============================================\n\n`;
    txt += `Activo: ${asset.name} (${asset.ticker})\n`;
    txt += `Tipo: ${asset.type === 'crypto' ? 'Criptomoneda' : 'Acción'}\n`;
    txt += `Fecha: ${new Date().toLocaleDateString('es-ES')}\n\n`;

    const formatSources = (sources?: Source[]) => {
        if (!sources || sources.length === 0) return '';
        return `\nFuentes Consultadas:\n${sources.map(s => ` - ${s.title}: ${s.uri}`).join('\n')}`;
    };

    const getSentimentText = (score: number) => {
        const styles = getSentimentStyles(score);
        return `${styles.icon} ${styles.label}`;
    };

    if (globalAnalysis.content) {
        txt += `--- VISIÓN GLOBAL CONSOLIDADA ---\n`;
        txt += `Sentimiento: ${getSentimentText(globalAnalysis.content.sentiment)}\n`;
        txt += `Resumen: ${globalAnalysis.content.summary}\n\n`;
        txt += `${globalAnalysis.content.fullText}\n`;
        txt += formatSources(globalAnalysis.sources) + '\n\n';
    }

    if (analyses.length > 0) {
        txt += `--- VECTORES DE ANÁLISIS ---\n\n`;
        analyses.forEach(v => {
            if(v.content) {
                txt += `## ${v.title.toUpperCase()} ##\n`;
                txt += `Sentimiento: ${getSentimentText(v.content.sentiment)}\n`;
                txt += `Resumen: ${v.content.summary}\n\n`;
                txt += `${v.content.fullText}\n`;
                txt += formatSources(v.sources) + '\n\n';
            }
        });
    }
    return txt;
};

export const exportAsTxt = (reportData: ReportData) => {
    const txtContent = generateTxtContent(reportData);
    const blob = new Blob([txtContent], { type: 'text/plain' });
    downloadBlob(blob, getReportFileName(reportData.asset, 'txt'));
};


export const copyToClipboard = async (reportData: ReportData) => {
    const htmlContent = generateHtmlContent(reportData);
    try {
        const blob = new Blob([htmlContent], { type: 'text/html' });
        await navigator.clipboard.write([
            new ClipboardItem({ [blob.type]: blob }),
        ]);
    } catch (err) {
        console.error('Failed to copy rich text: ', err);
        // Fallback to plain text
        const textContent = generateTxtContent(reportData);
        await navigator.clipboard.writeText(textContent);
        alert('Contenido enriquecido no soportado, se ha copiado como texto plano.');
    }
};