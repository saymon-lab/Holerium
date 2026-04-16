-- SCRIPT DE MIGRAÇÃO - PORTAL SUPER
-- Execute estas instruções no SQL Editor do seu Dashboard do Supabase

-- 1. Adiciona a coluna de categoria na tabela de documentos
ALTER TABLE documents ADD COLUMN IF NOT EXISTS category TEXT;

-- 2. Migra os dados existentes baseados no número do mês
UPDATE documents SET category = CASE 
    WHEN month = '13' THEN '13_salario_1'
    WHEN month = '14' THEN '13_salario_2'
    WHEN month = '15' THEN 'ferias'
    WHEN month = '16' THEN 'rendimentos'
    ELSE 'holerite'
END WHERE category IS NULL;

-- 3. (Opcional) Cria um índice para melhorar a performance das buscas por categoria
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
