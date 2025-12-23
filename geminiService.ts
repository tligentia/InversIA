
import { GoogleGenAI, Type } from "@google/genai";
import { Asset, Source, AnalysisContent, QuotaExceededError, AiAnswer, ChatMessage, AnomalousPriceError, MarketAnalysisResult, Currency, ApiKeyNotSetError } from '../types';

let ai: GoogleGenAI | null = null;

// FIX: Initializing Gemini should ideally follow the guidelines of using process.env.API_KEY directly.
// This function is retained to support the application's existing architecture for dynamic key assignment.
export function initializeGemini(apiKey: string | null) {
    if (apiKey) {
        ai = new GoogleGenAI({ apiKey });
    } else {
        ai = null;
    }
}

function getClient(): GoogleGenAI {
    if (!ai) {
        throw new ApiKeyNotSetError("La clave API de Gemini no ha sido configurada. Por favor, configúrala en la sección de Ajustes.");
    }
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

    // FIX: Using explicit narrowing and type casting for ApiKeyNotSetError to safely access 'message' and return as Error.
    if (error instanceof ApiKeyNotSetError) {
        const apiKeyError = error as ApiKeyNotSetError;
        apiKeyError.message += debugInfo;
        return apiKeyError;
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
            return new Error(`La clave API de Gemini proporcionada no es válida o no tiene los permisos necesarios. Por favor, revísala en la sección de Ajustes. Puedes obtener una nueva clave en Google AI Studio.` + debugInfo);
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
        const result = cleanAndParseJson<{ assets: Asset[] }>(response.text.trim(), 'getAssetInfo');
        return { data: result.assets ?? [], usage };

    } catch (error) {
        throw handleGeminiError(error, "No se pudo conectar con el servicio de IA para buscar activos.", engine);
    }
}

export async function getAnalysisVectorsForAsset(asset: Asset, engine: string): Promise<GeminiResponse<string[] | null>> {
    let prompt: string;
    if (asset.type === 'stock') {
        prompt = `Como analista estratégico senior, genera una lista de 8 vectores de análisis clave para la acción "${asset.name}" (${asset.ticker}). Incluye obligatoriamente: "Análisis Socioeconómico Global", "Sentimiento de los Mercados", "Ranking respecto a sus competidores", "Reparto de dividendos", "Opinión de los expertos" y "Análisis del sector".`;
    } else { 
        prompt = `Como analista estratégico senior, para el criptoactivo "${asset.name}" (${asset.ticker}), sugiere una lista de 8 vectores clave. Incluye: "Análisis Socioeconómico Global", "Sentimiento de los Mercados", "Ranking respecto a sus competidores", "Opinión de los expertos", "Análisis del sector" y "Análisis de Recompensas y Staking" (si aplica).`;
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
        const result = cleanAndParseJson<{ vectors: string[] }>(response.text.trim(), 'getAnalysisVectorsForAsset');
        return { data: result.vectors || null, usage };

    } catch (error) {
        throw handleGeminiError(error, "No se pudieron obtener los vectores de análisis para este activo.", engine);
    }
}

export async function getAssetAnalysis(asset: Asset, vector: string, engine: string): Promise<GeminiResponse<{ content: AnalysisContent; sources: Source[] }>> {
    const prompt = `**Tarea Crítica**: Actúa como API JSON.
**Contexto**: Análisis estratégico sobre "${vector}" para "${asset.name}" (${asset.ticker}).
**Instrucciones**:
1. Busca información actualizada.
2. Redacta análisis detallado en \`fullText\`.
3. Resumen conciso en \`summary\`.
4. Evalúa sentimiento (-10 a +10) en \`sentiment\`.
5. Si aplica, calcula Precio Límite de Compra Táctico en \`limitBuyPrice\` (número) y especifica la moneda en \`currency\` (ej: 'USD', 'EUR').
6. Formato JSON estricto.`;

    try {
        const client = getClient();
        const config: any = {
             tools: [{googleSearch: {}}],
             systemInstruction: "Analista financiero experto. Salida JSON estricta.",
             temperature: 0.5,
             maxOutputTokens: 4096,
        };
        
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
        
        const analysisContent = cleanAndParseJson<AnalysisContent>(response.text, 'getAssetAnalysis');

        return { data: { content: analysisContent, sources }, usage };
    } catch (error) {
        throw handleGeminiError(error, `No se pudo generar el análisis para "${vector}".`, engine);
    }
}

