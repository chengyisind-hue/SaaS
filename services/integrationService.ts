import { Company } from '../types';

const PARTNER_KEY_RAW = "FFv1!%2$fAt6--0LmJM8";
const API_BASE_URL = "https://api.facilitaponto.com.br/funcionario";

interface ExternalCompanyData {
  cnpj: string;
  activeEmployees: number;
}

// Função auxiliar para criar hash SHA1 (Web Crypto API)
async function sha1(str: string): Promise<string> {
  const enc = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-1', enc.encode(str));
  return Array.from(new Uint8Array(hash))
    .map(v => v.toString(16).padStart(2, '0'))
    .join('');
}

export const fetchEmployeeCountsFromApi = async (
  globalApiUrl: string, // Ignorado em favor da URL hardcoded do Facilita Ponto
  globalToken: string,  // Ignorado em favor da Partner Key fixa
  companies: Company[]
): Promise<ExternalCompanyData[]> => {
  
  const results: ExternalCompanyData[] = [];
  const partnerKeyHash = await sha1(PARTNER_KEY_RAW);

  console.log("Iniciando sincronização com Facilita Ponto...");

  for (const company of companies) {
    // Pula empresas que não têm as credenciais configuradas
    if (!company.companyKey || !company.integrationPassword) {
      console.log(`Pulando ${company.name}: Credenciais de integração ausentes.`);
      continue;
    }

    try {
      const integrationPassHash = await sha1(company.integrationPassword);
      
      // Monta a URL com Query Params (GET)
      const params = new URLSearchParams({
        partner_key: partnerKeyHash,
        chave_empresa: company.companyKey,
        senha_integracao: integrationPassHash
      });

      const url = `${API_BASE_URL}/lista_funcionarios?${params.toString()}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        console.warn(`Erro ao buscar dados de ${company.name}: ${response.status} ${response.statusText}`);
        continue;
      }

      const data = await response.json();

      // Verifica se a resposta é um array (lista de funcionários)
      if (Array.isArray(data)) {
        // Filtra funcionários ativos
        // Situações: 0-Pendente, 1-Ativo, 2-Afastado, 3-Férias, 4-Demitido
        // Consideramos para cobrança todos que NÃO são 4 (Demitido)
        const activeCount = data.filter((emp: any) => {
            const situacao = Number(emp.situacao);
            return situacao !== 4; 
        }).length;

        results.push({
          cnpj: company.cnpj,
          activeEmployees: activeCount
        });
        
        console.log(`Empresa: ${company.name}, Funcionários API: ${data.length}, Ativos/Cobráveis: ${activeCount}`);
      } else {
          console.warn(`Formato de resposta inesperado para ${company.name}`, data);
      }

    } catch (error) {
      console.error(`Falha na requisição para ${company.name}:`, error);
    }
  }

  return results;
};