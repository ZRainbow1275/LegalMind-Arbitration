/**
 * 法律条文数据库
 * 提供法律条文的查询和管理功能
 */

// 法律条文接口
export interface LegalArticle {
  id: string;
  law: string;           // 法律名称
  article: string;       // 条文编号
  content: string;       // 条文内容
  category: string;      // 分类
  keywords: string[];    // 关键词
  effectiveDate?: string; // 生效日期
}

// 法律条文数据库
export class LegalArticlesDatabase {
  private static articles: LegalArticle[] = [
    // 民法典 - 合同编
    {
      id: 'civil-code-464',
      law: '中华人民共和国民法典',
      article: '第464条',
      content: '合同是民事主体之间设立、变更、终止民事法律关系的协议。婚姻、收养、监护等有关身份关系的协议，适用有关该身份关系的法律规定；没有规定的，可以根据其性质参照适用本编规定。',
      category: '合同法',
      keywords: ['合同', '民事主体', '法律关系', '协议'],
      effectiveDate: '2021-01-01',
    },
    {
      id: 'civil-code-465',
      law: '中华人民共和国民法典',
      article: '第465条',
      content: '依法成立的合同，受法律保护。依法成立的合同，仅对当事人具有法律约束力，但是法律另有规定的除外。',
      category: '合同法',
      keywords: ['合同', '法律保护', '约束力', '当事人'],
      effectiveDate: '2021-01-01',
    },
    {
      id: 'civil-code-470',
      law: '中华人民共和国民法典',
      article: '第470条',
      content: '合同的内容由当事人约定，一般包括下列条款：（一）当事人的姓名或者名称和住所；（二）标的；（三）数量；（四）质量；（五）价款或者报酬；（六）履行期限、地点和方式；（七）违约责任；（八）解决争议的方法。',
      category: '合同法',
      keywords: ['合同内容', '当事人', '标的', '违约责任'],
      effectiveDate: '2021-01-01',
    },
    {
      id: 'civil-code-577',
      law: '中华人民共和国民法典',
      article: '第577条',
      content: '当事人一方不履行合同义务或者履行合同义务不符合约定的，应当承担继续履行、采取补救措施或者赔偿损失等违约责任。',
      category: '合同法',
      keywords: ['违约责任', '继续履行', '补救措施', '赔偿损失'],
      effectiveDate: '2021-01-01',
    },
    {
      id: 'civil-code-578',
      law: '中华人民共和国民法典',
      article: '第578条',
      content: '当事人一方明确表示或者以自己的行为表明不履行合同义务的，对方可以在履行期限届满前请求其承担违约责任。',
      category: '合同法',
      keywords: ['预期违约', '违约责任', '履行期限'],
      effectiveDate: '2021-01-01',
    },

    // 民法典 - 侵权责任编
    {
      id: 'civil-code-1165',
      law: '中华人民共和国民法典',
      article: '第1165条',
      content: '行为人因过错侵害他人民事权益造成损害的，应当承担侵权责任。依照法律规定推定行为人有过错，其不能证明自己没有过错的，应当承担侵权责任。',
      category: '侵权责任',
      keywords: ['侵权责任', '过错', '损害赔偿', '举证责任'],
      effectiveDate: '2021-01-01',
    },
    {
      id: 'civil-code-1179',
      law: '中华人民共和国民法典',
      article: '第1179条',
      content: '侵害他人造成人身损害的，应当赔偿医疗费、护理费、交通费、营养费、住院伙食补助费等为治疗和康复支出的合理费用，以及因误工减少的收入。造成残疾的，还应当赔偿辅助器具费和残疾赔偿金；造成死亡的，还应当赔偿丧葬费和死亡赔偿金。',
      category: '侵权责任',
      keywords: ['人身损害', '赔偿', '医疗费', '残疾赔偿金', '死亡赔偿金'],
      effectiveDate: '2021-01-01',
    },
    {
      id: 'civil-code-1184',
      law: '中华人民共和国民法典',
      article: '第1184条',
      content: '侵害他人财产的，财产损失按照损失发生时的市场价格或者其他合理方式计算。',
      category: '侵权责任',
      keywords: ['财产损害', '损失计算', '市场价格'],
      effectiveDate: '2021-01-01',
    },

    // 仲裁法
    {
      id: 'arbitration-law-2',
      law: '中华人民共和国仲裁法',
      article: '第2条',
      content: '平等主体的公民、法人和其他组织之间发生的合同纠纷和其他财产权益纠纷，可以仲裁。',
      category: '仲裁程序',
      keywords: ['仲裁', '合同纠纷', '财产权益', '平等主体'],
      effectiveDate: '1995-09-01',
    },
    {
      id: 'arbitration-law-4',
      law: '中华人民共和国仲裁法',
      article: '第4条',
      content: '当事人采用仲裁方式解决纠纷，应当双方自愿，达成仲裁协议。没有仲裁协议，一方申请仲裁的，仲裁委员会不予受理。',
      category: '仲裁程序',
      keywords: ['仲裁协议', '自愿原则', '受理条件'],
      effectiveDate: '1995-09-01',
    },
    {
      id: 'arbitration-law-16',
      law: '中华人民共和国仲裁法',
      article: '第16条',
      content: '仲裁协议包括合同中订立的仲裁条款和以其他书面方式在纠纷发生前或者纠纷发生后达成的请求仲裁的协议。仲裁协议应当具有下列内容：（一）请求仲裁的意思表示；（二）仲裁事项；（三）选定的仲裁委员会。',
      category: '仲裁程序',
      keywords: ['仲裁协议', '仲裁条款', '仲裁委员会'],
      effectiveDate: '1995-09-01',
    },
    {
      id: 'arbitration-law-43',
      law: '中华人民共和国仲裁法',
      article: '第43条',
      content: '当事人应当对自己的主张提供证据。仲裁庭认为有必要收集的证据，可以自行收集。',
      category: '仲裁程序',
      keywords: ['举证责任', '证据收集', '仲裁庭'],
      effectiveDate: '1995-09-01',
    },
    {
      id: 'arbitration-law-51',
      law: '中华人民共和国仲裁法',
      article: '第51条',
      content: '仲裁庭在作出裁决前，可以先行调解。当事人自愿调解的，仲裁庭应当调解。调解不成的，应当及时作出裁决。调解达成协议的，仲裁庭应当制作调解书或者根据协议的结果制作裁决书。调解书与裁决书具有同等法律效力。',
      category: '仲裁程序',
      keywords: ['调解', '裁决', '调解书', '裁决书'],
      effectiveDate: '1995-09-01',
    },

    // 民事诉讼法
    {
      id: 'civil-procedure-law-64',
      law: '中华人民共和国民事诉讼法',
      article: '第64条',
      content: '当事人对自己提出的主张，有责任提供证据。当事人及其诉讼代理人因客观原因不能自行收集的证据，或者人民法院认为审理案件需要的证据，人民法院应当调查收集。',
      category: '证据规则',
      keywords: ['举证责任', '证据收集', '法院调查'],
      effectiveDate: '2013-01-01',
    },
    {
      id: 'civil-procedure-law-65',
      law: '中华人民共和国民事诉讼法',
      article: '第65条',
      content: '当事人对自己提出的主张应当及时提供证据。人民法院根据当事人的主张和案件审理情况，确定当事人应当提供的证据及其期限。当事人在该期限内提供证据确有困难的，可以向人民法院申请延长期限，人民法院根据当事人的申请适当延长。',
      category: '证据规则',
      keywords: ['举证期限', '证据提供', '期限延长'],
      effectiveDate: '2013-01-01',
    },

    // 公司法
    {
      id: 'company-law-3',
      law: '中华人民共和国公司法',
      article: '第3条',
      content: '公司是企业法人，有独立的法人财产，享有法人财产权。公司以其全部财产对公司的债务承担责任。有限责任公司的股东以其认缴的出资额为限对公司承担责任；股份有限公司的股东以其认购的股份为限对公司承担责任。',
      category: '公司法',
      keywords: ['法人', '有限责任', '股东责任', '公司债务'],
      effectiveDate: '2014-03-01',
    },
    {
      id: 'company-law-20',
      law: '中华人民共和国公司法',
      article: '第20条',
      content: '公司股东应当遵守法律、行政法规和公司章程，依法行使股东权利，不得滥用股东权利损害公司或者其他股东的利益；不得滥用公司法人独立地位和股东有限责任损害公司债权人的利益。公司股东滥用股东权利给公司或者其他股东造成损失的，应当依法承担赔偿责任。',
      category: '公司法',
      keywords: ['股东权利', '滥用权利', '赔偿责任', '法人独立'],
      effectiveDate: '2014-03-01',
    },

    // 劳动合同法
    {
      id: 'labor-contract-law-3',
      law: '中华人民共和国劳动合同法',
      article: '第3条',
      content: '订立劳动合同，应当遵循合法、公平、平等自愿、协商一致、诚实信用的原则。依法订立的劳动合同具有约束力，用人单位与劳动者应当履行劳动合同约定的义务。',
      category: '劳动法',
      keywords: ['劳动合同', '订立原则', '约束力', '诚实信用'],
      effectiveDate: '2008-01-01',
    },
    {
      id: 'labor-contract-law-39',
      law: '中华人民共和国劳动合同法',
      article: '第39条',
      content: '劳动者有下列情形之一的，用人单位可以解除劳动合同：（一）在试用期间被证明不符合录用条件的；（二）严重违反用人单位的规章制度的；（三）严重失职，营私舞弊，给用人单位造成重大损害的；（四）劳动者同时与其他用人单位建立劳动关系，对完成本单位的工作任务造成严重影响，或者经用人单位提出，拒不改正的；（五）因本法第二十六条第一款第一项规定的情形致使劳动合同无效的；（六）被依法追究刑事责任的。',
      category: '劳动法',
      keywords: ['解除劳动合同', '试用期', '违反制度', '重大损害'],
      effectiveDate: '2008-01-01',
    },
  ];