export async function getGlobalAnalysis(asset: Asset, existingAnalyses: string, engine: string): Promise<GeminiResponse<{ content: AnalysisContent; sources: Source[] }>> {
    const prompt = `**Tarea Crítica**: Actúa como API JSON.
**Contexto**: CIO formulando Tesis de Inversión Global para "${asset.name}" (${asset.ticker}).
**Input**:
${existingAnalyses}
**Instrucciones**:
1. Sintetiza información y busca contexto de mercado actual.
2. \`fullText\`: Visión global, riesgos y veredicto.
3. \`summary\`: Resumen ejecutivo (1-2 frases).
4. \`limitBuyPrice\`: Precio límite de compra técnico (número).
5. \`currency\`: Moneda del precio límite (ej: 'USD', 'EUR').
6. \`sentiment\`: Confianza global (-10 a +10).
7. Formato JSON estricto.`;

    try {
        const client = getClient();
        const config: any = {
             tools: [{googleSearch: {}}],
             systemInstruction: "CIO experto. Salida JSON estricta.",
             temperature: 0.6,
             maxOutputTokens: 4096,
        };
        
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

    const prompt = `**Tarea Crítica**: Actúa como API JSON.
**Contexto**: Q&A sobre "${assetName}" basado en contexto proporcionado.
**Contexto Análisis**:
${analysisContext}
**Historial**:
${historyText}
**Pregunta**: "${question}"
**Instrucciones**:
1. Busca respuesta SOLO en contexto/historial.
2. JSON: \`answerFound\` (bool), \`summary\` (1 frase), \`fullText\` (detalle).
3. Si no encuentras, summary: "No encontrado en contexto actual...".`;

    try {
        const client = getClient();
        const config: any = {
             systemInstruction: "Asistente Q&A estricto con el contexto. Salida JSON.",
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

    const prompt = `**Tarea Crítica**: Actúa como API JSON.
**Contexto**: Investigador financiero para "${assetName}".
**Historial**:
${historyText}
**Pregunta**: "${question}"
**Instrucciones**:
1. Usa búsqueda web.
2. JSON: \`summary\` (1-2 frases), \`fullText\` (detalle).`;

    try {
        const client = getClient();
        const config: any = {
             tools: [{googleSearch: {}}],
             systemInstruction: "Investigador financiero web. Salida JSON.",
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

        const answer = cleanAndParseJson<Omit<AiAnswer, 'sources'>>(response.text.trim(), 'askWithWebSearch');

        return { data: { ...answer, sources }, usage };
    } catch (error) {
        throw handleGeminiError(error, `No se pudo procesar la pregunta con búsqueda web.`, engine);
    }
}

export async function getAlternativeAssets(asset: Asset, engine: string, currency: Currency): Promise<GeminiResponse<Asset[] | null>> {
    const prompt = `**Tarea Crítica**: Actúa como API JSON.
**Contexto**: Buscar 4 alternativas a "${asset.name}" (${asset.ticker}) tipo '${asset.type}'.
**Instrucciones**:
1. Identifica nicho.
2. Encuentra 4 competidores.
3. Obtén precio actual (**OBLIGATORIO en ${currency.toUpperCase()}**) y cambio 24h.
4. JSON: lista 'alternatives' con 'name', 'ticker', 'currentPrice' (number), 'change' (number).`;

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
    
    const instructions = type === 'historical' 
        ? "Prioridad: Fecha Exacta > Día hábil anterior > IPO." 
        : "Analiza expertos y tendencias para predecir.";

    prompt = `**Tarea Crítica**: API JSON de precios ${type === 'historical' ? 'históricos' : 'futuros'}.
**Activo**: "${asset.name}" (${asset.ticker})
**Fecha**: ${date}
**Instrucciones**:
1. ${instructions}
2. Devuelve JSON: 'price' (number/null), 'currency' (**OBLIGATORIO "${currency.toUpperCase()}"**).`;

    functionName = type === 'historical' ? 'getAssetPriceOnDate' : 'getAssetFuturePricePrediction';
    systemInstruction = `API de precios ${type === 'historical' ? 'históricos' : 'futuros'}. Salida JSON.`;

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
        const text = response.text.trim();
        if (!text) throw new Error("La API no devolvió un precio.");

        const priceData = cleanAndParseJson<{ price: number | null; currency: string }>(text, functionName);

        if (priceData && (typeof priceData.price === 'number' || priceData.price === null) && typeof priceData.currency === 'string') {
            if (type === 'historical' && priceData.price && currentPriceForAnomalyCheck && currentPriceForAnomalyCheck > 1) {
                const historicalPrice = priceData.price;
                const ratio = historicalPrice / currentPriceForAnomalyCheck;
                if (ratio > 20 || ratio < 0.05) {
                    throw new AnomalousPriceError(
                        `Precio histórico (${historicalPrice} ${priceData.currency}) anómalo vs actual (${currentPriceForAnomalyCheck}). Posible split/contrasplit.`,
                        historicalPrice
                    );
                }
            }
            return { data: priceData, usage };
        } else {
            throw new Error("Formato de precio inválido.");
        }
    } catch (error) {
        if (error instanceof AnomalousPriceError) throw error;
        throw handleGeminiError(error, `Error obteniendo precio ${type} para ${date}.`, engine);
    }
}

export async function getAssetQuote(asset: Asset, engine: string, currency: Currency): Promise<GeminiResponse<{ price: number; changeValue: number; changePercentage: number; currency: string } | null>> {
    const prompt = `**Tarea Crítica**: Actúa como API JSON.
**Activo**: "${asset.name}" (${asset.ticker})
**Tiempo**: ${new Date().toISOString()}
**Instrucciones**:
1. Busca cotización MÁS RECIENTE.
2. JSON: 'price' (number), 'changeValue' (number), 'changePercentage' (number), 'currency' (**OBLIGATORIO "${currency.toUpperCase()}"**).`;

    try {
        const client = getClient();
        const response = await client.models.generateContent({
            model: engine,
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                systemInstruction: "API cotizaciones tiempo real. JSON estricto.",
                temperature: 0,
            }
        });
        const usageMetadata = response.usageMetadata;
        const usage: TokenUsage = {
            promptTokens: usageMetadata?.promptTokenCount ?? 0,
            candidateTokens: usageMetadata?.candidatesTokenCount ?? 0,
            totalTokens: usageMetadata?.totalTokenCount ?? 0,
        };
        const quoteData = cleanAndParseJson<{ price: number; changeValue: number; changePercentage: number; currency: string }>(response.text.trim(), 'getAssetQuote');
        
        if (quoteData && typeof quoteData.price === 'number') {
            return { data: quoteData, usage };
        } else {
             throw new Error("Datos de cotización incompletos.");
        }
    } catch (error) {
        throw handleGeminiError(error, "No se pudo obtener la cotización.", engine);
    }
}

export async function getAssetPriceOnDate(asset: Asset, date: string, engine: string, currentPrice: number | null, currency: Currency): Promise<GeminiResponse<{ price: number | null; currency: string } | null>> {
    return _getAssetPrice(asset, date, engine, currency, 'historical', currentPrice);
}

export async function getAssetFuturePricePrediction(asset: Asset, date: string, engine: string, currency: Currency): Promise<GeminiResponse<{ price: number; currency: string } | null>> {
    const result = await _getAssetPrice(asset, date, engine, currency, 'future', null);
    if (result.data && typeof result.data.price !== 'number') {
        throw new Error("Predicción de precio inválida.");
    }
    return result as GeminiResponse<{ price: number; currency: string } | null>;
}

export async function getLimitBuyPrice(asset: Asset, engine: string, currency: Currency): Promise<GeminiResponse<{ price: number } | null>> {
    const prompt = `**Tarea Crítica**: API JSON Análisis Técnico.
**Contexto**: Calcular "Precio Límite de Compra" para "${asset.name}" (${asset.ticker}).
**Instrucciones**:
1. Analiza gráfico/soportes recientes.
2. Determina precio entrada táctico.
3. JSON: 'price' (number en ${currency.toUpperCase()}).`;

    try {
        const client = getClient();
        const response = await client.models.generateContent({
            model: engine,
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                systemInstruction: "API análisis técnico. JSON estricto.",
                temperature: 0.2,
            }
        });
        const usageMetadata = response.usageMetadata;
        const usage: TokenUsage = {
            promptTokens: usageMetadata?.promptTokenCount ?? 0,
            candidateTokens: usageMetadata?.candidatesTokenCount ?? 0,
            totalTokens: usageMetadata?.totalTokenCount ?? 0,
        };
        const priceData = cleanAndParseJson<{ price: number }>(response.text.trim(), 'getLimitBuyPrice');
        
        if (priceData && typeof priceData.price === 'number') {
            return { data: priceData, usage };
        } else {
             throw new Error("Precio límite inválido.");
        }
    } catch (error) {
        throw handleGeminiError(error, "Error calculando precio límite.", engine);
    }
}

export async function getAvailableTextModels(): Promise<string[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    // Updated list to use recommended Gemini 3 series models
    return ['gemini-3-flash-preview', 'gemini-3-pro-preview'];
}

export async function analyzeMarketSector(sector: string, criteria: string, engine: string, currency: Currency): Promise<GeminiResponse<MarketAnalysisResult>> {
    const prompt = `**Tarea Crítica**: API JSON Análisis Mercado.
**Sector**: "${sector}". **Criterio**: "${criteria}".
**Instrucciones**:
1. \`title\`: Título descriptivo.
2. \`assets\`: 5-8 activos. Métricas en **${currency.toUpperCase()}**.
    - name, ticker, marketCap, sentiment, peRatio, eps, dividendYield.
3. \`sectorAverage\`: Promedios ponderados en **${currency.toUpperCase()}**.
4. JSON estricto con keys 'title', 'assets', 'sectorAverage'.`;

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
