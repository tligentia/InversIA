
import { GoogleGenAI, Type } from "@google/genai";
import { Asset, Source, AnalysisContent, QuotaExceededError, AiAnswer, ChatMessage, AnomalousPriceError, MarketAnalysisResult, Currency } from '../types';

// FIX: Initializing GoogleGenAI client instance directly using process.env.API_KEY as per guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

function getClient(): GoogleGenAI {
    // FIX: Removed manual API key checks as the application now relies on the pre-configured environment variable.
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
    console.error(`Gemini API Error in function calling model '${model}':`, error);

    let debugInfo = '';
    if (error instanceof Error && error.stack) {
        const stackLines = error.stack.split('\n');
        const callerLine = stackLines.find(line => line.includes('at ') && !line.includes('geminiService.ts'));
        
        if (callerLine) {
            const match = callerLine.match(/at\s+([^\s(]+)\s+\(?(?:[^\/]+\/)*([^\/)]+:\d+):\d+\)?/);
            if (match && match[1] && match[2]) {
                 debugInfo = `\n(Error en ${match[1]} en ${match[2]})`;
            } else {
                const simpleMatch = callerLine.match(/\((?:[^\/]+\/)*([^\/)]+:\d+:\d+)\)/);
                if (simpleMatch && simpleMatch[1]) {
                    debugInfo = `\n(Error en ${simpleMatch[1]})`;
                } else {
                     debugInfo = `\n(Detalles: ${callerLine.trim()})`;
                }
            }
        }
    }

    if (error instanceof TypeError && (error.message.toLowerCase().includes('fetch') || error.message.toLowerCase().includes('load failed') || error.message.toLowerCase().includes('networkerror'))) {
        return new Error("Error de red. Por favor, comprueba tu conexión a internet, desactiva extensiones de bloqueo de anuncios (ad-blockers) e inténtalo de nuevo." + debugInfo);
    }

    if (error instanceof AnomalousPriceError) {
        error.message += debugInfo;
        return error;
    }

    if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();

        if (errorMessage.includes("resource_exhausted") || errorMessage.includes("quota")) {
            const quotaMessage = `Se ha excedido la cuota de uso para el motor de IA '${model}'. Por favor, revisa tu plan y los detalles de facturación en tu cuenta de Google AI Studio para poder continuar.`;
            return new QuotaExceededError(quotaMessage + debugInfo, model);
        }

        if (errorMessage.includes("api key not valid") || errorMessage.includes("permission_denied")) {
            return new Error(`La clave API de Gemini proporcionada no es válida o no tiene los permisos necesarios.` + debugInfo);
        }

        if (errorMessage.includes("not_found") || errorMessage.includes("404")) {
            return new Error(`El motor de IA '${model}' no fue encontrado o no está disponible. Por favor, selecciona otro motor si es posible.` + debugInfo);
        }

        if (errorMessage.includes("invalid argument")) {
             return new Error(`La solicitud a la API contenía un argumento no válido. Esto puede ser un error interno. Por favor, intenta reformular tu petición. Detalles: ${error.message}` + debugInfo);
        }
        
        if (!errorMessage.includes('json') && !errorMessage.includes('internal')) {
             return new Error(`La API ha devuelto un error: ${error.message}` + debugInfo);
        }
    }

    return new Error(defaultMessage + debugInfo);
}

