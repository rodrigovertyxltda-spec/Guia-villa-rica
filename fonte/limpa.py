# Revisão da lista de Compras: só produto, na unidade de compra (barra 12/6 m, painel, bobina, lata...).
# Serviço/elemento executado vai para D['exe'] (aba Execução da obra). Duplicidade sai.
# Entrada: site/data.coded.json (lista com códigos). Saída: site/data.json + relatório.
import json, re, math, os, collections, openpyxl
S = os.path.dirname(os.path.abspath(__file__))
D = json.load(open(S + '/site/data.coded.json'))
REL = collections.defaultdict(list)          # relatório do que mudou
def rel(k, n, txt): REL[k].append(f"{n} · {txt}")

# ---------- tabelas Gerdau (kg/m) ----------
VERG = {'4,2': .109, '5,0': .154, '6,0': .222, '6,3': .245, '8,0': .395, '10,0': .617, '12,5': .963, '16,0': 1.578, '20,0': 2.466, '25,0': 3.853}
TELA = {'Q-92': 1.48, 'Q-138': 2.20, 'Q-196': 3.11, 'Q-246': 3.91, 'Q-283': 4.48}   # kg/m²
PAINEL = 2.45 * 6.00
def br(x): return f"{x:,.1f}".replace(',', 'X').replace('.', ',').replace('X', '.').replace(',0', '')
def brk(x): return f"{x:,.0f}".replace(',', '.')
def num(s):
    s = str(s).strip()
    if ',' in s: s = s.replace('.', '').replace(',', '.')
    elif re.fullmatch(r'\d{1,3}(\.\d{3})+', s): s = s.replace('.', '')
    try: return float(s)
    except: return None
def q(v): return str(int(v)) if float(v).is_integer() else br(v)

# ---------- R02: barras de perfil por galpão ----------
wb = openpyxl.load_workbook('/mnt/project-files/estrutura-metalica/R02/estrutura-metalica-galpoes-villa-rica-R02.xlsx', data_only=True)
GALP = {'S': '01', 'SB': '01b', 'Q': '03', 'P': '02', 'A': '04', 'B': '14', 'V': '12', 'SV': '15', 'OF': '16', 'AF': '16'}
KGM = {r[0]: r[1] for r in list(wb['Compra de barras'].iter_rows(values_only=True))[1:] if r[0]}
BARS = collections.defaultdict(lambda: collections.Counter())   # (galp) -> {(perfil, comp): qtd}
USO = collections.defaultdict(float)
for r in list(wb['Plano de corte'].iter_rows(values_only=True))[1:]:
    if not r[0] or not r[4]: continue
    m = re.match(r'([A-Z]{1,2})-', str(r[4]))
    g = GALP[m.group(1)]
    BARS[g][(r[0], int(r[3]))] += int(r[2])
for r in list(wb['Lista de perfis'].iter_rows(values_only=True))[1:]:
    if r[1]:
        g = GALP[re.match(r'([A-Z]{1,2})-', r[1]).group(1)]
        USO[(g, r[3])] += r[6] or 0
def perfil_itens(g):
    out = []
    for (pf, L), n in sorted(BARS[g].items(), key=lambda x: (x[0][0], -x[0][1])):
        kg = KGM.get(pf, 0) * L
        out.append([f"Perfil {pf} – ASTM A572 Gr.50 – barra {L} m", f"barra {L} m", str(n), 'M', None,
                    f"Gerdau: {br(kg)} kg/barra · {brk(kg * n)} kg · R02 (plano de corte)"])
    return out

# ---------- Ue (perfil dobrado) kg/m pela seção ----------
def ue_kgm(h, b, d, t): return round((h + 2 * b + 2 * d - 4 * t) * t * 7.85e-3, 2)

