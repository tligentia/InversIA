
import { GoogleGenAI, Type } from "@google/genai";
import { Asset, Source, AnalysisContent, QuotaExceededError, AiAnswer, ChatMessage, AnomalousPriceError, MarketAnalysisResult, Currency } from '../types';

// El cliente se inicializa globalmente con la clave preconfigurada
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

function getClient(): GoogleGenAI {
    return ai;
}

interface TokenUsage {
    promptTokens: number;
    candidateTokens: number;
    totalTokens: number;
}

interface GeminiResponse<T> {
    data: T;
    usage: TokenUsage;
}

function handleGeminiError(error: unknown, defaultMessage: string, model: string): Error {
    console.error(`Gemini Error [${model}]:`, error);

    if (error instanceof Error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("resource_exhausted") || msg.includes("quota")) {
            return new QuotaExceededError(`Cuota excedida para ${model}.`, model);
        }
    }
    return error instanceof AnomalousPriceError ? error : new Error(defaultMessage);
}

function safeJsonParse<T>(jsonString: string, functionName: string): T {
    try {
        return JSON.parse(jsonString) as T;
    } catch (e) {
        console.error(`JSON Parse Error en ${functionName}:`, e);
        throw new Error("Formato de datos no válido.");
    }
}

function cleanAndParseJson<T>(text: string, functionName: string): T {
    let jsonText = text.trim().replace(/^```json\s*/, '').replace(/```$/, '').trim();
    if (!jsonText.startsWith('{') && !jsonText.startsWith('[')) {
        const start = Math.min(jsonText.indexOf('{') === -1 ? Infinity : jsonText.indexOf('{'), jsonText.indexOf('[') === -1 ? Infinity : jsonText.indexOf('['));
        const end = Math.max(jsonText.lastIndexOf('}'), jsonText.lastIndexOf(']'));
        if (start !== Infinity && end !== -1) jsonText = jsonText.substring(start, end + 1);
    }
    return safeJsonParse<T>(jsonText, functionName);
}

export async function getAssetInfo(query: string, engine: string): Promise<GeminiResponse<Asset[]>> {
    const prompt = `Identifica activos financieros para la consulta: "${query}". Devuelve nombre, ticker, tipo ('stock' o 'crypto'), descripción y URL de Investing.com España.`;
    try {
        const response = await getClient().models.generateContent({
            model: engine,
            contents: prompt,
            config: {
                temperature: 0.3,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        assets: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    ticker: { type: Type.STRING },
                                    type: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    investingUrl: { type: Type.STRING }
                                },
                                required: ["name", "ticker", "type", "description", "investingUrl"]
                            }
                        }
                    },
                    required: ["assets"]
                }
            }
        });
        const usage = { promptTokens: response.usageMetadata?.promptTokenCount ?? 0, candidateTokens: response.usageMetadata?.candidatesTokenCount ?? 0, totalTokens: response.usageMetadata?.totalTokenCount ?? 0 };
        const result = safeJsonParse<{ assets: Asset[] }>(response.text.trim(), 'getAssetInfo');
        return { data: result.assets ?? [], usage };
    } catch (error) {
        throw handleGeminiError(error, "Fallo al buscar activos.", engine);
    }
}

export async function getAnalysisVectorsForAsset(asset: Asset, engine: string): Promise<GeminiResponse<string[] | null>> {
    const prompt = `Genera 8 vectores de análisis clave para ${asset.name} (${asset.ticker}). Obligatorios: Socioeconómico, Sentimiento, Competidores, Dividendos, Expertos y Análisis del sector.`;
    try {
        const response = await getClient().models.generateContent({
            model: engine,
            contents: prompt,
            config: {
                temperature: 0.4,
                responseMimeType: "application/json",
                responseSchema: { type: Type.OBJECT, properties: { vectors: { type: Type.ARRAY, items: { type: Type.STRING }}}, required: ["vectors"] }
            }
        });
        const usage = { promptTokens: response.usageMetadata?.promptTokenCount ?? 0, candidateTokens: response.usageMetadata?.candidatesTokenCount ?? 0, totalTokens: response.usageMetadata?.totalTokenCount ?? 0 };
        const result = safeJsonParse<{ vectors: string[] }>(response.text.trim(), 'getAnalysisVectors');
        return { data: result.vectors || null, usage };
    } catch (error) {
        throw handleGeminiError(error, "Fallo al obtener vectores.", engine);
    }
}