function safeJsonParse<T>(jsonString: string, functionName: string): T {
    try {
        return JSON.parse(jsonString) as T;
    } catch (initialError) {
        console.warn(`Initial JSON parsing failed in ${functionName}. Attempting to repair...`, { error: initialError });
        try {
            let repairedString = '';
            let inString = false;
            let isEscaped = false;

            for (let i = 0; i < jsonString.length; i++) {
                const char = jsonString[i];

                if (isEscaped) {
                    repairedString += char;
                    isEscaped = false;
                    continue;
                }

                if (char === '\\') {
                    isEscaped = true;
                    repairedString += char;
                    continue;
                }

                if (char === '"') {
                    if (inString) {
                        let nextMeaningfulChar = '';
                        for (let j = i + 1; j < jsonString.length; j++) {
                            if (!/\s/.test(jsonString[j])) {
                                nextMeaningfulChar = jsonString[j];
                                break;
                            }
                        }
                        if (nextMeaningfulChar === ':' || nextMeaningfulChar === ',' || nextMeaningfulChar === '}' || nextMeaningfulChar === ']') {
                            inString = false;
                            repairedString += char;
                        } else {
                            repairedString += '\\"';
                        }
                    } else {
                        inString = true;
                        repairedString += char;
                    }
                } else if (inString && (char === '\n' || char === '\r')) {
                    if (char === '\n') repairedString += '\\n';
                    if (char === '\r') repairedString += '\\r';
                } else {
                    repairedString += char;
                }
            }

            return JSON.parse(repairedString) as T;

        } catch (repairError) {
            console.error(`Error parsing JSON in ${functionName} even after repair attempt:`, repairError, "Raw string:", jsonString);
            throw new Error(`La API devolvió un formato de datos inesperado. Por favor, inténtalo de nuevo.`);
        }
    }
}

function cleanAndParseJson<T>(text: string, functionName: string): T {
    let jsonText = text.trim().replace(/^```json\s*/, '').replace(/```$/, '').trim();

    if (!jsonText.startsWith('{') && !jsonText.startsWith('[')) {
        const firstBrace = text.indexOf('{');
        const firstBracket = text.indexOf('[');
        let start = -1;

        if (firstBrace === -1) {
            start = firstBracket;
        } else if (firstBracket === -1) {
            start = firstBrace;
        } else {
            start = Math.min(firstBrace, firstBracket);
        }

        if (start !== -1) {
            const lastBrace = text.lastIndexOf('}');
            const lastBracket = text.lastIndexOf(']');
            const end = Math.max(lastBrace, lastBracket);

            if (end > start) {
                jsonText = text.substring(start, end + 1);
            }
        }
    }
    
    return safeJsonParse<T>(jsonText, functionName);
}

export async function getAssetInfo(query: string, engine: string): Promise<GeminiResponse<Asset[]>> {
    const prompt = `Un usuario ha introducido la siguiente consulta para identificar un activo financiero: "${query}". Tu tarea como analista experto es identificar todas las posibles coincidencias relevantes a nivel mundial. Para cada activo, proporciona su nombre, ticker, tipo ('stock' o 'crypto'), una breve descripción y, crucialmente, la URL directa a su página principal en la versión en español de Investing.com (debe empezar con https://es.investing.com/...). Esta URL es muy importante; asegúrate de que apunte a la página específica del activo. Si no encuentras una URL directa, déjala vacía.`;

    try {
        const client = getClient();
        const response = await client.models.generateContent({
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
                },
            },
        });
        
        const usageMetadata = response.usageMetadata;
        const usage: TokenUsage = {
            promptTokens: usageMetadata?.promptTokenCount ?? 0,
            candidateTokens: usageMetadata?.candidatesTokenCount ?? 0,
            totalTokens: usageMetadata?.totalTokenCount ?? 0,
        };
        // FIX: Using property access .text as recommended by the guidelines.
        const jsonText = response.text.trim();
        if (!jsonText) return { data: [], usage };
        
        const result = safeJsonParse<{ assets: Asset[] }>(jsonText, 'getAssetInfo');
        return { data: result.assets ?? [], usage };

    } catch (error) {
        throw handleGeminiError(error, "No se pudo conectar con el servicio de IA para buscar activos.", engine);
    }
}