# ---------- execução: palavras de serviço/elemento ----------
EXE = re.compile(r'^(?:\[[^\]]+\]\s*)?(?:[A-ZÁ-Úa-zá-ú ]+:\s*)?(chapisco|reboco|emboço|contrapiso|regulariza|lastro|alvenaria|divisórias internas em bloco|forma\b|forma da|forma:|forma \(|pintura acrílica|pintura de faixas|pintura epóxi|demarcação|linhas de|faixas de divisa|preparo|imprimação|cbuq|canteiros|impermeabiliza|manta/argamassa|laje lpi|piso de concreto|piso: concreto|piso: piso de concreto|piso da varanda|piso sobre steel|doca \(|quiosque de apoio|reboco|estacas|extensão das descidas|viga baldrame|vergas|lajes de piso|mureta|bases de filtros|acréscimo de concreto|concreto|reboco)', re.I)
PROD_CONC = re.compile(r'concreto usinado', re.I)
def fck(d):
    m = re.search(r'fck\s*(\d\d)', d, re.I)
    if m: return m.group(1)
    if re.search(r'magro', d, re.I): return 'magro'
    return '25'

# ---------- limpeza de descrição ----------
NOTA_PAR = re.compile(r'\s*\(([^()]*(?:m²|m³|kg|R0\d|MC-|PIS-|EST-|HID-|ELE-|ARQ-|memorial|já na lista|barras de|peças|soma|trechos|adotad|medido|contad|conferir|a decidir|se houver|RECOMENDA|opcional)[^()]*)\)', re.I)
def limpa_desc(d):
    notas = []
    pre = re.match(r'^((?:\[[^\]]+\])|(?:Apoio|Oficina|Resíduos|Abrigo de resíduos):)\s*', d)
    if pre: notas.append(pre.group(1).strip('[]:')); d = d[pre.end():]
    for m in NOTA_PAR.findall(d): notas.append(m.strip())
    d = NOTA_PAR.sub('', d)
    m = re.search(r'\s*·\s*([\d.,]+ m em peças.*)$', d)
    if m: notas.append(m.group(1)); d = d[:m.start()]
    d = re.sub(r'\s+–\s*$', '', re.sub(r'\s{2,}', ' ', d)).strip()
    return d, notas

V_UN = {'un', 'm', 'm²', 'm³', 'kg', 'barra', 'cj', 'vb', 'painel', 'conj.', 'conj', 'barra 6 m', 'rolo', 'par', 'cilindro', 'lata', 'galão', 'jogo', 'saco', 'pç'}

