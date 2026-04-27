-- Migration: adiciona campos de dados do cliente na tabela pedidos
ALTER TABLE pedidos ADD COLUMN cep TEXT DEFAULT '';
ALTER TABLE pedidos ADD COLUMN numero TEXT DEFAULT '';
ALTER TABLE pedidos ADD COLUMN documento TEXT DEFAULT '';
ALTER TABLE pedidos ADD COLUMN inscricao_estadual TEXT DEFAULT '';