export async function getAnalysisVectorsForAsset(asset: Asset, engine: string): Promise<GeminiResponse<string[] | null>> {
    let prompt: string;
    if (asset.type === 'stock') {
        prompt = `Como analista estratégico senior, genera una lista de 8 vectores de análisis clave para la acción "${asset.name}" (${asset.ticker}). La lista debe ser variada, cubriendo aspectos fundamentales, técnicos, de mercado y macroeconómicos. Incluye obligatoriamente en la lista "Análisis Socioeconómico Global", "Sentimiento de los Mercados", "Ranking respecto a sus competidores", "Reparto de dividendos", "Opinión de los expertos" y "Análisis del sector".`;
    } else { 
        prompt = `Como analista estratégico senior, para el activo de tipo crypto "${asset.name}" (${asset.ticker}), sugiere una lista de 8 vectores de análisis clave adaptados a su naturaleza. Incluye obligatoriamente en la lista "Análisis Socioeconómico Global", "Sentimiento de los Mercados", "Ranking respecto a sus competidores", "Opinión de los expertos" y "Análisis del sector".`;
    }

    try {
        const client = getClient();
        const response = await client.models.generateContent({
            model: engine,
            contents: prompt,
            config: {
                temperature: 0.4,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT, properties: { vectors: { type: Type.ARRAY, items: { type: Type.STRING }}}, required: ["vectors"],
                },
            },
        });
        
        const usageMetadata = response.usageMetadata;
        const usage: TokenUsage = {
            promptTokens: usageMetadata?.promptTokenCount ?? 0,
            candidateTokens: usageMetadata?.candidatesTokenCount ?? 0,
            totalTokens: usageMetadata?.totalTokenCount ?? 0,
        };
        // FIX: Using property access .text instead of method call.
        const jsonText = response.text.trim();
        if (!jsonText) return { data: null, usage };
        
        const result = safeJsonParse<{ vectors: string[] }>(jsonText, 'getAnalysisVectorsForAsset');
        return { data: result.vectors || null, usage };

    } catch (error) {
        throw handleGeminiError(error, "No se pudieron obtener los vectores de análisis para este activo.", engine);
    }
}

export async function getAssetAnalysis(asset: Asset, vector: string, engine: string): Promise<GeminiResponse<{ content: AnalysisContent; sources: Source[] }>> {
    const prompt = `**Tarea Crítica**: Tu única función es actuar como un API que devuelve JSON. No debes escribir ninguna palabra explicativa, saludo, ni texto introductorio. Tu respuesta debe ser *exclusivamente* un objeto JSON válido.
**Contexto**: Estás realizando un análisis estratégico sobre el vector "${vector}" para el activo de tipo "${asset.type}": "${asset.name}" (Símbolo: ${asset.ticker}).
**Instrucciones**:
1.  Usa la búsqueda web para obtener información actualizada y relevante sobre el vector de análisis.
2.  Redacta un análisis detallado y profundo en el campo \`fullText\`.
3.  Crea un resumen conciso y directo de 1-2 frases del análisis completo en el campo \`summary\`.
4.  **Evalúa el sentimiento** del análisis en una escala de -10 (muy negativo) a +10 (muy positivo) y ponlo en el campo numérico \`sentiment\`.
5.  **Calcula el Precio Límite de Compra**: Si este vector está relacionado con análisis técnico, valoración o puntos de entrada, calcula un precio de compra límite tácticamente bueno. Ponlo en el campo numérico \`limitBuyPrice\`.
6.  Formatea la salida como un objeto JSON con las claves 'sentiment' (number), 'summary' (string), 'fullText' (string) y opcionalmente 'limitBuyPrice' (number).
**Respuesta (JSON Válido Solamente)**:`;

    try {
        const client = getClient();
        const config: any = {
             tools: [{googleSearch: {}}],
             systemInstruction: "Eres un analista estratégico y financiero de primer nivel. Devuelves exclusivamente JSON.",
             temperature: 0.5,
             maxOutputTokens: 4096,
        };
        
        // FIX: Ensuring thinking budget is correctly applied to supported models.
        if (engine === 'gemini-3-flash-preview') {
            config.thinkingConfig = { thinkingBudget: 256 };
        }
        
         const response = await client.models.generateContent({
            model: engine,
            contents: prompt,
            config: config
        });
        const usageMetadata = response.usageMetadata;
        const usage: TokenUsage = {
            promptTokens: usageMetadata?.promptTokenCount ?? 0,
            candidateTokens: usageMetadata?.candidatesTokenCount ?? 0,
            totalTokens: usageMetadata?.totalTokenCount ?? 0,
        };
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
        const sources: Source[] = groundingChunks.map(chunk => ({
            uri: chunk.web?.uri ?? '',
            title: chunk.web?.title ?? 'Fuente sin título'
        })).filter(s => s.uri);
        
        // FIX: Using property access .text.
        const analysisContent = cleanAndParseJson<AnalysisContent>(response.text, 'getAssetAnalysis');

        return { data: { content: analysisContent, sources }, usage };
    } catch (error) {
        throw handleGeminiError(error, `No se pudo generar el análisis para "${vector}".`, engine);
    }
}