def conv_item(n, ps, p, g, it):
    """retorna (lista_produtos, lista_execucao, info) para um item"""
    d, u, qt = it[0], it[1], it[2]
    v = num(qt) or 0
    dl = d.lower()
    # duplicidade declarada
    if re.search(r'já na lista|já incluso|\(já na lista', dl):
        rel('dup', n, d[:90]); return [], [], True
    if re.match(r'^(total de|área útil)', dl):
        rel('dup', n, d[:90]); return [], [], True
    if p['s'] == 'estrutura-metalica' and re.match(r'tela soldada q-\d+ \(com transpasse\)', dl):
        rel('dup', n, d[:70] + ' (já em painéis na Ferragem)'); return [], [], True
    if re.match(r'tinta de fundo epóxi rico em zinco', dl) and u == 'vb':
        rel('dup', n, 'Tinta da estrutura (já em Insumos: tinta branca 200 latas)'); return [], [], True
    # vergalhão com barras
    m = re.search(r'(CA-\d\d)\s*Ø\s*([\d,]+)\s*mm.*?\(barras de (12|6) m:\s*(\d+)\)', d)
    if m and u == 'kg':
        bit = m.group(2) if ',' in m.group(2) else m.group(2) + ',0'
        kgb = VERG.get(bit, 0) * int(m.group(3))
        est = ' (estribos)' if 'estribo' in dl else ''
        rel('kg', n, f"Vergalhão {m.group(1)} Ø{bit}: {qt} kg → {m.group(4)} barras de {m.group(3)} m")
        return [[f"Vergalhão {m.group(1)} Ø {bit} mm – barra {m.group(3)} m{est}", f"barra {m.group(3)} m", m.group(4), it[3], it[4],
                 f"Gerdau: {br(kgb)} kg/barra · {qt} kg"]], [], False
    # aço de tanque/laje em kg sem bitola: armadura Ø10 (PIS) ou Ø12,5 (EST-18) ou Ø10 adotado
    if u == 'kg' and re.match(r'aço ca-50', dl):
        bit = '12,5' if 'EST-18' in d else '10,0'
        kgm = VERG[bit]; nb = math.ceil(v / kgm / 12)
        nota = 'armadura de projeto Ø10 c/15 (PIS)' if 'tanque' in dl else ('Ø12,5 c/15 conforme EST-18' if bit == '12,5' else 'bitola Ø10 c/15 do projeto')
        rel('kg', n, f"{d[:60]}: {qt} kg → {nb} barras Ø{bit} de 12 m")
        el = [f"{limpa_desc(d)[0]}", 'kg', qt, it[3], None, 'armadura (peso de projeto)']
        return [[f"Vergalhão CA-50 Ø {bit} mm – barra 12 m", 'barra 12 m', str(nb), it[3], it[4], f"Gerdau: {br(kgm*12)} kg/barra · {qt} kg · {nota}"]], [el], False
    # perfil laminado em kg (fora do R02) -> barras por metro
    m = re.search(r'Perfil laminado (W|HP) (\d+) x ([\d.]+).*?·\s*([\d.,]+) m em peças', d)
    if m and u == 'kg':
        pf = f"{m.group(1)} {m.group(2)} x {m.group(3).replace('.', ',')}"
        met = num(m.group(4)); nb = math.ceil(met * 1.06 / 12)
        rel('kg', n, f"{pf}: {qt} kg → {nb} barras de 12 m (pelo comprimento)")
        return [[f"Perfil {pf} – ASTM A572 Gr.50 – barra 12 m", 'barra 12 m', str(nb), 'E', it[4], f"Gerdau: {br(float(m.group(3))*12)} kg/barra · {qt} kg"]], [], False
    # terças / longarinas Ue em kg -> barras de 6 m
    m = re.search(r'(Terças|Longarinas[^U]*)\s+Ue\s*(\d+)(?:\s*x\s*(\d+)\s*x\s*(\d+)\s*x\s*([\d,]+))?', d)
    if m and u == 'kg':
        h = int(m.group(2)); b, dd, t = (int(m.group(3)), int(m.group(4)), num(m.group(5))) if m.group(3) else ((75, 25, 2.65) if h == 200 else (60, 20, 2.25))
        kgm = ue_kgm(h, b, dd, t); nb = math.ceil(v / kgm / 6)
        nome = f"Perfil Ue {h} x {b} x {dd} x {str(t).replace('.', ',')} mm – ASTM A36/ZAR 345 – barra 6 m"
        pre = re.match(r'^(Oficina|Apoio):', d)
        rel('kg', n, f"{m.group(1).strip()} Ue {h}: {qt} kg → {nb} barras de 6 m")
        return [[nome, 'barra 6 m', str(nb), 'E', it[4], f"{br(kgm*6)} kg/barra (seção) · {qt} kg · {(pre.group(1)+': ') if pre else ''}{m.group(1).strip().lower()}"]], [], False
    # tirantes / contraventamentos em kg -> cantoneira L 76x5 barra 6 m
    if u == 'kg' and re.search(r'tirantes|contraventamentos', dl) and not re.search(r'ligações', dl):
        kgm = 5.80; nb = math.ceil(v / kgm / 6)
        rel('kg', n, f"Contraventamentos: {qt} kg → {nb} barras L 76 x 5 de 6 m")
        return [[f"Cantoneira L 76 x 5 mm (3\" x 3/16\") – ASTM A36 – barra 6 m", 'barra 6 m', str(nb), 'E', it[4], f"Gerdau: {br(kgm*6)} kg/barra · {qt} kg · contraventamentos/tirantes"]], [], False
    if u == 'kg' and re.search(r'tirantes, contraventamentos e ligações', dl):
        kgm = 5.80; nb = math.ceil(v * .6 / kgm / 6)
        rel('kg', n, f"Contraventamentos e ligações: {qt} kg → {nb} barras L 76 x 5 + chapas")
        return [[f"Cantoneira L 76 x 5 mm (3\" x 3/16\") – ASTM A36 – barra 6 m", 'barra 6 m', str(nb), 'E', it[4], f"Gerdau: {br(kgm*6)} kg/barra · 60% de {qt} kg"],
                [f"Chapa de aço ASTM A36 para ligações e enrijecedores", 'kg', brk(v * .4), 'E', None, 'chapa vendida por peso · 40% do item']], [], False
    if u == 'kg' and re.search(r'ligações, enrijecedores e parafusos', dl):
        rel('kg', n, f"Ligações: {qt} kg → chapa (parafusos já em Insumos)")
        return [[f"Chapa de aço ASTM A36 para ligações e enrijecedores", 'kg', qt, 'E', it[4], 'chapa vendida por peso · parafusos estão em Insumos (obra 00)']], [], False
    # pilaretes: o peso vira barras (1 peça por barra de 12 m)
    if u == 'kg' and re.search(r'peso dos pilaretes', dl):
        irm = [x for x in g[1] if re.search(r'pilaretes de aço W', x[0])]
        if irm:
            mm = re.search(r'W (\d+) x ([\d,]+)', irm[0][0]); un = int(num(irm[0][2]))
            pf = f"W {mm.group(1)} x {mm.group(2)}"
            rel('kg', n, f"Pilaretes {pf}: {qt} kg → {un} barras de 12 m")
            return [[f"Perfil {pf} – ASTM A572 Gr.50 – barra 12 m", 'barra 12 m', str(un), 'M', it[4], f"Gerdau: {br(num(mm.group(2))*12)} kg/barra · {qt} kg · pilaretes da frente (1 peça por barra)"]], [], False
    if re.search(r'pilaretes de aço W', d) and u == 'un':
        return [], [[d, u, qt, it[3], None, 'peças fabricadas com as barras da Compras']], False
    # areia filtrante kg -> saco 25 kg
    if u == 'kg' and re.search(r'carga de areia', dl):
        ns = math.ceil(v / 25)
        rel('kg', n, f"Areia filtrante: {qt} kg → {ns} sacos de 25 kg")
        return [[limpa_desc(d)[0] + ' – saco 25 kg', 'saco 25 kg', str(ns), it[3], it[4], f"{qt} kg"]], [], False
    # tubos com 'compra: N barras/bobinas/peças'
    m = re.search(r'–\s*compra:\s*(\d+)\s*(barras|bobinas|peças)\s*([\d,]+ m)', d)
    if m and u == 'm':
        un = {'barras': 'barra', 'bobinas': 'bobina', 'peças': 'peça'}[m.group(2)] + ' ' + m.group(3)
        base = d[:m.start()].strip()
        rel('un', n, f"{base[:50]}: {qt} m → {m.group(1)} {un}")
        return [[f"{base} – {un}", un, m.group(1), it[3], it[4], f"{qt} m de rede"]], [], False
    # tela soldada painel: só limpa e mostra peso
    m = re.match(r'Tela soldada (Q-\d+) painel 2,45 x 6,00 m', d)
    if m and u == 'painel':
        kgp = TELA.get(m.group(1), 0) * PAINEL
        _, nt = limpa_desc(d)
        uso = d[m.end():].strip(' –')
        uso = NOTA_PAR.sub('', uso).strip()
        return [[f"Tela soldada {m.group(1)} – painel 2,45 x 6,00 m", 'painel', qt, it[3], it[4], f"Gerdau: {br(kgp)} kg/painel · {uso}"]], [], False
    # telha: m², 1 m de largura útil, 0,65 mm
    if re.search(r'telha zipada', dl) and u == 'm²':
        _, nt = limpa_desc(d)
        termo = 'termoacústica com lã de vidro' if re.search(r'lã de vidro', dl) else ('termoacústica' if 'termoac' in dl and 'opcional' not in dl else '')
        onde = re.split(r'\s+–\s+', d, 1)[1] if ' – ' in d else ''
        onde = re.sub(r'^(Apoio|Oficina|Abrigo de resíduos|Resíduos):\s*', '', NOTA_PAR.sub('', onde)).strip()
        pre = re.match(r'^(Apoio|Oficina|Abrigo de resíduos|Resíduos):', d)
        rel('telha', n, f"{d[:60]} → telha 0,65 mm, m² (1 m útil)")
        return [[f"Telha zipada{(' ' + termo) if termo else ''} – aço 0,65 mm – largura útil 1,00 m", 'm²', qt, it[3], it[4],
                 ' · '.join([x for x in [(pre.group(1) if pre else ''), onde] + nt if x])]], [], False
    # steel deck: produto em m², aguardando exemplo de unidade de venda
    if re.match(r'steel deck', dl):
        _, nt = limpa_desc(d)
        return [[f"Steel deck MF-75 – chapa 0,80 mm", 'm²', qt, it[3], it[4], ' · '.join(nt + ['UNIDADE DE VENDA A CONFIRMAR (exemplo do fornecedor)'])]], [], False
    # concreto: produto 'Concreto usinado' fica; elemento vai para execução (e soma no concreto da obra)
    if u == 'm³' and PROD_CONC.search(d):
        dd, nt = limpa_desc(d)
        return [[re.sub(r'\s*\(.*$', '', dd) + ('' if 'bombe' not in dl else ' – bombeável'), 'm³', qt, it[3], it[4], ' · '.join(nt + ([re.search(r'\((.*)\)', dd).group(1)] if '(' in dd else []))]], [], False
    if u == 'm³' and re.search(r'concreto|lastro|viga baldrame|lajes de piso|contrapiso armado|mureta|bases de filtros', dl):
        return 'CONC', [[d, u, qt, it[3], None, '']], False
    # execução genérica
    if EXE.match(d) and u in ('m²', 'm³', 'm', 'vb'):
        return [], [[d, u, qt, it[3], None, '']], False
    # produto: só limpa a descrição
    dd, nt = limpa_desc(d)
    return [[dd, u, qt, it[3], it[4], ' · '.join(nt)]], [], False