  /**
   * 获取所有条文
   */
  static getAllArticles(): LegalArticle[] {
    return [...this.articles];
  }

  /**
   * 根据ID获取条文
   */
  static getArticleById(id: string): LegalArticle | undefined {
    return this.articles.find(article => article.id === id);
  }

  /**
   * 搜索条文
   */
  static searchArticles(query: string): LegalArticle[] {
    const lowerQuery = query.toLowerCase().trim();
    
    if (!lowerQuery) {
      return this.getAllArticles();
    }

    return this.articles.filter(article => {
      // 搜索法律名称
      if (article.law.toLowerCase().includes(lowerQuery)) {
        return true;
      }
      
      // 搜索条文编号
      if (article.article.toLowerCase().includes(lowerQuery)) {
        return true;
      }
      
      // 搜索条文内容
      if (article.content.toLowerCase().includes(lowerQuery)) {
        return true;
      }
      
      // 搜索分类
      if (article.category.toLowerCase().includes(lowerQuery)) {
        return true;
      }
      
      // 搜索关键词
      if (article.keywords.some(keyword => keyword.toLowerCase().includes(lowerQuery))) {
        return true;
      }
      
      return false;
    });
  }

  /**
   * 按分类获取条文
   */
  static getArticlesByCategory(category: string): LegalArticle[] {
    return this.articles.filter(article => article.category === category);
  }

  /**
   * 获取所有分类
   */
  static getAllCategories(): string[] {
    const categories = new Set(this.articles.map(article => article.category));
    return Array.from(categories).sort();
  }

  /**
   * 按法律名称获取条文
   */
  static getArticlesByLaw(law: string): LegalArticle[] {
    return this.articles.filter(article => article.law === law);
  }

  /**
   * 获取所有法律名称
   */
  static getAllLaws(): string[] {
    const laws = new Set(this.articles.map(article => article.law));
    return Array.from(laws).sort();
  }
}