export async function getGlobalAnalysis(asset: Asset, existingAnalyses: string, engine: string): Promise<GeminiResponse<{ content: AnalysisContent; sources: Source[] }>> {
    const prompt = `**Tarea Crítica**: Tu única función es actuar como un API que devuelve JSON. No debes escribir ninguna palabra explicativa, saludo, ni texto introductorio. Tu respuesta debe ser *exclusivamente* un objeto JSON válido.
**Contexto**: Como Director de Inversiones (CIO), tu tarea es formular una "Visión Global" y una tesis de inversión final para el activo "${asset.name}" (${asset.ticker}). Ya dispones de los siguientes análisis detallados:
---
${existingAnalyses || "Aún no se han generado análisis específicos."}
---
**Instrucciones**:
1.  **Síntesis Holística**: Utilizando la búsqueda web y basándote en la información de los análisis proporcionados, sintetiza toda la información en una visión consolidada.
2.  **Redacta la Visión Global**: En el campo \`fullText\`, escribe la visión completa.
3.  **Crea el Resumen Ejecutivo**: En el campo \`summary\`, redacta una conclusión ejecutiva muy breve (1-2 frases).
4.  **Calcula el Precio Límite de Compra**: Determina un precio de compra límite tácticamente bueno y ponlo en el campo numérico \`limitBuyPrice\`.
5.  **Evalúa un "Índice de Confianza Global"** en una escala de -10 (muy bajista) a +10 (muy alcista) y ponlo en el campo numérico \`sentiment\`.
**Respuesta (JSON Válido Solamente)**:`;

    try {
        const client = getClient();
        const config: any = {
             tools: [{googleSearch: {}}],
             systemInstruction: "Eres un Director de Inversiones (CIO) de élite. Devuelves exclusivamente JSON.",
             temperature: 0.6,
             maxOutputTokens: 4096,
        };
        
        // FIX: Updating thinking budget logic for Gemini 3 series.
        if (engine === 'gemini-3-flash-preview') {
            config.thinkingConfig = { thinkingBudget: 256 };
        }
        
        const response = await client.models.generateContent({
            model: engine,
            contents: prompt,
            config: config
        });
        const usageMetadata = response.usageMetadata;
        const usage: TokenUsage = {
            promptTokens: usageMetadata?.promptTokenCount ?? 0,
            candidateTokens: usageMetadata?.candidatesTokenCount ?? 0,
            totalTokens: usageMetadata?.totalTokenCount ?? 0,
        };
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
        const sources: Source[] = groundingChunks.map(chunk => ({
            uri: chunk.web?.uri ?? '',
            title: chunk.web?.title ?? 'Fuente sin título'
        })).filter(s => s.uri);
        
        // FIX: Property access .text.
        const analysisContent = cleanAndParseJson<AnalysisContent>(response.text, 'getGlobalAnalysis');

        return { data: { content: analysisContent, sources }, usage };
    } catch (error) {
        throw handleGeminiError(error, 'No se pudo generar la Visión Global del activo.', engine);
    }
}

