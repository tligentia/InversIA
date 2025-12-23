
export const VECTOR_DESCRIPTIONS: Record<string, string> = {
  "Análisis Socioeconómico Global": "Evalúa cómo factores macroeconómicos globales impactan el rendimiento del activo.",
  "Sentimiento de los Mercados": "Mide el 'humor' general de los inversores para prever movimientos a corto plazo.",
  "Ranking respecto a sus competidores": "Compara el activo con sus rivales directos en métricas clave.",
  "Reparto de dividendos": "Analiza la sostenibilidad e historial de la política de dividendos.",
  "Opinión de los expertos": "Sintetiza recomendaciones y precios objetivos del consenso profesional.",
  "Análisis del sector": "Examina tendencias, regulaciones y salud general del sector.",
  "Análisis de Recompensas y Staking": "Evalúa riesgos y rendimientos de programas de staking.",
  "Tecnología y Casos de Uso": "Investiga la solidez y aplicabilidad real de la tecnología subyacente.",
  "Tokenomics": "Analiza la economía del token: suministro, distribución y utilidad.",
  "Comunidad y Adopción": "Mide el crecimiento y fuerza del ecosistema de usuarios.",
  "Análisis On-Chain": "Examina datos públicos de la blockchain como volumen y direcciones activas.",
  "Análisis DAFO": "Identifica Debilidades, Amenazas, Fortalezas y Oportunidades.",
  "Salud Financiera": "Revisa rentabilidad, solvencia y eficiencia operativa.",
  "Innovación": "Evalúa la capacidad de la empresa para desarrollar nuevos productos.",
  "Riesgos Clave": "Identifica riesgos operativos, regulatorios o competitivos.",
};

export const APP_VERSION = 'v25.v12D';

// Added missing TRUSTED_IP_PREFIXES for automatic security features and developer bypass
export const TRUSTED_IP_PREFIXES = [
  '79.112.',
  '37.223.',
  '127.0.0.1',
  '::1'
];

export const TOKEN_PRICING_USD: Record<string, { input: number; output: number }> = {
    'gemini-3-flash-preview': { input: 0.10, output: 0.40 }, 
    'gemini-3-pro-preview': { input: 3.50, output: 10.50 },
    'default': { input: 0.10, output: 0.40 }, 
};

export const CONVERSION_RATES: Record<string, number> = {
    USD: 1,
    EUR: 0.93,
    GBP: 0.79,
    JPY: 157,
    BTC: 0.00001, 
};
