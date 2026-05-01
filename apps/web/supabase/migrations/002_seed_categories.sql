-- ============================================================
-- GiroB2B — Seed de Categorias Iniciais
-- Verticais prioritárias do MVP
-- ============================================================

-- Categorias raiz
INSERT INTO categories (id, name, slug, parent_id, icon, sort_order) VALUES
  ('11111111-0000-0000-0000-000000000001', 'Embalagens',                    'embalagens',               NULL, '📦', 1),
  ('11111111-0000-0000-0000-000000000002', 'Alimentos e Bebidas',            'alimentos-bebidas',         NULL, '🍽️', 2),
  ('11111111-0000-0000-0000-000000000003', 'Materiais de Construção',        'materiais-construcao',      NULL, '🏗️', 3),
  ('11111111-0000-0000-0000-000000000004', 'Têxtil e Confecção',             'textil-confeccao',          NULL, '🧵', 4),
  ('11111111-0000-0000-0000-000000000005', 'Autopeças',                      'autopecas',                 NULL, '🔧', 5),
  ('11111111-0000-0000-0000-000000000006', 'Indústria e Manufatura',         'industria-manufatura',      NULL, '🏭', 6),
  ('11111111-0000-0000-0000-000000000007', 'Tecnologia e Informática',       'tecnologia-informatica',    NULL, '💻', 7),
  ('11111111-0000-0000-0000-000000000008', 'Serviços Empresariais',          'servicos-empresariais',     NULL, '💼', 8),
  ('11111111-0000-0000-0000-000000000009', 'Limpeza e Higiene',              'limpeza-higiene',           NULL, '🧹', 9),
  ('11111111-0000-0000-0000-000000000010', 'Agronegócio',                    'agronegocio',               NULL, '🌱', 10)
ON CONFLICT (slug) DO NOTHING;

-- Subcategorias: Embalagens
INSERT INTO categories (name, slug, parent_id, sort_order) VALUES
  ('Embalagens Plásticas',          'embalagens-plasticas',          '11111111-0000-0000-0000-000000000001', 1),
  ('Embalagens de Papel e Papelão', 'embalagens-papel-papelao',      '11111111-0000-0000-0000-000000000001', 2),
  ('Embalagens de Vidro',           'embalagens-vidro',              '11111111-0000-0000-0000-000000000001', 3),
  ('Embalagens Flexíveis',          'embalagens-flexiveis',          '11111111-0000-0000-0000-000000000001', 4),
  ('Embalagens Metálicas',          'embalagens-metalicas',          '11111111-0000-0000-0000-000000000001', 5),
  ('Sacolas e Sacos',               'sacolas-sacos',                 '11111111-0000-0000-0000-000000000001', 6)
ON CONFLICT (slug) DO NOTHING;

-- Subcategorias: Alimentos e Bebidas
INSERT INTO categories (name, slug, parent_id, sort_order) VALUES
  ('Insumos Industriais',           'insumos-industriais-alimentos', '11111111-0000-0000-0000-000000000002', 1),
  ('Ingredientes e Aditivos',       'ingredientes-aditivos',         '11111111-0000-0000-0000-000000000002', 2),
  ('Embalagens para Alimentos',     'embalagens-alimentos',          '11111111-0000-0000-0000-000000000002', 3),
  ('Equipamentos para Alimentos',   'equipamentos-alimentos',        '11111111-0000-0000-0000-000000000002', 4),
  ('Bebidas para Revenda',          'bebidas-revenda',               '11111111-0000-0000-0000-000000000002', 5)
ON CONFLICT (slug) DO NOTHING;

-- Subcategorias: Materiais de Construção
INSERT INTO categories (name, slug, parent_id, sort_order) VALUES
  ('Cimento e Argamassa',           'cimento-argamassa',             '11111111-0000-0000-0000-000000000003', 1),
  ('Aço e Metais',                  'aco-metais',                    '11111111-0000-0000-0000-000000000003', 2),
  ('Cerâmica e Porcelanato',        'ceramica-porcelanato',          '11111111-0000-0000-0000-000000000003', 3),
  ('Tintas e Vernizes',             'tintas-vernizes',               '11111111-0000-0000-0000-000000000003', 4),
  ('Madeira e Derivados',           'madeira-derivados',             '11111111-0000-0000-0000-000000000003', 5),
  ('Hidráulica e Elétrica',         'hidraulica-eletrica',           '11111111-0000-0000-0000-000000000003', 6)