export async function askAboutAnalysis(
    assetName: string, 
    analysisContext: string, 
    question: string, 
    history: ChatMessage[],
    engine: string
): Promise<GeminiResponse<{ answerFound: boolean } & AiAnswer>> {
    const historyText = history.length > 0 
        ? history.map(m => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.text}`).join('\n')
        : "No hay mensajes anteriores.";

    const prompt = `**Tarea Crítica**: Tu única función es actuar como un API que devuelve JSON. Tu respuesta debe ser *exclusivamente* un objeto JSON válido.
**Contexto**: Eres un asistente de Q&A. Tu ÚNICA fuente de información es el contexto de análisis proporcionado para el activo "${assetName}" y el historial de la conversación.
--- CONTEXTO DE ANÁLISIS ---
${analysisContext || "No hay análisis."}
--- FIN CONTEXTO DE ANÁLISIS ---

**Nueva pregunta del usuario**: "${question}"
**Instrucciones**:
1. JSON: \`answerFound\` (bool), \`summary\` (resumen), \`fullText\` (detalle).
**Respuesta (JSON Válido Solamente)**:`;

    try {
        const client = getClient();
        const config: any = {
             systemInstruction: "Eres un asistente Q&A que se ciñe estrictamente al contexto y devuelve JSON.",
             temperature: 0.2,
             responseMimeType: "application/json",
             responseSchema: {
                type: Type.OBJECT,
                properties: {
                    answerFound: { type: Type.BOOLEAN },
                    summary: { type: Type.STRING },
                    fullText: { type: Type.STRING },
                },
                required: ["answerFound", "summary", "fullText"]
            }
        };
        
        if (engine === 'gemini-3-flash-preview') {
            config.thinkingConfig = { thinkingBudget: 0 }; 
        }
        
         const response = await client.models.generateContent({
            model: engine,
            contents: prompt,
            config: config
        });
        const usageMetadata = response.usageMetadata;
        const usage: TokenUsage = {
            promptTokens: usageMetadata?.promptTokenCount ?? 0,
            candidateTokens: usageMetadata?.candidatesTokenCount ?? 0,
            totalTokens: usageMetadata?.totalTokenCount ?? 0,
        };
        // FIX: Using property access .text.
        const answer = cleanAndParseJson<{ answerFound: boolean } & AiAnswer>(response.text, 'askAboutAnalysis');

        return { data: answer, usage };
    } catch (error) {
        throw handleGeminiError(error, `No se pudo procesar la pregunta.`, engine);
    }
}

export async function askWithWebSearch(
    assetName: string, 
    question: string, 
    history: ChatMessage[],
    engine: string
): Promise<GeminiResponse<AiAnswer>> {
    const historyText = history.length > 0
        ? history.map(m => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.text}`).join('\n')
        : "No hay mensajes anteriores.";

    const prompt = `**Tarea Crítica**: API JSON. Búsqueda web para "${assetName}".
**Pregunta**: "${question}"
**Instrucciones**:
1. JSON: \`summary\` (1-2 frases), \`fullText\` (detalle).`;

    try {
        const client = getClient();
        const config: any = {
             tools: [{googleSearch: {}}],
             systemInstruction: "Asistente de investigación web. Devuelve JSON.",
             temperature: 0.4,
        };

        if (engine === 'gemini-3-flash-preview') {
            config.thinkingConfig = { thinkingBudget: 128 };
        }

        const response = await client.models.generateContent({
            model: engine,
            contents: prompt,
            config: config
        });
        const usageMetadata = response.usageMetadata;
        const usage: TokenUsage = {
            promptTokens: usageMetadata?.promptTokenCount ?? 0,
            candidateTokens: usageMetadata?.candidatesTokenCount ?? 0,
            totalTokens: usageMetadata?.totalTokenCount ?? 0,
        };

        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
        const sources: Source[] = groundingChunks.map(chunk => ({
            uri: chunk.web?.uri ?? '',
            title: chunk.web?.title ?? 'Fuente sin título'
        })).filter(s => s.uri);

        // FIX: Using property access .text.
        const answer = cleanAndParseJson<Omit<AiAnswer, 'sources'>>(response.text.trim(), 'askWithWebSearch');

        return { data: { ...answer, sources }, usage };
    } catch (error) {
        throw handleGeminiError(error, `No se pudo procesar la pregunta con búsqueda web.`, engine);
    }
}