# ---------- 1) consertar linhas quebradas (continuação de PDF) ----------
fix = 0
for n, ps in D['mat'].items():
    for p in ps:
        for g in p['g']:
            out = []
            for it in g[1]:
                if it[1] not in V_UN and out:
                    m = re.match(r'^(.*?)\s+(un|m|m²|kg|cj)\s+([\d.,]+)\b\s*(.*)$', it[0])
                    if m and not re.search(r'condutores|pós-instalado', it[0]):
                        out.append([m.group(1) + ((' ' + m.group(4)) if m.group(4) and len(m.group(4)) < 40 else ''), m.group(2), m.group(3), it[3] if len(it) > 3 else 'E', it[4] if len(it) > 4 else None])
                    else:
                        out[-1] = list(out[-1]); out[-1][0] = out[-1][0] + ' ' + it[0] + ' ' + it[1] + ' ' + it[2]
                    fix += 1; continue
                out.append(it)
            g[1] = out
rel('fix', '', f"{fix} linhas quebradas da lista juntadas/corrigidas")

# ---------- 2) obra 00: insumos limpos ----------
INS = json.load(open('/mnt/project-files/aco-construcao/adendos/insumos.json'))['ins']
for p in D['mat']['00']:
    if p['s'] == 'estrutura-metalica':
        old = {}
        for g in p['g']:
            for it in g[1]: old[it[0][:25]] = it[4]
        gs = []
        for nome, linhas in INS:
            its = []
            for l in linhas:
                if l[1] == '—' or not l[2]: continue
                d, u, qv, em, ob = l
                if 'MIG ER70S' in d: d, u, qv, ob = 'Arame de solda MIG ER70S-6 Ø 1,2 mm – ESAB ou Lincoln – rolo 15 kg', 'rolo 15 kg', int(ob.split()[0]), f"{qv} kg"
                elif 'Eletrodo revestido' in d: n_l = int(ob.split()[0]); d, u, qv, ob = d.replace(' (lata 20 kg)', '') + ' – lata 20 kg', 'lata 20 kg', n_l, f"{qv} kg"
                its.append([d, u, str(qv), em, old.get(d[:25]), ob])
            gs.append([nome.split(' – ')[0].split(' (')[0].capitalize(), its])
        p['g'] = gs
        rel('fix', '00', 'Insumos de fabricação refeitos pela tabela original (solda em rolos/latas)')