export async function getAssetAnalysis(asset: Asset, vector: string, engine: string): Promise<GeminiResponse<{ content: AnalysisContent; sources: Source[] }>> {
    const prompt = `Actúa como API JSON. Análisis sobre "${vector}" para "${asset.name}" (${asset.ticker}). Incluye fullText, summary (1-2 frases), sentiment (-10 a +10) y limitBuyPrice si aplica.`;
    try {
        const response = await getClient().models.generateContent({
            model: engine,
            contents: prompt,
            config: { tools: [{googleSearch: {}}], systemInstruction: "Analista financiero experto. Solo JSON.", temperature: 0.5, maxOutputTokens: 4096 }
        });
        const usage = { promptTokens: response.usageMetadata?.promptTokenCount ?? 0, candidateTokens: response.usageMetadata?.candidatesTokenCount ?? 0, totalTokens: response.usageMetadata?.totalTokenCount ?? 0 };
        const sources: Source[] = (response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? []).map(chunk => ({ uri: chunk.web?.uri ?? '', title: chunk.web?.title ?? 'Fuente' })).filter(s => s.uri);
        const analysisContent = cleanAndParseJson<AnalysisContent>(response.text, 'getAssetAnalysis');
        return { data: { content: analysisContent, sources }, usage };
    } catch (error) {
        throw handleGeminiError(error, `Fallo en vector ${vector}.`, engine);
    }
}

export async function getGlobalAnalysis(asset: Asset, existingAnalyses: string, engine: string): Promise<GeminiResponse<{ content: AnalysisContent; sources: Source[] }>> {
    const prompt = `Sintetiza Tesis de Inversión Global para ${asset.name} (${asset.ticker}) basada en:\n${existingAnalyses}. Devuelve fullText, summary, limitBuyPrice y sentiment.`;
    try {
        const response = await getClient().models.generateContent({
            model: engine,
            contents: prompt,
            config: { tools: [{googleSearch: {}}], systemInstruction: "CIO experto. Solo JSON.", temperature: 0.6, maxOutputTokens: 4096 }
        });
        const usage = { promptTokens: response.usageMetadata?.promptTokenCount ?? 0, candidateTokens: response.usageMetadata?.candidatesTokenCount ?? 0, totalTokens: response.usageMetadata?.totalTokenCount ?? 0 };
        const sources: Source[] = (response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? []).map(chunk => ({ uri: chunk.web?.uri ?? '', title: chunk.web?.title ?? 'Fuente' })).filter(s => s.uri);
        const analysisContent = cleanAndParseJson<AnalysisContent>(response.text, 'getGlobalAnalysis');
        return { data: { content: analysisContent, sources }, usage };
    } catch (error) {
        throw handleGeminiError(error, 'Fallo en Visión Global.', engine);
    }
}

export async function askAboutAnalysis(assetName: string, analysisContext: string, question: string, history: ChatMessage[], engine: string): Promise<GeminiResponse<{ answerFound: boolean } & AiAnswer>> {
    const prompt = `Responde sobre "${assetName}" usando SOLO el contexto: ${analysisContext}. Pregunta: "${question}". JSON: answerFound (bool), summary, fullText.`;
    try {
        const response = await getClient().models.generateContent({
            model: engine,
            contents: prompt,
            config: { systemInstruction: "Asistente Q&A estricto. Solo JSON.", temperature: 0.2, responseMimeType: "application/json" }
        });
        const usage = { promptTokens: response.usageMetadata?.promptTokenCount ?? 0, candidateTokens: response.usageMetadata?.candidatesTokenCount ?? 0, totalTokens: response.usageMetadata?.totalTokenCount ?? 0 };
        const answer = cleanAndParseJson<{ answerFound: boolean } & AiAnswer>(response.text, 'askAboutAnalysis');
        return { data: answer, usage };
    } catch (error) {
        throw handleGeminiError(error, `Fallo en chat.`, engine);
    }
}

