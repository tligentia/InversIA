import { GoogleGenAI, Type } from "@google/genai";
import { Asset, Source, AnalysisContent, QuotaExceededError, AiAnswer, ChatMessage, AnomalousPriceError, MarketAnalysisResult, Currency, ApiKeyNotSetError } from '../types';

let ai: GoogleGenAI | null = null;

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
        // Find the first line in the stack trace that is not from the geminiService file itself.
        // This points to where the gemini service function was *called* from.
        const callerLine = stackLines.find(line => line.includes('at ') && !line.includes('geminiService.ts'));
        
        if (callerLine) {
            // Clean up the line for display. E.g., "at handleSearch (http://.../App.tsx:210:48)" -> "(Error en handleSearch en App.tsx:210)"
            const match = callerLine.match(/at\s+([^\s(]+)\s+\(?(?:[^\/]+\/)*([^\/)]+:\d+):\d+\)?/);
            if (match && match[1] && match[2]) {
                 debugInfo = `\n(Error en ${match[1]} en ${match[2]})`;
            } else {
                // Fallback for anonymous functions or different formats like "at http://.../App.tsx:210:48"
                const simpleMatch = callerLine.match(/\((?:[^\/]+\/)*([^\/)]+:\d+:\d+)\)/);
                if (simpleMatch && simpleMatch[1]) {
                    debugInfo = `\n(Error en ${simpleMatch[1]})`;
                } else {
                     debugInfo = `\n(Detalles: ${callerLine.trim()})`;
                }
            }
        }
    }


    // Handle our custom, pre-emptive error for missing API key
    if (error instanceof ApiKeyNotSetError) {
        error.message += debugInfo;
        return error;
    }

    // Handle network errors (e.g., offline)
    if (error instanceof TypeError && error.message.includes('fetch')) {
        return new Error("Error de red. Por favor, comprueba tu conexión a internet e inténtalo de nuevo." + debugInfo);
    }

    // Handle specific error classes we've defined
    if (error instanceof AnomalousPriceError) {
        error.message += debugInfo;
        return error;
    }

    if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();

        // Check for common, critical error messages from the API/SDK
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
        
        // Return a cleaner version of the original error if it's somewhat understandable
        if (!errorMessage.includes('json') && !errorMessage.includes('internal')) {
             return new Error(`La API ha devuelto un error: ${error.message}` + debugInfo);
        }
    }

    // Fallback for unexpected or generic errors
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
                        // We are inside a string. Check if it's a delimiter.
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
                            // This is an unescaped quote inside a string. Escape it.
                            repairedString += '\\"';
                        }
                    } else {
                        // We are outside a string. This is an opening quote.
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
    // Trim whitespace and remove markdown fences.
    let jsonText = text.trim().replace(/^```json\s*/, '').replace(/```$/, '').trim();

    // If after stripping markdown, it doesn't look like JSON, try to find the JSON object within the text.
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
    const prompt = `Un usuario ha introducido la siguiente consulta para identificar un activo financiero: "${query}". Tu tarea como analista experto es identificar todas las posibles coincidencias relevantes a nivel mundial. Para cada activo, proporciona su nombre, ticker, tipo ('stock' o 'crypto'), una breve descripción y, crucialmente, la URL directa a su página principal en la versión en español de Investing.com (debe empezar con https://es.investing.com/...). Esta URL es muy importante; asegúrate de que apunte a la página específica del activo (por ejemplo, /equities/banco-santander), no a una página de búsqueda. Si no encuentras una URL directa, déjala como una cadena vacía.`;

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
                            description: "Lista de posibles activos coincidentes.",
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    ticker: { type: Type.STRING },
                                    type: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    investingUrl: { type: Type.STRING, description: "La URL directa a la página principal del activo en es.investing.com. Por ejemplo: https://es.investing.com/equities/apple-computer-inc" }
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
        prompt = `Como analista estratégico senior, genera una lista de 8 vectores de análisis clave para la acción "${asset.name}" (${asset.ticker}). La lista debe ser variada, cubriendo aspectos fundamentales, técnicos, de mercado y macroeconómicos. Incluye obligatoriamente en la lista "Análisis Socioeconómico Global", "Sentimiento de los Mercados", "Ranking respecto a sus competidores", "Reparto de dividendos", "Opinión de los expertos" y "Análisis del sector". Otros ejemplos podrían ser "Análisis DAFO", "Salud Financiera", "Innovación" o "Riesgos Clave".`;
    } else { 
        prompt = `Como analista estratégico senior, para el activo de tipo crypto "${asset.name}" (${asset.ticker}), sugiere una lista de 8 vectores de análisis clave adaptados a su naturaleza. Incluye obligatoriamente en la lista "Análisis Socioeconómico Global", "Sentimiento de los Mercados", "Ranking respecto a sus competidores", "Opinión de los expertos" y "Análisis del sector". Si el activo ofrece recompensas (staking, etc.), incluye "Análisis de Recompensas y Staking". Otros ejemplos podrían ser "Tecnología y Casos de Uso", "Tokenomics", "Comunidad y Adopción" o "Análisis On-Chain".`;
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
5.  **Calcula el Precio Límite de Compra**: Si este vector está relacionado con análisis técnico, valoración o puntos de entrada (p.ej., 'Análisis Técnico', 'Opinión de expertos'), calcula un precio de compra límite tácticamente bueno basado en la información. Ponlo en el campo numérico \`limitBuyPrice\`. Si el vector no es relevante para un precio de entrada, omite este campo.
6.  Formatea la salida como un objeto JSON con las claves 'sentiment' (number), 'summary' (string), 'fullText' (string) y opcionalmente 'limitBuyPrice' (number).
7.  **IMPORTANTE**: Asegúrate de que cualquier comilla doble (") dentro de los textos de 'summary' o 'fullText' esté debidamente escapada con una barra invertida (p. ej., \\"texto con comillas\\"). Además, cualquier salto de línea dentro de los campos de texto debe ser escapado como \\n.
**Respuesta (JSON Válido Solamente)**:`;

    try {
        const client = getClient();
        const config: any = {
             tools: [{googleSearch: {}}],
             systemInstruction: "Eres un analista estratégico y financiero de primer nivel. Tu objetivo es proporcionar análisis claros, basados en datos y fáciles de entender. Devuelves exclusivamente JSON.",
             temperature: 0.5,
             maxOutputTokens: 4096,
        };
        
        if (engine === 'gemini-2.5-flash') {
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
    const prompt = `**Tarea Crítica**: Tu única función es actuar como un API que devuelve JSON. No debes escribir ninguna palabra explicativa, saludo, ni texto introductorio. Tu respuesta debe ser *exclusivamente* un objeto JSON válido.
**Contexto**: Como Director de Inversiones (CIO), tu tarea es formular una "Visión Global" y una tesis de inversión final para el activo "${asset.name}" (${asset.ticker}). Ya dispones de los siguientes análisis detallados:
---
${existingAnalyses || "Aún no se han generado análisis específicos."}
---
**Instrucciones**:
1.  **Síntesis Holística**: Utilizando la búsqueda web para obtener el contexto de mercado más reciente Y basándote en la información de los análisis proporcionados, sintetiza toda la información en una visión consolidada.
2.  **Redacta la Visión Global**: En el campo \`fullText\`, escribe la visión completa. Estructúrala claramente con puntos clave sobre el potencial de crecimiento, los riesgos principales y un veredicto final (comprar, mantener, vender, observar). Utiliza viñetas (con el carácter '•') para mayor claridad.
3.  **Crea el Resumen Ejecutivo**: En el campo \`summary\`, redacta una conclusión ejecutiva muy breve (1-2 frases) que resuma tu tesis de inversión.
4.  **Calcula el Precio Límite de Compra**: Basado en análisis técnico (soportes, volatilidad), determina un precio de compra límite tácticamente bueno y ponlo en el campo numérico \`limitBuyPrice\`. Este valor es opcional; si no es posible calcularlo con confianza, omite el campo.
5.  **Evalúa un "Índice de Confianza Global"** en una escala de -10 (muy bajista) a +10 (muy alcista) y ponlo en el campo numérico \`sentiment\`.
6.  **Formato**: Tu respuesta debe ser un objeto JSON con las claves 'sentiment' (number), 'summary' (string), 'fullText' (string) y opcionalmente 'limitBuyPrice' (number).
7.  **IMPORTANTE**: Asegúrate de que cualquier comilla doble (") dentro de los textos de 'summary' o 'fullText' esté debidamente escapada con una barra invertida (p. ej., \\"texto con comillas\\"). Además, cualquier salto de línea dentro de los campos de texto debe ser escapado como \\n.
**Respuesta (JSON Válido Solamente)**:`;

    try {
        const client = getClient();
        const config: any = {
             tools: [{googleSearch: {}}],
             systemInstruction: "Eres un Director de Inversiones (CIO) de élite, especializado en sintetizar análisis complejos en una tesis de inversión final, clara y accionable. Devuelves exclusivamente JSON.",
             temperature: 0.6,
             maxOutputTokens: 4096,
        };
        
        if (engine === 'gemini-2.5-flash') {
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

    const prompt = `**Tarea Crítica**: Tu única función es actuar como un API que devuelve JSON. No debes escribir ninguna palabra explicativa. Tu respuesta debe ser *exclusivamente* un objeto JSON válido.
**Contexto**: Eres un asistente de Q&A. Tu ÚNICA fuente de información es el contexto de análisis proporcionado para el activo "${assetName}" y el historial de la conversación. No uses conocimientos externos ni busques en la web.
--- CONTEXTO DE ANÁLISIS ---
${analysisContext || "No hay análisis."}
--- FIN CONTEXTO DE ANÁLISIS ---

--- HISTORIAL DE CONVERSACIÓN ---
${historyText}
--- FIN HISTORIAL DE CONVERSACIÓN ---

**Nueva pregunta del usuario**: "${question}"
**Instrucciones**:
1.  Busca la respuesta a la nueva pregunta ESTRICTAMENTE dentro del CONTEXTO y el HISTORIAL.
2.  Si encuentras la respuesta:
    -   Establece \`answerFound\` en \`true\`.
    -   En \`summary\`, escribe un resumen muy conciso de 1 frase de la respuesta.
    -   En \`fullText\`, escribe la respuesta completa y detallada.
3.  Si NO encuentras la respuesta en el contexto:
    -   Establece \`answerFound\` en \`false\`.
    -   En \`summary\`, escribe: "La respuesta no se encontró en los análisis actuales. ¿Quieres realizar una búsqueda más amplia en la web?".
    -   Deja \`fullText\` como una cadena vacía.
**Respuesta (JSON Válido Solamente)**:`;

    try {
        const client = getClient();
        const config: any = {
             systemInstruction: "Eres un asistente Q&A que se ciñe estrictamente al contexto proporcionado y devuelve JSON.",
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
        
        if (engine === 'gemini-2.5-flash') {
            config.thinkingConfig = { thinkingBudget: 0 }; // Disable thinking for fast Q&A
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

    const prompt = `**Tarea Crítica**: Tu única función es actuar como un API que devuelve JSON. No debes escribir ninguna palabra explicativa. Tu respuesta debe ser *exclusivamente* un objeto JSON válido.
**Contexto**: Eres un asistente de investigación financiera. Responde a la pregunta sobre "${assetName}" usando la búsqueda web y teniendo en cuenta el historial de conversación.
--- HISTORIAL DE CONVERSACIÓN ---
${historyText}
--- FIN HISTORIAL DE CONVERSACIÓN ---
**Pregunta**: "${question}"
**Instrucciones**:
1.  Usa la búsqueda web para obtener la información más actualizada y relevante para la pregunta.
2.  En \`summary\`, escribe un resumen muy conciso de 1-2 frases de la respuesta.
3.  En \`fullText\`, escribe la respuesta completa, bien estructurada y detallada.
**Respuesta (JSON Válido Solamente)**:`;

    try {
        const client = getClient();
        const config: any = {
             tools: [{googleSearch: {}}],
             systemInstruction: "Eres un asistente de investigación financiera que utiliza la búsqueda web para dar respuestas actualizadas en formato JSON.",
             temperature: 0.4,
        };

        if (engine === 'gemini-2.5-flash') {
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
    const prompt = `**Tarea Crítica**: Tu única función es actuar como un API que devuelve JSON. No debes escribir ninguna palabra explicativa, saludo, ni texto introductorio. Tu respuesta debe ser *exclusivamente* un objeto JSON válido.
**Contexto**: El usuario está analizando el activo financiero '${asset.name}' (${asset.ticker}) de tipo '${asset.type}'.
**Instrucciones**:
1. Usa la búsqueda web para identificar el nicho o sector principal del activo.
2. Encuentra 4 activos alternativos (competidores directos o proyectos similares) dentro de ese mismo nicho.
3. Para cada alternativa, utiliza la búsqueda web para obtener su nombre completo, su ticker/símbolo, su precio actual **OBLIGATORIAMENTE en ${currency.toUpperCase()}**, y su cambio numérico en las últimas 24 horas (positivo si sube, negativo si baja).
4. Formatea la salida como un objeto JSON con una clave 'alternatives'. Esta clave debe contener una lista de objetos.
5. Cada objeto en la lista debe tener cuatro claves: 'name' (string), 'ticker' (string), 'currentPrice' (number), y 'change' (number). Si no encuentras el precio o el cambio, usa un valor de 0.
**Respuesta (JSON Válido Solamente)**:`;

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
    
    switch (type) {
        case 'historical':
            functionName = 'getAssetPriceOnDate';
            systemInstruction = "Eres un API de consulta de precios históricos. Tu única respuesta es un objeto JSON con el precio y la moneda.";
            prompt = `**Tarea Crítica**: Actúa como un API JSON. Tu única misión es encontrar un precio histórico de cierre para un activo y devolverlo en formato JSON.
**Activo**: "${asset.name}" (${asset.ticker})
**Fecha Objetivo**: ${date}
**Jerarquía de Búsqueda (Sigue este orden estricto)**:
1.  **Prioridad #1 - Fecha Exacta**: Busca el precio de cierre del activo en la **Fecha Objetivo** exacta.
2.  **Prioridad #2 - Búsqueda Hacia Atrás**: Si no encuentras datos para la Fecha Objetivo (fin de semana, festivo), busca hacia atrás día por día hasta que encuentres el **primer día hábil anterior** con datos.
3.  **Prioridad #3 - Precio de Salida a Bolsa (IPO)**: Si la fecha es anterior a la existencia del activo, encuentra el **precio de cierre del día de su salida a bolsa (IPO)**.
**Instrucción Clave sobre Persistencia**: Es CRUCIAL que seas persistente. Casi todos los activos que cotizan tienen datos históricos. Solo devuelve \`null\` como último recurso absoluto si no encuentras NINGÚN precio.
**Instrucciones de Formato de Respuesta**: Tu respuesta debe ser *exclusivamente* un objeto JSON válido con las claves: 'price' (un número, o \`null\') y 'currency' (un string, **OBLIGATORIAMENTE "${currency.toUpperCase()}"**).
**Respuesta (JSON Válido Solamente)**:`;
            break;

        case 'future':
            functionName = 'getAssetFuturePricePrediction';
            systemInstruction = "Eres un API de predicción de precios. Tu única respuesta es un objeto JSON con el precio predicho y la moneda.";
            prompt = `**Tarea Crítica**: Actúa como un API JSON que devuelve una predicción de precio para un activo en una fecha futura.
**Activo**: "${asset.name}" (${asset.ticker})
**Fecha Objetivo**: ${date} (una fecha en el futuro)
**Instrucciones**:
1. Usa la búsqueda web para recopilar análisis de expertos, pronósticos de mercado, informes financieros recientes y tendencias del sector para el activo.
2. Basado en este análisis, formula una predicción de precio **realista y justificada** para el activo en la Fecha Objetivo. No seas excesivamente optimista o pesimista; basa tu predicción en datos. Evita dar rangos, proporciona un único precio objetivo.
3. Tu respuesta debe ser *exclusivamente* un objeto JSON válido con las claves: 'price' (un número que es tu predicción de precio) y 'currency' (un string, **OBLIGATORIAMENTE "${currency.toUpperCase()}"**).
**Respuesta (JSON Válido Solamente)**:`;
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
        const text = response.text.trim();
        if (!text) throw new Error("La API no devolvió un precio.");

        const priceData = cleanAndParseJson<{ price: number | null; currency: string }>(text, functionName);

        if (priceData && (typeof priceData.price === 'number' || priceData.price === null) && typeof priceData.currency === 'string') {
            if (type === 'historical' && priceData.price && currentPriceForAnomalyCheck && currentPriceForAnomalyCheck > 1) {
                const historicalPrice = priceData.price;
                const ratio = historicalPrice / currentPriceForAnomalyCheck;
                if (ratio > 20 || ratio < 0.05) {
                    throw new AnomalousPriceError(
                        `El precio histórico (${historicalPrice.toFixed(2)} ${currency}) del ${date} parece anómalo comparado con el actual (${currentPriceForAnomalyCheck.toFixed(2)} ${currency}). Podría deberse a un split de acciones no considerado. Por favor, verifica el dato.`,
                        historicalPrice
                    );
                }
            }
            return { data: priceData, usage };
        } else {
            throw new Error("La API devolvió un formato de precio no válido.");
        }
    } catch (error) {
        if (error instanceof AnomalousPriceError) throw error;
        const errorMessage = type === 'historical' ? `No se pudo obtener el precio del activo para la fecha ${date}.` : "No se pudo obtener el precio del activo.";
        throw handleGeminiError(error, errorMessage, engine);
    }
}

export async function getAssetQuote(asset: Asset, engine: string, currency: Currency): Promise<GeminiResponse<{ price: number; changeValue: number; changePercentage: number; currency: string } | null>> {
    const prompt = `**Tarea Crítica**: Actúa como un API JSON. Tu única respuesta es un objeto JSON.
**Activo**: "${asset.name}" (${asset.ticker})
**Instrucciones**:
1. Usa la búsqueda web para encontrar la cotización de mercado más reciente del activo.
2. Tu respuesta debe ser *exclusivamente* un objeto JSON válido.
3. El JSON debe contener: 'price' (número), 'changeValue' (número, cambio numérico del día, p.ej. -1.25), 'changePercentage' (número, cambio porcentual del día, p.ej. -0.85 para -0.85%), y 'currency' (string, **OBLIGATORIAMENTE "${currency.toUpperCase()}"**).
**Respuesta (JSON Válido Solamente)**:`;

    try {
        const client = getClient();
        const response = await client.models.generateContent({
            model: engine,
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                systemInstruction: "Eres un API de consulta de precios. Tu única respuesta es un objeto JSON con la cotización completa.",
                temperature: 0,
            }
        });
        const usageMetadata = response.usageMetadata;
        const usage: TokenUsage = {
            promptTokens: usageMetadata?.promptTokenCount ?? 0,
            candidateTokens: usageMetadata?.candidatesTokenCount ?? 0,
            totalTokens: usageMetadata?.totalTokenCount ?? 0,
        };
        const text = response.text.trim();
        if (!text) throw new Error("La API no devolvió una cotización.");

        const quoteData = cleanAndParseJson<{ price: number; changeValue: number; changePercentage: number; currency: string }>(text, 'getAssetQuote');
        
        if (quoteData && typeof quoteData.price === 'number' && typeof quoteData.changeValue === 'number' && typeof quoteData.changePercentage === 'number') {
            return { data: quoteData, usage };
        } else {
             throw new Error("La API devolvió un formato de cotización no válido o incompleto.");
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
        throw new Error("La API no devolvió una predicción de precio válida.");
    }
    return result as GeminiResponse<{ price: number; currency: string } | null>;
}

export async function getLimitBuyPrice(asset: Asset, engine: string, currency: Currency): Promise<GeminiResponse<{ price: number } | null>> {
    const prompt = `**Tarea Crítica**: Actúa como un API JSON. Tu única respuesta es un objeto JSON.
**Contexto**: Eres un analista técnico de mercados financieros. Basándote en la situación actual del mercado para el activo "${asset.name}" (${asset.ticker}), debes calcular un "Precio Límite de Compra" recomendado.
**Instrucciones**:
1.  Usa la búsqueda web para analizar los gráficos de precios recientes, identificar niveles de soporte clave, y considerar la volatilidad actual.
2.  Determina un precio de entrada que consideres tácticamente bueno para una nueva compra, un punto en el que el activo podría tener un retroceso antes de continuar una posible tendencia alcista, o un nivel de soporte fuerte.
3.  Tu respuesta debe ser *exclusivamente* un objeto JSON válido con una única clave: 'price' (un número en ${currency.toUpperCase()}).
**Respuesta (JSON Válido Solamente)**:`;

    try {
        const client = getClient();
        const response = await client.models.generateContent({
            model: engine,
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                systemInstruction: "Eres un API de análisis técnico que devuelve un precio de compra recomendado en formato JSON.",
                temperature: 0.2,
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

        const priceData = cleanAndParseJson<{ price: number }>(text, 'getLimitBuyPrice');
        
        if (priceData && typeof priceData.price === 'number') {
            return { data: priceData, usage };
        } else {
             throw new Error("La API devolvió un formato de precio no válido.");
        }
    } catch (error) {
        throw handleGeminiError(error, "No se pudo calcular el precio límite de compra.", engine);
    }
}

/**
 * Retrieves a list of available AI models for the user to choose from.
 * This fulfills the user's request to select from different engines and
 * adjusts the application to use real model names, allowing for different
 * capabilities and performance characteristics.
 */
export async function getAvailableTextModels(): Promise<string[]> {
    // Simulate a network delay for fetching models
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Provide a selection of actual models for the user.
    // 'gemini-2.5-flash' for speed and efficiency.
    // 'gemini-2.5-pro' for higher quality analysis.
    return ['gemini-2.5-flash', 'gemini-2.5-pro'];
}

export async function analyzeMarketSector(sector: string, criteria: string, engine: string, currency: Currency): Promise<GeminiResponse<MarketAnalysisResult>> {
    const prompt = `**Tarea Crítica**: Tu única función es actuar como un API que devuelve JSON. No escribas ninguna palabra explicativa. Tu respuesta debe ser *exclusivamente* un objeto JSON válido.
**Contexto**: Eres un analista de mercados experto. Un usuario quiere un análisis del sector "${sector}" basado en el criterio: "${criteria}".
**Instrucciones**:
1.  **Genera un Título**: Crea un título descriptivo para el análisis en el campo \`title\`. Ejemplo: "Principales Empresas del Sector ${sector} por ${criteria}".
2.  **Identifica Activos**: Usando la búsqueda web, identifica entre 5 y 8 de los activos más relevantes del sector "${sector}" que cumplan con el criterio "${criteria}".
3.  **Recopila Métricas**: Para cada activo, obtén las siguientes métricas ACTUALIZADAS en la moneda ${currency.toUpperCase()}:
    *   \`name\`: (string) Nombre completo de la empresa.
    *   \`ticker\`: (string) Símbolo bursátil.
    *   \`marketCap\`: (string) Capitalización de mercado (ej. "3.59 Trillion ${currency.toUpperCase()}").
    *   \`sentiment\`: (string) Sentimiento general del mercado ('Bullish', 'Bearish', or 'Neutral').
    *   \`peRatio\`: (number) Ratio P/E (Price-to-Earnings).
    *   \`eps\`: (number) BPA (Beneficio Por Acción) o EPS (Earnings Per Share), un valor numérico en ${currency.toUpperCase()}.
    *   \`dividendYield\`: (number) Rendimiento del dividendo en porcentaje (ej. 0.45 para 0.45%).
4.  **Calcula Promedios del Sector**: Calcula los promedios ponderados por capitalización de mercado para el sector basados en los activos que encontraste:
    *   \`marketCap\`: (string) Suma total de la capitalización de mercado (en ${currency.toUpperCase()}).
    *   \`averagePeRatio\`: (number) P/E promedio.
    *   \`averageEps\`: (number) BPA promedio, un valor numérico en ${currency.toUpperCase()}.
    *   \`averageDividendYield\`: (number) Rendimiento de dividendo promedio.
5.  **Estructura JSON**: Devuelve un único objeto JSON con las claves: \`title\` (string), \`assets\` (una lista de objetos con las métricas de cada activo), y \`sectorAverage\` (un objeto con los promedios del sector).
**Respuesta (JSON Válido Solamente)**:`;

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