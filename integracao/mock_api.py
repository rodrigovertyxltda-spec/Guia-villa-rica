# Servidor de exemplo do contrato de integração (só para teste e referência)
import json,datetime
from http.server import BaseHTTPRequestHandler,HTTPServer
REG={};SEQ={'ocs':1,'cotacoes':0};ARQ={}
now=lambda:datetime.datetime.utcnow().isoformat()+'Z'
class H(BaseHTTPRequestHandler):
    def cors(self):
        self.send_header('Access-Control-Allow-Origin','*');self.send_header('Access-Control-Allow-Headers','Authorization, Content-Type');self.send_header('Access-Control-Allow-Methods','GET, POST, OPTIONS')
    def js(self,o,c=200):
        b=json.dumps(o).encode();self.send_response(c);self.cors();self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(b)
    def do_OPTIONS(self):self.send_response(204);self.cors();self.end_headers()
    def auth(self):
        if self.headers.get('Authorization')!='Bearer teste':self.js({'erro':'auth'},401);return False
        return True
    def do_GET(self):
        if not self.auth():return
        if self.path.startswith('/status'):return self.js({'ok':True})
        if self.path.startswith('/registros'):
            d=self.path.split('desde=')[1] if 'desde=' in self.path else ''
            from urllib.parse import unquote;d=unquote(d)
            return self.js({'registros':[r for r in REG.values() if r['atualizado']>d],'agora':now()})
        self.js({},404)
    def do_POST(self):
        if not self.auth():return
        n=int(self.headers.get('Content-Length') or 0);body=self.rfile.read(n)
        if self.path.startswith('/sequencia/'):
            t=self.path.split('/')[-1];SEQ[t]=SEQ.get(t,0)+1;return self.js({'num':datetime.date.today().strftime('%d%m%y')+'-%02d'%SEQ[t]})
        if self.path=='/arquivos':ARQ[len(ARQ)]=n;return self.js({'id':str(len(ARQ)),'url':'https://servidor.exemplo/arquivos/'+str(len(ARQ))})
        if self.path=='/registros':
            j=json.loads(body);ids=[]
            for r in j['registros']:r['atualizado']=now();r['dispositivo']=j['dispositivo'];REG[r['colecao']+'/'+r['id']]=r;ids.append(r['id'])
            return self.js({'ok':ids})
        self.js({},404)
    def log_message(self,*a):pass
HTTPServer(('127.0.0.1',8768),H).serve_forever()