export async function getAlternativeAssets(asset: Asset, engine: string, currency: Currency): Promise<GeminiResponse<Asset[] | null>> {
    const prompt = `**Tarea Crítica**: API JSON.
**Contexto**: Alternativas para '${asset.name}' (${asset.ticker}).
**Instrucciones**:
1. Encuentra 4 competidores. Precio en **${currency.toUpperCase()}**.
2. JSON: lista 'alternatives' con 'name', 'ticker', 'currentPrice' (number), 'change' (number).`;

    try {
        const client = getClient();
        const config: any = {
            tools: [{googleSearch: {}}],
            temperature: 0.1,
        };

        const response = await client.models.generateContent({
            model: engine,
            contents: prompt,
            config: config,
        });
        
        const usageMetadata = response.usageMetadata;
        const usage: TokenUsage = {
            promptTokens: usageMetadata?.promptTokenCount ?? 0,
            candidateTokens: usageMetadata?.candidatesTokenCount ?? 0,
            totalTokens: usageMetadata?.totalTokenCount ?? 0,
        };
        // FIX: Using property access .text.
        const result = cleanAndParseJson<{alternatives: any[]}>(response.text, 'getAlternativeAssets');

        if (result && result.alternatives) {
             const alternativesWithType = result.alternatives.map((alt: any) => ({
                 name: alt.name, ticker: alt.ticker, type: asset.type, description: '',
                 currentPrice: typeof alt.currentPrice === 'number' ? alt.currentPrice : undefined,
                 change: typeof alt.change === 'number' ? alt.change : undefined
             }));
            return { data: alternativesWithType, usage };
        }
        return { data: null, usage };

    } catch (error) {
        throw handleGeminiError(error, "No se pudieron obtener activos alternativos.", engine);
    }
}

