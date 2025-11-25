import { GoogleGenAI } from "@google/genai";
import { Company, Invoice } from "../types";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY not found in environment variables");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateFinancialReport = async (
  companies: Company[],
  invoices: Invoice[]
): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "Erro: Chave de API não configurada no ambiente (process.env.API_KEY).";

  const dataContext = JSON.stringify({
    companiesSummary: companies.map(c => ({ name: c.name, status: c.status })),
    invoicesSummary: invoices.map(i => ({
      company: i.companyName,
      month: i.competence,
      amount: i.totalValue,
      status: i.status,
      employees: i.employeeCount
    }))
  });

  const prompt = `
    Atue como um CFO (Chief Financial Officer) experiente para um SaaS B2B de Ponto Eletrônico.
    Analise os seguintes dados brutos (JSON) de empresas clientes e faturas:
    
    ${dataContext}

    Gere um relatório executivo conciso em Markdown (PT-BR) focado em ação:
    
    1. **Saúde do Caixa**: Compare o valor já recebido vs pendente/vencido. Use negrito para valores críticos.
    2. **Risco de Churn**: Aponte explicitamente empresas com status "Bloqueado" ou com faturas "Vencido" recorrentes.
    3. **Oportunidades**: Identifique empresas que aumentaram o número de funcionários (upsell).
    
    Regras:
    - Não use introduções genéricas como "Aqui está o relatório". Vá direto aos pontos.
    - Use tópicos (bullet points) para facilitar a leitura rápida.
    - Se houver inadimplência alta, sugira uma ação de cobrança.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Não foi possível gerar a análise no momento.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Erro: Falha ao conectar com a IA. Verifique sua chave de API e quotas.";
  }
};