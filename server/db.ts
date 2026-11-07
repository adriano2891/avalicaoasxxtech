import fs from 'fs';
import path from 'path';
import {
  Product,
  Category,
  Customer,
  Sale,
  FiscalDocument,
  CashShift,
  IntegrationLog,
  AuditLog,
  CompanyInfo,
  CertifiedBillingConfig,
  User,
} from '../src/types';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'database.json');

export interface DatabaseSchema {
  company: CompanyInfo;
  certifiedBilling: CertifiedBillingConfig;
  users: User[];
  categories: Category[];
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  fiscalDocuments: FiscalDocument[];
  shifts: CashShift[];
  integrationLogs: IntegrationLog[];
  auditLogs: AuditLog[];
}

const initialSeed: DatabaseSchema = {
  company: {
    name: 'ASSX Tech PDV',
    legalName: 'ASSX Tech PDV Comércio e Serviços Digitais Ltda.',
    nif: '12.345.678/0001-90',
    cae: '5611-2 - Restaurantes e Serviços de Alimentação e Bebidas',
    address: 'Rua das Acácias, 250, Vila Mariana',
    postalCode: '04101-000',
    city: 'São Paulo - SP',
    country: 'Brasil (Endereço Demonstrativo)',
    phone: '+55 (11) 3456-7890',
    email: 'contato@assxtech.com.br',
    website: 'https://assxtech.com.br',
    shareCapital: 'R$ 50.000,00',
    commercialRegistry: 'JUCESP nº 35.214.892.310',
    logoUrl: '/assets/logos/official_logo.png',
  },
  certifiedBilling: {
    provider: 'vendus',
    providerName: 'ASSX Fiscal Bridge / Vendus API',
    apiKey: '',
    hasApiKey: false,
    registerId: 'PDV-SP-01',
    seriesFS: 'FS2026',
    seriesFT: 'FT2026',
    seriesFR: 'FR2026',
    seriesNC: 'NC2026',
    environment: 'sandbox',
    certifiedSoftwareNumber: '2230/AT',
    atcudPrefix: 'CS89J2',
    isActive: true,
    lastTestStatus: 'success',
    lastTestMessage: 'Comunicação validada com a infraestrutura de certificação e emissão fiscal (Ambiente de Testes / Sandbox).',
    lastTestDate: new Date().toISOString(),
  },
  users: [
    {
      id: 'usr-1',
      name: 'Gregory',
      email: 'gregory@assxtech.com.br',
      role: 'admin',
      pin: '1234',
      active: true,
    },
  ],
  categories: [
    { id: 'cat-bebidas', name: 'Bebidas', slug: 'bebidas', iconName: 'GlassWater', order: 1 },
    { id: 'cat-lanches', name: 'Lanches', slug: 'lanches', iconName: 'Utensils', order: 2 },
    { id: 'cat-porcoes', name: 'Porções', slug: 'porcoes', iconName: 'Box', order: 3 },
    { id: 'cat-sobremesas', name: 'Sobremesas', slug: 'sobremesas', iconName: 'Cake', order: 4 },
    { id: 'cat-diversos', name: 'Diversos', slug: 'diversos', iconName: 'Coffee', order: 5 },
    { id: 'cat-pratos', name: 'Pratos Principais', slug: 'pratos-principais', iconName: 'Utensils', order: 6 },
    { id: 'cat-marmitas', name: 'Marmitas & Executivos', slug: 'marmitas', iconName: 'Box', order: 7 }
  ],
  products: [
    // 1. Bebidas (Row 1)
    {
      id: 'prod-coca',
      name: 'Coca-Cola',
      description: 'Refrigerante Coca-Cola lata 350ml gelada.',
      categoryId: 'cat-bebidas',
      price: 8.00,
      ivaRate: 13,
      ivaCode: 'INT',
      isAccountantValidated: true,
      accountantValidationDate: '2026-01-15',
      available: true,
      internalCode: '3001',
      imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=80',
      isFavorite: true,
      priceHistory: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'prod-sprite',
      name: 'Sprite',
      description: 'Refrigerante Sprite lata 350ml bem gelada.',
      categoryId: 'cat-bebidas',
      price: 7.00,
      ivaRate: 13,
      ivaCode: 'INT',
      isAccountantValidated: true,
      accountantValidationDate: '2026-01-15',
      available: true,
      internalCode: '3002',
      imageUrl: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=500&auto=format&fit=crop&q=80',
      isFavorite: true,
      priceHistory: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'prod-fanta',
      name: 'Fanta',
      description: 'Refrigerante Fanta Laranja lata 350ml.',
      categoryId: 'cat-bebidas',
      price: 7.00,
      ivaRate: 13,
      ivaCode: 'INT',
      isAccountantValidated: true,
      accountantValidationDate: '2026-01-15',
      available: true,
      internalCode: '3003',
      imageUrl: 'https://images.unsplash.com/photo-1624517452488-04869289c4ca?w=500&auto=format&fit=crop&q=80',
      isFavorite: true,
      priceHistory: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'prod-agua',
      name: 'Água Mineral',
      description: 'Água mineral sem gás 500ml.',
      categoryId: 'cat-bebidas',
      price: 3.00,
      ivaRate: 13,
      ivaCode: 'INT',
      isAccountantValidated: true,
      accountantValidationDate: '2026-01-15',
      available: true,
      internalCode: '3004',
      imageUrl: 'https://images.unsplash.com/photo-1559839914-1b396ec67e23?w=500&auto=format&fit=crop&q=80',
      isFavorite: true,
      priceHistory: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'prod-heineken',
      name: 'Heineken',
      description: 'Cerveja long neck premium puro malte 330ml.',
      categoryId: 'cat-bebidas',
      price: 12.00,
      ivaRate: 13,
      ivaCode: 'INT',
      isAccountantValidated: true,
      accountantValidationDate: '2026-01-15',
      available: true,
      internalCode: '3005',
      imageUrl: 'https://images.unsplash.com/photo-1608270199049-74d712f5a639?w=500&auto=format&fit=crop&q=80',
      isFavorite: true,
      priceHistory: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },

    // 2. Lanches (Row 2)
    {
      id: 'prod-xburguer',
      name: 'X-Burguer',
      description: 'Hambúrguer bovino artesanal 160g, queijo cheddar derretido e pão brioche tostado.',
      categoryId: 'cat-lanches',
      price: 18.00,
      ivaRate: 13,
      ivaCode: 'INT',
      isAccountantValidated: true,
      accountantValidationDate: '2026-01-15',
      available: true,
      internalCode: '1001',
      imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80',
      isFavorite: true,
      priceHistory: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'prod-xsalada',
      name: 'X-Salada',
      description: 'Hambúrguer bovino artesanal 160g, queijo cheddar, alface americana fresca, tomate e maionese especial.',
      categoryId: 'cat-lanches',
      price: 20.00,
      ivaRate: 13,
      ivaCode: 'INT',
      isAccountantValidated: true,
      accountantValidationDate: '2026-01-15',
      available: true,
      internalCode: '1002',
      imageUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=500&auto=format&fit=crop&q=80',
      isFavorite: true,
      priceHistory: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'prod-xbacon',
      name: 'X-Bacon',
      description: 'Hambúrguer bovino 160g, tiras crocantes de bacon defumado, queijo cheddar e molho barbecue.',
      categoryId: 'cat-lanches',
      price: 22.00,
      ivaRate: 13,
      ivaCode: 'INT',
      isAccountantValidated: true,
      accountantValidationDate: '2026-01-15',
      available: true,
      internalCode: '1003',
      imageUrl: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=500&auto=format&fit=crop&q=80',
      isFavorite: true,
      priceHistory: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'prod-xtudo',
      name: 'X-Tudo',
      description: 'Dois hambúrgueres bovinos, bacon duplo, queijo cheddar, ovo, alface, tomate e maionese da casa.',
      categoryId: 'cat-lanches',
      price: 26.00,
      ivaRate: 13,
      ivaCode: 'INT',
      isAccountantValidated: true,
      accountantValidationDate: '2026-01-15',
      available: true,
      internalCode: '1004',
      imageUrl: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=500&auto=format&fit=crop&q=80',
      isFavorite: true,
      priceHistory: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'prod-fritas',
      name: 'Porção de Fritas',
      description: 'Batatas palito sequinhas, douradas e crocantes, salpicadas com sal refinado e ervas.',
      categoryId: 'cat-porcoes',
      price: 15.00,
      ivaRate: 13,
      ivaCode: 'INT',
      isAccountantValidated: true,
      accountantValidationDate: '2026-01-15',
      available: true,
      internalCode: '2001',
      imageUrl: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=500&auto=format&fit=crop&q=80',
      isFavorite: true,
      priceHistory: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },

    // 3. Porções (Row 3)
    {
      id: 'prod-nuggets',
      name: 'Nuggets',
      description: 'Porção com 10 unidades de nuggets empanados e dourados com molho agridoce.',
      categoryId: 'cat-porcoes',
      price: 16.00,
      ivaRate: 13,
      ivaCode: 'INT',
      isAccountantValidated: true,
      accountantValidationDate: '2026-01-15',
      available: true,
      internalCode: '2002',
      imageUrl: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=500&auto=format&fit=crop&q=80',
      isFavorite: true,
      priceHistory: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'prod-calabresa',
      name: 'Calabresa Acebolada',
      description: 'Linguiça calabresa defumada fatiada e salteada com cebolas roxas douradas na chapa.',
      categoryId: 'cat-porcoes',
      price: 20.00,
      ivaRate: 13,
      ivaCode: 'INT',
      isAccountantValidated: true,
      accountantValidationDate: '2026-01-15',
      available: true,
      internalCode: '2003',
      imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=80',
      isFavorite: true,
      priceHistory: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'prod-coxinha',
      name: 'Coxinha',
      description: 'Clássica coxinha de frango desfiado com massa de batata cremosa e casquinha super crocante.',
      categoryId: 'cat-porcoes',
      price: 8.00,
      ivaRate: 13,
      ivaCode: 'INT',
      isAccountantValidated: true,
      accountantValidationDate: '2026-01-15',
      available: true,
      internalCode: '2004',
      imageUrl: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500&auto=format&fit=crop&q=80',
      isFavorite: true,
      priceHistory: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'prod-pastel',
      name: 'Pastel',
      description: 'Pastel crocante e sequinho recheado com queijo derretido ou carne moída temperada.',
      categoryId: 'cat-porcoes',
      price: 10.00,
      ivaRate: 13,
      ivaCode: 'INT',
      isAccountantValidated: true,
      accountantValidationDate: '2026-01-15',
      available: true,
      internalCode: '2005',
      imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=80',
      isFavorite: true,
      priceHistory: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'prod-churros',
      name: 'Churros',
      description: 'Churros espanhóis dourados passados no açúcar e canela, servidos com doce de leite cremoso.',
      categoryId: 'cat-sobremesas',
      price: 12.00,
      ivaRate: 13,
      ivaCode: 'INT',
      isAccountantValidated: true,
      accountantValidationDate: '2026-01-15',
      available: true,
      internalCode: '4001',
      imageUrl: 'https://images.unsplash.com/photo-1624300629298-e9de39c13be5?w=500&auto=format&fit=crop&q=80',
      isFavorite: true,
      priceHistory: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },

    // 4. Pratos Tradicionais & Outros
    {
      id: 'prod-bacalhau',
      name: 'Bacalhau Especial ASSX',
      description: 'Lombo de bacalhau assado, batatas ao murro, azeite extravirgem e alho.',
      categoryId: 'cat-pratos',
      price: 64.90,
      ivaRate: 13,
      ivaCode: 'INT',
      isAccountantValidated: true,
      accountantValidationDate: '2026-01-15',
      available: true,
      internalCode: 'PRAT-001',
      imageUrl: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=500&auto=format&fit=crop&q=80',
      isFavorite: true,
      priceHistory: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'prod-feijoada',
      name: 'Feijoada Completa Especial',
      description: 'Seleção tradicional de carnes nobres, couve refogada, farofa e laranja.',
      categoryId: 'cat-pratos',
      price: 52.00,
      ivaRate: 13,
      ivaCode: 'INT',
      isAccountantValidated: true,
      accountantValidationDate: '2026-01-15',
      available: true,
      internalCode: 'PRAT-002',
      imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&auto=format&fit=crop&q=80',
      isFavorite: true,
      priceHistory: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'prod-marmita',
      name: 'Marmita Executiva Frango Grelhado',
      description: 'Filé de frango grelhado, arroz, feijão caseiro e legumes no vapor.',
      categoryId: 'cat-marmitas',
      price: 28.50,
      ivaRate: 13,
      ivaCode: 'INT',
      isAccountantValidated: true,
      accountantValidationDate: '2026-01-15',
      available: true,
      internalCode: 'MARM-001',
      imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80',
      isFavorite: true,
      priceHistory: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'prod-cafe',
      name: 'Café Expresso Blend Especial',
      description: 'Café de torra lenta com crema aveludada.',
      categoryId: 'cat-diversos',
      price: 5.50,
      ivaRate: 13,
      ivaCode: 'INT',
      isAccountantValidated: true,
      accountantValidationDate: '2026-01-15',
      available: true,
      internalCode: 'CAF-001',
      imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80',
      isFavorite: true,
      priceHistory: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ],
  customers: [
    {
      id: 'cust-final',
      name: 'Consumidor Final',
      nif: '999999990',
      country: 'Brasil',
      rgpdConsent: true,
      totalSpent: 0,
      ordersCount: 0,
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'cust-1',
      name: 'Antônio Manuel Ferreira',
      nif: '23456789100',
      email: 'antonio.ferreira@email.com.br',
      phone: '+55 (11) 98123-4567',
      address: 'Avenida Paulista, 1200, Apto 34',
      postalCode: '01310-100',
      city: 'São Paulo - SP',
      country: 'Brasil',
      rgpdConsent: true,
      rgpdConsentDate: '2026-02-10',
      totalSpent: 420.00,
      ordersCount: 6,
      createdAt: '2026-02-10T12:00:00Z',
    },
    {
      id: 'cust-2',
      name: 'Inovação & Soluções Digitais Ltda.',
      nif: '50987654000120',
      email: 'contabilidade@inovacao.com.br',
      phone: '+55 (11) 3210-9876',
      address: 'Rua Vergueiro, 1500, Sala 82',
      postalCode: '04101-000',
      city: 'São Paulo - SP',
      country: 'Brasil',
      rgpdConsent: true,
      rgpdConsentDate: '2026-02-15',
      totalSpent: 980.00,
      ordersCount: 12,
      createdAt: '2026-02-15T14:30:00Z',
    },
  ],
  sales: [],
  fiscalDocuments: [],
  shifts: [
    {
      id: 'shift-1',
      shiftNumber: 104,
      openedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      openedBy: 'Gregory',
      openingAmount: 150.00,
      expectedCashAmount: 150.00,
      status: 'aberta',
      movements: [
        {
          id: 'mov-1',
          shiftId: 'shift-1',
          type: 'entrada',
          amount: 50.00,
          reason: 'Reforço de troco pelo gerente',
          operatorName: 'Gregory',
          timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
        }
      ],
      totals: {
        salesCount: 0,
        totalRevenue: 0,
        dinheiro: 50.00,
        cartao: 0,
        mbway: 0,
        outro: 0,
        cashIn: 50.00,
        cashOut: 0,
      },
    },
  ],
  integrationLogs: [],
  auditLogs: [
    {
      id: 'aud-1',
      timestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      userId: 'usr-1',
      userName: 'Gregory',
      action: 'Abertura de Caixa #104',
      category: 'caixa',
      details: 'Caixa aberta com fundo de troco inicial de R$ 150,00',
    }
  ],
};

export class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        // Migração automática de marca se houver dados antigos
        if (parsed.company && parsed.company.name !== 'ASSX Tech PDV') {
          parsed.company = { ...initialSeed.company, ...parsed.company, name: 'ASSX Tech PDV', legalName: 'ASSX Tech PDV Comércio e Serviços Digitais Ltda.' };
          this.save(parsed);
        }
        // Migração automática de catálogo de produtos com imagens do PDV
        if (!parsed.products || !parsed.products.some((p: any) => p.name === 'Coca-Cola')) {
          parsed.categories = initialSeed.categories;
          parsed.products = initialSeed.products;
          this.save(parsed);
        }
        return parsed;
      }
    } catch (err) {
      console.error('Erro ao carregar banco de dados, usando inicial:', err);
    }
    this.save(initialSeed);
    return initialSeed;
  }

  private save(data: DatabaseSchema): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Erro ao salvar banco de dados:', err);
    }
  }

  public get(): DatabaseSchema {
    return this.data;
  }

  public update(updater: (data: DatabaseSchema) => void): DatabaseSchema {
    updater(this.data);
    this.save(this.data);
    return this.data;
  }
}

export const db = new Database();