async function _getAssetPrice(
    asset: Asset,
    date: string,
    engine: string,
    currency: Currency,
    type: 'historical' | 'future',
    currentPriceForAnomalyCheck: number | null
): Promise<GeminiResponse<{ price: number | null; currency: string } | null>> {

    let prompt: string;
    let systemInstruction: string;
    let functionName: string;
    
    switch (type) {
        case 'historical':
            functionName = 'getAssetPriceOnDate';
            systemInstruction = "API de precios históricos. JSON: 'price' y 'currency'.";
            prompt = `**Tarea Crítica**: API JSON precio histórico para "${asset.name}" (${asset.ticker}) al ${date}.
**Instrucciones de Formato**: JSON: 'price' (número/null), 'currency' (**OBLIGATORIAMENTE "${currency.toUpperCase()}"**).`;
            break;

        case 'future':
            functionName = 'getAssetFuturePricePrediction';
            systemInstruction = "API de predicción. JSON: 'price' y 'currency'.";
            prompt = `**Tarea Crítica**: Predicción de precio futuro para "${asset.name}" (${asset.ticker}) al ${date}.
**Instrucciones**: JSON: 'price' (número), 'currency' (**OBLIGATORIAMENTE "${currency.toUpperCase()}"**).`;
            break;
    }

    try {
        const client = getClient();
        const response = await client.models.generateContent({
            model: engine,
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                systemInstruction,
                temperature: type === 'future' ? 0.4 : 0,
            }
        });

        const usageMetadata = response.usageMetadata;
        const usage: TokenUsage = {
            promptTokens: usageMetadata?.promptTokenCount ?? 0,
            candidateTokens: usageMetadata?.candidatesTokenCount ?? 0,
            totalTokens: usageMetadata?.totalTokenCount ?? 0,
        };
        // FIX: Using property access .text.
        const text = response.text.trim();
        if (!text) throw new Error("La API no devolvió un precio.");

        const priceData = cleanAndParseJson<{ price: number | null; currency: string }>(text, functionName);

        if (priceData && (typeof priceData.price === 'number' || priceData.price === null) && typeof priceData.currency === 'string') {
            if (type === 'historical' && priceData.price && currentPriceForAnomalyCheck && currentPriceForAnomalyCheck > 1) {
                const historicalPrice = priceData.price;
                const ratio = historicalPrice / currentPriceForAnomalyCheck;
                if (ratio > 20 || ratio < 0.05) {
                    throw new AnomalousPriceError(
                        `Precio histórico (${historicalPrice} ${currency}) anómalo.`,
                        historicalPrice
                    );
                }
            }
            return { data: priceData, usage };
        } else {
            throw new Error("Formato de precio no válido.");
        }
    } catch (error) {
        if (error instanceof AnomalousPriceError) throw error;
        throw handleGeminiError(error, `Error obteniendo precio ${type}.`, engine);
    }
}

export async function getAssetQuote(asset: Asset, engine: string, currency: Currency): Promise<GeminiResponse<{ price: number; changeValue: number; changePercentage: number; currency: string } | null>> {
    const prompt = `**Tarea Crítica**: API JSON cotización actual para "${asset.name}" (${asset.ticker}).
**Instrucciones**: JSON: 'price' (número), 'changeValue' (número), 'changePercentage' (número), 'currency' (**OBLIGATORIAMENTE "${currency.toUpperCase()}"**).`;

    try {
        const client = getClient();
        const response = await client.models.generateContent({
            model: engine,
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                systemInstruction: "API de cotizaciones. JSON estricto.",
                temperature: 0,
            }
        });
        const usageMetadata = response.usageMetadata;
        const usage: TokenUsage = {
            promptTokens: usageMetadata?.promptTokenCount ?? 0,
            candidateTokens: usageMetadata?.candidatesTokenCount ?? 0,
            totalTokens: usageMetadata?.totalTokenCount ?? 0,
        };
        // FIX: Using property access .text.
        const text = response.text.trim();
        if (!text) throw new Error("La API no devolvió una cotización.");

        const quoteData = cleanAndParseJson<{ price: number; changeValue: number; changePercentage: number; currency: string }>(text, 'getAssetQuote');
        
        if (quoteData && typeof quoteData.price === 'number') {
            return { data: quoteData, usage };
        } else {
             throw new Error("Datos de cotización incompletos.");
        }
    } catch (error) {
        throw handleGeminiError(error, "No se pudo obtener la cotización del activo.", engine);
    }
}

export async function getAssetPriceOnDate(asset: Asset, date: string, engine: string, currentPrice: number | null, currency: Currency): Promise<GeminiResponse<{ price: number | null; currency: string } | null>> {
    return _getAssetPrice(asset, date, engine, currency, 'historical', currentPrice);
}

export async function getAssetFuturePricePrediction(asset: Asset, date: string, engine: string, currency: Currency): Promise<GeminiResponse<{ price: number; currency: string } | null>> {
    const result = await _getAssetPrice(asset, date, engine, currency, 'future', null);
    if (result.data && typeof result.data.price !== 'number') {
        throw new Error("Predicción no válida.");
    }
    return result as GeminiResponse<{ price: number; currency: string } | null>;
}