# ---------- 3) conversão item a item ----------
EXEC = {}
tot = collections.Counter()
for n, ps in D['mat'].items():
    exe_parts = []
    conc = collections.defaultdict(float)   # fck -> m³ (da obra) para elementos sem 'concreto usinado' no grupo
    for p in ps:
        ng = []; eg = []
        for g in p['g']:
            tem_usinado = any(PROD_CONC.search(x[0]) for x in g[1] if x[1] == 'm³')
            # perfis do R02 substituem os perfis da lista
            gname = g[0]
            if p['s'] == 'estrutura-metalica' and re.search(r'Perfis', gname):
                key = n if not gname.startswith('Bloco de fundo') else '01b'
                novos = perfil_itens(key)
                if novos:
                    velhos = [x for x in g[1] if 'Perfil laminado' in x[0]]
                    for x in velhos: rel('kg', n, f"{limpa_desc(x[0])[0][:45]}: {x[2]} kg")
                    rel('kg', n, f"→ perfis trocados por {sum(int(x[2]) for x in novos)} barras do plano de corte R02")
                    resto = [x for x in g[1] if 'Perfil laminado' not in x[0]]
                    g = [gname, resto]
                    ng_items = novos
                else: ng_items = []
            else: ng_items = []
            pg = list(ng_items); xg = []
            for it in g[1]:
                it = list(it) + [None] * (5 - len(it))
                pr, ex, info = conv_item(n, ps, p, g, it)
                if pr == 'CONC':
                    if not tem_usinado: conc[fck(it[0])] += num(it[2]) or 0
                    xg += ex; tot['exe'] += 1; continue
                pg += pr; xg += ex
                if info: tot['dup'] += 1
                if ex and not pr: tot['exe'] += 1
            if pg: ng.append([gname, pg])
            if xg: eg.append([gname, xg])
        p['g'] = ng
        if eg: exe_parts.append({'p': p['p'], 's': p['s'], 'f': p['f'], 'g': eg})
    if conc:
        civ = next((p for p in ps if p['s'] in ('obra-civil', 'fundacao')), None)
        linhas = [[f"Concreto usinado fck {k} MPa" if k != 'magro' else 'Concreto magro (fck 10 MPa)', 'm³', br(math.ceil(v * 1.05 * 2) / 2), 'E', None, f"soma dos elementos da aba Execução + 5% de perda ({br(v)} m³)"] for k, v in sorted(conc.items())]
        if civ is None:
            civ = {'p': 'Obra civil', 's': 'obra-civil', 'f': 'Civil', 'g': []}; ps.append(civ)
        civ['g'].append(['Concreto (compra)', linhas])
        rel('conc', n, ', '.join(f"fck {k}: {br(v)} m³" for k, v in conc.items()))
    D['mat'][n] = [p for p in ps if p['g']]
    if exe_parts: EXEC[n] = exe_parts
D['exe'] = EXEC
# nota no item: posição 5
json.dump(D, open(S + '/site/data.json', 'w'), ensure_ascii=False, separators=(',', ':'))
json.dump({k: v for k, v in REL.items()}, open(S + '/limpa_rel.json', 'w'), ensure_ascii=False, indent=1)
np = sum(len(g[1]) for ps in D['mat'].values() for p in ps for g in p['g'])
ne = sum(len(g[1]) for ps in EXEC.values() for p in ps for g in p['g'])
print('produtos', np, 'execução', ne, {k: len(v) for k, v in REL.items()})
