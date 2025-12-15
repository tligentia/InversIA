
export const VECTOR_DESCRIPTIONS: Record<string, string> = {
  "Análisis Socioeconómico Global": "Evalúa cómo factores macroeconómicos globales (tasas de interés, inflación, eventos geopolíticos) pueden impactar el rendimiento del activo.",
  "Sentimiento de los Mercados": "Mide el 'humor' general de los inversores (noticias, redes sociales) para prever movimientos a corto plazo, ya sea optimista (alcista) o pesimista (bajista).",
  "Ranking respecto a sus competidores": "Compara el activo con sus rivales directos en métricas clave (capitalización, crecimiento, cuota de mercado) para determinar su posición competitiva en el sector.",
  "Reparto de dividendos": "Analiza la política de dividendos de la empresa, su sostenibilidad y su historial de pagos para evaluar el retorno de la inversión para los accionistas.",
  "Opinión de los expertos": "Sintetiza las recomendaciones y precios objetivos de analistas financieros y casas de inversión para conocer la visión del consenso profesional.",
  "Análisis del sector": "Examina la salud general, tendencias, regulaciones y perspectivas de crecimiento del sector al que pertenece el activo para entender el contexto en el que opera.",
  "Análisis de Recompensas y Staking": "Evalúa el rendimiento, los riesgos y la mecánica de los programas de staking o recompensas del activo, clave para la generación de ingresos pasivos.",
  "Tecnología y Casos de Uso": "Investiga la solidez de la tecnología subyacente del criptoactivo, su escalabilidad y sus aplicaciones prácticas reales que podrían impulsar su adopción.",
  "Tokenomics": "Analiza la economía del token: su suministro total, cómo se distribuye, su utilidad dentro del ecosistema y los incentivos para poseerlo.",
  "Comunidad y Adopción": "Mide la fortaleza y el crecimiento de la comunidad de usuarios y desarrolladores, así como el nivel de adopción real del activo, indicadores clave de su éxito a largo plazo.",
  "Análisis On-Chain": "Examina los datos públicos de la blockchain, como el volumen de transacciones y las direcciones activas, para obtener información sobre la salud y la actividad de la red.",
  "Análisis DAFO": "Identifica las Debilidades, Amenazas, Fortalezas y Oportunidades del activo para ofrecer una visión estratégica completa de su situación actual y potencial futuro.",
  "Salud Financiera": "Revisa los estados financieros de la empresa (balances, ingresos) para evaluar su rentabilidad, solvencia y eficiencia operativa.",
  "Innovación": "Evalúa la capacidad de la empresa para innovar en productos, servicios o tecnología, un motor clave para el crecimiento sostenible y la ventaja competitiva.",
  "Riesgos Clave": "Identifica y analiza los principales riesgos operativos, de mercado, regulatorios o competitivos que podrían afectar negativamente al activo.",
};

export const TRUSTED_IP_PREFIXES: string[] = ['83.45.', '37.223.', '79.112.85.173'];

// Pricing per 1 Million Tokens in USD
export const TOKEN_PRICING_USD: Record<string, { input: number; output: number }> = {
    'gemini-2.5-flash': { input: 0.10, output: 0.40 }, // Updated approx pricing
    'gemini-3-pro-preview': { input: 3.50, output: 10.50 }, // Updated approx pricing for Pro
    'default': { input: 0.10, output: 0.40 }, // Fallback for any unknown models
};

// Approximate conversion rates for display purposes
export const CONVERSION_RATES: Record<string, number> = {
    USD: 1,
    EUR: 0.93,
    GBP: 0.79,
    JPY: 157,
    CAD: 1.37,
};