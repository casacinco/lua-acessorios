import json

with open('produtos.json', encoding='utf-8') as f:
    products = json.load(f)

cat_order = ['Chaveiros','Plaquinhas','Pulseiras Infantis','Aneis','Gravatas e Broches','Marcadores de Pagina','Pulseiras Femininas','Outros']
cat_slugs = {
    'Chaveiros':'chaveiros','Plaquinhas':'plaquinhas',
    'Pulseiras Infantis':'pulseiras-infantis','Aneis':'aneis',
    'Gravatas e Broches':'gravatas-broches','Marcadores de Pagina':'marcadores',
    'Pulseiras Femininas':'pulseiras-femininas','Outros':'outros'
}
cats_used = sorted(set(p['categoria'] for p in products), key=lambda x: cat_order.index(x) if x in cat_order else 99)

lines = ['-- Categorias']
for i, cat in enumerate(cats_used):
    slug = cat_slugs.get(cat, cat.lower().replace(' ','-'))
    lines.append("INSERT OR IGNORE INTO categorias (nome, slug, ordem) VALUES ('{}', '{}', {});".format(cat, slug, i))

lines.append('')
lines.append('-- Produtos')

for p in products:
    ref = p['ref'].replace("'", "''")
    cat = p['categoria'].replace("'", "''")
    tam = (p['tamanho'] or '').replace("'", "''")
    esp = (p['espessura'] or '').replace("'", "''")
    mn = p['pedido_minimo']
    lines.append("INSERT OR IGNORE INTO produtos (ref, categoria_id, tamanho, espessura, pedido_minimo) SELECT '{}', id, '{}', '{}', {} FROM categorias WHERE nome='{}';".format(ref, tam, esp, mn, cat))
    
    materiais = [
        ('aco_inox', 'Aco Inox Polido', p['preco_aco_inox']),
        ('aco_dourado', 'Aco Dourado', p['preco_aco_dourado']),
        ('latao_bruto', 'Latao Bruto', p['preco_latao_bruto']),
        ('latao_folheado', 'Latao Folheado', p['preco_latao_folheado']),
    ]
    for mkey, mnome, preco in materiais:
        disp = 1 if preco is not None else 0
        pval = str(preco) if preco is not None else 'NULL'
        lines.append("INSERT OR IGNORE INTO variacoes_produto (produto_id,material,material_nome,preco,disponivel) SELECT id,'{}','{}',{},{} FROM produtos WHERE ref='{}';".format(mkey, mnome, pval, disp, ref))

with open('seed.sql', 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

print('seed.sql gerado:', len(lines), 'linhas,', len(products), 'produtos')