ON CONFLICT (slug) DO NOTHING;

-- Subcategorias: Têxtil e Confecção
INSERT INTO categories (name, slug, parent_id, sort_order) VALUES
  ('Tecidos e Malhas',              'tecidos-malhas',                '11111111-0000-0000-0000-000000000004', 1),
  ('Aviamentos e Acessórios',       'aviamentos-acessorios',         '11111111-0000-0000-0000-000000000004', 2),
  ('Máquinas de Costura',           'maquinas-costura',              '11111111-0000-0000-0000-000000000004', 3),
  ('Uniformes e EPIs',              'uniformes-epis',                '11111111-0000-0000-0000-000000000004', 4),
  ('Roupas para Revenda',           'roupas-revenda',                '11111111-0000-0000-0000-000000000004', 5)
ON CONFLICT (slug) DO NOTHING;

-- Subcategorias: Autopeças
INSERT INTO categories (name, slug, parent_id, sort_order) VALUES
  ('Peças para Carros',             'pecas-carros',                  '11111111-0000-0000-0000-000000000005', 1),
  ('Peças para Caminhões',          'pecas-caminhoes',               '11111111-0000-0000-0000-000000000005', 2),
  ('Pneus e Rodas',                 'pneus-rodas',                   '11111111-0000-0000-0000-000000000005', 3),
  ('Acessórios Automotivos',        'acessorios-automotivos',        '11111111-0000-0000-0000-000000000005', 4),
  ('Lubrificantes e Fluidos',       'lubrificantes-fluidos',         '11111111-0000-0000-0000-000000000005', 5)
ON CONFLICT (slug) DO NOTHING;

-- Subcategorias: Indústria e Manufatura
INSERT INTO categories (name, slug, parent_id, sort_order) VALUES
  ('Matérias-Primas',               'materias-primas',               '11111111-0000-0000-0000-000000000006', 1),
  ('Ferramentas Industriais',       'ferramentas-industriais',       '11111111-0000-0000-0000-000000000006', 2),
  ('Peças e Componentes',           'pecas-componentes',             '11111111-0000-0000-0000-000000000006', 3),
  ('Produtos Químicos',             'produtos-quimicos',             '11111111-0000-0000-0000-000000000006', 4),
  ('Máquinas e Equipamentos',       'maquinas-equipamentos',         '11111111-0000-0000-0000-000000000006', 5),
  ('Metais e Ligas',                'metais-ligas',                  '11111111-0000-0000-0000-000000000006', 6)
ON CONFLICT (slug) DO NOTHING;

-- Subcategorias: Tecnologia
INSERT INTO categories (name, slug, parent_id, sort_order) VALUES
  ('Hardware e Periféricos',        'hardware-perifericos',          '11111111-0000-0000-0000-000000000007', 1),
  ('Software e Licenças',           'software-licencas',             '11111111-0000-0000-0000-000000000007', 2),
  ('Serviços de TI',                'servicos-ti',                   '11111111-0000-0000-0000-000000000007', 3),
  ('Telecomunicações',              'telecomunicacoes',              '11111111-0000-0000-0000-000000000007', 4)
ON CONFLICT (slug) DO NOTHING;

-- Subcategorias: Serviços Empresariais
INSERT INTO categories (name, slug, parent_id, sort_order) VALUES
  ('Logística e Transporte',        'logistica-transporte',          '11111111-0000-0000-0000-000000000008', 1),
  ('Marketing e Publicidade',       'marketing-publicidade',         '11111111-0000-0000-0000-000000000008', 2),
  ('Consultoria Empresarial',       'consultoria-empresarial',       '11111111-0000-0000-0000-000000000008', 3),
  ('Contabilidade e Financeiro',    'contabilidade-financeiro',      '11111111-0000-0000-0000-000000000008', 4)
ON CONFLICT (slug) DO NOTHING;

-- Subcategorias: Agronegócio
INSERT INTO categories (name, slug, parent_id, sort_order) VALUES
  ('Insumos Agrícolas',             'insumos-agricolas',             '11111111-0000-0000-0000-000000000010', 1),
  ('Máquinas Agrícolas',            'maquinas-agricolas',            '11111111-0000-0000-0000-000000000010', 2),
  ('Grãos e Commodities',           'graos-commodities',             '11111111-0000-0000-0000-000000000010', 3),
  ('Defensivos Agrícolas',          'defensivos-agricolas',          '11111111-0000-0000-0000-000000000010', 4)
ON CONFLICT (slug) DO NOTHING;
