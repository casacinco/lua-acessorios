-- Migration: adiciona coluna bairro na tabela pedidos
ALTER TABLE pedidos ADD COLUMN bairro TEXT DEFAULT '';
