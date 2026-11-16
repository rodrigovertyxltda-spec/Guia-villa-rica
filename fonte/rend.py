import subprocess,sys,json
from PIL import Image
Image.MAX_IMAGE_PIXELS=None
T='/tmp/claude-0/-home-user/7b5bfe2a-c8d6-58bd-9011-9bfeed4ceb67/scratchpad/espr/r'
def info(f):
    o=subprocess.run(['pdfinfo',f],capture_output=True,text=True).stdout
    n=int([l for l in o.splitlines() if l.startswith('Pages')][0].split()[1])
    w=float([l for l in o.splitlines() if l.startswith('Page size')][0].split()[2]);return n,w
def render(key,f,pg,n,w):
    W=3000 if w>1000 else (1546 if w<700 else 2400)
    dpi=max(60,round(W/(w/72)))
    subprocess.run(['pdftoppm','-r',str(dpi),'-png','-singlefile','-f',str(pg),'-l',str(pg),f,T],check=True)
    im=Image.open(T+'.png').convert('RGB')
    def rs(x):return im.resize((x,round(im.size[1]*x/im.size[0])),Image.LANCZOS)
    rs(W).save(f'site/p/{key}-{n}.jpg',quality=82)
    rs(min(2600,W)).save(f'pwa/p/{key}-{n}.webp',quality=80)
    if n==1: rs(320).save(f'pwa/pt/{key}-1.webp',quality=75)