export async function getLimitBuyPrice(asset: Asset, engine: string, currency: Currency): Promise<GeminiResponse<{ price: number } | null>> {
    const prompt = `**Tarea Crítica**: API JSON Precio Límite de Compra para "${asset.name}" (${asset.ticker}).
**Instrucciones**: JSON: 'price' (número en ${currency.toUpperCase()}).`;

    try {
        const client = getClient();
        const response = await client.models.generateContent({
            model: engine,
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                systemInstruction: "API de análisis técnico. JSON estricto.",
                temperature: 0.2,
            }
        });
        const usageMetadata = response.usageMetadata;
        const usage: TokenUsage = {
            promptTokens: usageMetadata?.promptTokenCount ?? 0,
            candidateTokens: usageMetadata?.candidatesTokenCount ?? 0,
            totalTokens: usageMetadata?.totalTokenCount ?? 0,
        };
        // FIX: Property access .text.
        const text = response.text.trim();
        if (!text) throw new Error("Sin respuesta.");

        const priceData = cleanAndParseJson<{ price: number }>(text, 'getLimitBuyPrice');
        
        if (priceData && typeof priceData.price === 'number') {
            return { data: priceData, usage };
        } else {
             throw new Error("Formato inválido.");
        }
    } catch (error) {
        throw handleGeminiError(error, "Error en precio límite.", engine);
    }
}

/**
 * Retrieves a list of available AI models for the user to choose from.
 */
export async function getAvailableTextModels(): Promise<string[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // FIX: Switched to recommended Gemini 3 series model aliases.
    return ['gemini-3-flash-preview', 'gemini-3-pro-preview'];
}

export async function analyzeMarketSector(sector: string, criteria: string, engine: string, currency: Currency): Promise<GeminiResponse<MarketAnalysisResult>> {
    const prompt = `**Tarea Crítica**: API JSON análisis sector "${sector}" por "${criteria}".
**Instrucciones**:
1. JSON: \`title\` (string), \`assets\` (lista con name, ticker, marketCap, sentiment, peRatio, eps, dividendYield), y \`sectorAverage\`.
2. Métricas en **${currency.toUpperCase()}**.`;

    try {
        const client = getClient();
        const response = await client.models.generateContent({
            model: engine,
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                temperature: 0.2,
            },
        });
        
        const usageMetadata = response.usageMetadata;
        const usage: TokenUsage = {
            promptTokens: usageMetadata?.promptTokenCount ?? 0,
            candidateTokens: usageMetadata?.candidatesTokenCount ?? 0,
            totalTokens: usageMetadata?.totalTokenCount ?? 0,
        };
        // FIX: Using property access .text.
        const result = cleanAndParseJson<MarketAnalysisResult>(response.text, 'analyzeMarketSector');

        const parseNumeric = (value: any): number => {
            if (typeof value === 'number') return value;
            if (typeof value === 'string') {
                const numericString = value.match(/-?[\d.]+/);
                return numericString ? parseFloat(numericString[0]) : 0;
            }
            return 0;
        };

        const sanitizedResult: MarketAnalysisResult = {
            ...result,
            assets: (result.assets || []).map(asset => ({
                ...asset,
                peRatio: parseNumeric(asset.peRatio),
                eps: parseNumeric(asset.eps),
                dividendYield: parseNumeric(asset.dividendYield),
            })),
            sectorAverage: result.sectorAverage ? {
                ...result.sectorAverage,
                averagePeRatio: parseNumeric(result.sectorAverage.averagePeRatio),
                averageEps: parseNumeric(result.sectorAverage.averageEps),
                averageDividendYield: parseNumeric(result.sectorAverage.averageDividendYield),
            } : { marketCap: '0', averagePeRatio: 0, averageEps: 0, averageDividendYield: 0 },
        };

        return { data: sanitizedResult, usage };

    } catch (error) {
        throw handleGeminiError(error, "No se pudo generar el análisis de mercado.", engine);
    }
}