export async function askWithWebSearch(assetName: string, question: string, history: ChatMessage[], engine: string): Promise<GeminiResponse<AiAnswer>> {
    const prompt = `Investiga en la web para "${assetName}": "${question}". JSON: summary, fullText.`;
    try {
        const response = await getClient().models.generateContent({
            model: engine,
            contents: prompt,
            config: { tools: [{googleSearch: {}}], systemInstruction: "Investigador financiero web. Solo JSON.", temperature: 0.4 }
        });
        const usage = { promptTokens: response.usageMetadata?.promptTokenCount ?? 0, candidateTokens: response.usageMetadata?.candidatesTokenCount ?? 0, totalTokens: response.usageMetadata?.totalTokenCount ?? 0 };
        const sources: Source[] = (response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? []).map(chunk => ({ uri: chunk.web?.uri ?? '', title: chunk.web?.title ?? 'Fuente' })).filter(s => s.uri);
        const answer = cleanAndParseJson<Omit<AiAnswer, 'sources'>>(response.text.trim(), 'askWithWebSearch');
        return { data: { ...answer, sources }, usage };
    } catch (error) {
        throw handleGeminiError(error, `Fallo en búsqueda web.`, engine);
    }
}

export async function getAlternativeAssets(asset: Asset, engine: string, currency: Currency): Promise<GeminiResponse<Asset[] | null>> {
    const prompt = `Busca 4 alternativas a "${asset.name}" (${asset.ticker}). Precios en ${currency}. JSON: alternatives [name, ticker, currentPrice, change].`;
    try {
        const response = await getClient().models.generateContent({ model: engine, contents: prompt, config: { tools: [{googleSearch: {}}], temperature: 0.1 } });
        const usage = { promptTokens: response.usageMetadata?.promptTokenCount ?? 0, candidateTokens: response.usageMetadata?.candidatesTokenCount ?? 0, totalTokens: response.usageMetadata?.totalTokenCount ?? 0 };
        const result = cleanAndParseJson<{alternatives: any[]}>(response.text, 'getAlternatives');
        const data = (result.alternatives || []).map(alt => ({ name: alt.name, ticker: alt.ticker, type: asset.type, currentPrice: alt.currentPrice, change: alt.change }));
        return { data, usage };
    } catch (error) {
        throw handleGeminiError(error, "Fallo en alternativas.", engine);
    }
}

export async function getAssetQuote(asset: Asset, engine: string, currency: Currency): Promise<GeminiResponse<{ price: number; changeValue: number; changePercentage: number; currency: string } | null>> {
    const prompt = `Cotización más reciente para ${asset.name} (${asset.ticker}). JSON: price, changeValue, changePercentage, currency (${currency}).`;
    try {
        const response = await getClient().models.generateContent({ model: engine, contents: prompt, config: { tools: [{ googleSearch: {} }], systemInstruction: "API cotizaciones. Solo JSON.", temperature: 0 } });
        const usage = { promptTokens: response.usageMetadata?.promptTokenCount ?? 0, candidateTokens: response.usageMetadata?.candidatesTokenCount ?? 0, totalTokens: response.usageMetadata?.totalTokenCount ?? 0 };
        const quoteData = cleanAndParseJson<{ price: number; changeValue: number; changePercentage: number; currency: string }>(response.text.trim(), 'getAssetQuote');
        return { data: quoteData, usage };
    } catch (error) {
        throw handleGeminiError(error, "Fallo al obtener cotización.", engine);
    }
}

export async function getAssetPriceOnDate(asset: Asset, date: string, engine: string, currentPrice: number | null, currency: Currency): Promise<GeminiResponse<{ price: number | null; currency: string } | null>> {
    const prompt = `Precio histórico para ${asset.ticker} el ${date}. JSON: price, currency (${currency}).`;
    try {
        const response = await getClient().models.generateContent({ model: engine, contents: prompt, config: { tools: [{ googleSearch: {} }], systemInstruction: "API precios históricos. Solo JSON.", temperature: 0 } });
        const usage = { promptTokens: response.usageMetadata?.promptTokenCount ?? 0, candidateTokens: response.usageMetadata?.candidatesTokenCount ?? 0, totalTokens: response.usageMetadata?.totalTokenCount ?? 0 };
        const priceData = cleanAndParseJson<{ price: number | null; currency: string }>(response.text.trim(), 'getPriceOnDate');
        return { data: priceData, usage };
    } catch (error) {
        throw handleGeminiError(error, "Fallo al obtener precio histórico.", engine);
    }
}

export async function getAssetFuturePricePrediction(asset: Asset, date: string, engine: string, currency: Currency): Promise<GeminiResponse<{ price: number; currency: string } | null>> {
    const prompt = `Predicción de precio para ${asset.ticker} el ${date}. JSON: price, currency (${currency}).`;
    try {
        const response = await getClient().models.generateContent({ model: engine, contents: prompt, config: { tools: [{ googleSearch: {} }], systemInstruction: "API predicciones. Solo JSON.", temperature: 0.4 } });
        const usage = { promptTokens: response.usageMetadata?.promptTokenCount ?? 0, candidateTokens: response.usageMetadata?.candidatesTokenCount ?? 0, totalTokens: response.usageMetadata?.totalTokenCount ?? 0 };
        const priceData = cleanAndParseJson<{ price: number; currency: string }>(response.text.trim(), 'getFuturePrice');
        return { data: priceData, usage };
    } catch (error) {
        throw handleGeminiError(error, "Fallo al predecir precio.", engine);
    }
}

export async function getLimitBuyPrice(asset: Asset, engine: string, currency: Currency): Promise<GeminiResponse<{ price: number } | null>> {
    const prompt = `Precio Límite de Compra táctico para ${asset.name} (${asset.ticker}) en ${currency}. JSON: price.`;
    try {
        const response = await getClient().models.generateContent({ model: engine, contents: prompt, config: { tools: [{ googleSearch: {} }], systemInstruction: "API análisis técnico. Solo JSON.", temperature: 0.2 } });
        const usage = { promptTokens: response.usageMetadata?.promptTokenCount ?? 0, candidateTokens: response.usageMetadata?.candidatesTokenCount ?? 0, totalTokens: response.usageMetadata?.totalTokenCount ?? 0 };
        const priceData = cleanAndParseJson<{ price: number }>(response.text.trim(), 'getLimitPrice');
        return { data: priceData, usage };
    } catch (error) {
        throw handleGeminiError(error, "Fallo al obtener precio límite.", engine);
    }
}

export async function getAvailableTextModels(): Promise<string[]> {
    return ['gemini-3-flash-preview', 'gemini-3-pro-preview'];
}

export async function analyzeMarketSector(sector: string, criteria: string, engine: string, currency: Currency): Promise<GeminiResponse<MarketAnalysisResult>> {
    const prompt = `Análisis de sector "${sector}" por "${criteria}". Métricas en ${currency}. JSON: title, assets [name, ticker, marketCap, sentiment, peRatio, eps, dividendYield], sectorAverage.`;
    try {
        const response = await getClient().models.generateContent({ model: engine, contents: prompt, config: { tools: [{ googleSearch: {} }], temperature: 0.2 } });
        const usage = { promptTokens: response.usageMetadata?.promptTokenCount ?? 0, candidateTokens: response.usageMetadata?.candidatesTokenCount ?? 0, totalTokens: response.usageMetadata?.totalTokenCount ?? 0 };
        const result = cleanAndParseJson<MarketAnalysisResult>(response.text, 'analyzeSector');
        const parse = (v: any) => typeof v === 'number' ? v : parseFloat(String(v).match(/-?[\d.]+/)?.[0] || "0");
        const sanitized: MarketAnalysisResult = { ...result, assets: (result.assets || []).map(a => ({ ...a, peRatio: parse(a.peRatio), eps: parse(a.eps), dividendYield: parse(a.dividendYield) })), sectorAverage: result.sectorAverage ? { ...result.sectorAverage, averagePeRatio: parse(result.sectorAverage.averagePeRatio), averageEps: parse(result.sectorAverage.averageEps), averageDividendYield: parse(result.sectorAverage.averageDividendYield) } : { marketCap: '0', averagePeRatio: 0, averageEps: 0, averageDividendYield: 0 } };
        return { data: sanitized, usage };
    } catch (error) {
        throw handleGeminiError(error, "Fallo al analizar sector.", engine);
    }
}
