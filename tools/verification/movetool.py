"""Move PHP classes between namespaces and fix every reference in the project.

usage (from python): move(root, moves, base_controller=True)
  moves = [ {src:'app/Models/X.php', dst:'packages/p/src/Models/X.php', ns:'Vendor\\P\\Models'} ]
"""
import re,os,glob,json

SKIP=('/vendor/','/node_modules/','php-cs-fixer','/storage/','/bootstrap/cache/')
def php_files(root):
    out=[]
    for d in ('app','database','routes','config','bootstrap','tests','packages'):
        for f in glob.glob(os.path.join(root,d,'**','*.php'),recursive=True):
            if not any(s in f for s in SKIP): out.append(f)
    return out

def strip_code(s):
    s=re.sub(r'/\*.*?\*/','',s,flags=re.S)
    s=re.sub(r'(?m)^\s*//.*$','',s); s=re.sub(r'(?m)\s//[^\n]*$','',s); s=re.sub(r'(?m)^\s*#[^\[\n][^\n]*$','',s)
    s=re.sub(r"'(?:\\.|[^'\\])*'","''",s); s=re.sub(r'"(?:\\.|[^"\\])*"','""',s)
    return s

def declared(s):
    ns=re.search(r'^namespace ([^;]+);',s,re.M); cl=re.search(r'^(?:final |abstract |readonly )*(?:class|interface|trait|enum) (\w+)',s,re.M)
    return (ns.group(1) if ns else None, cl.group(1) if cl else None)

def import_block(s):
    return list(re.finditer(r'^use ([A-Za-z0-9_\\]+)(?: as (\w+))?;[ \t]*\n',s,re.M))

def add_imports(s,fqs,own_ns):
    existing={m.group(1) for m in import_block(s)}
    want=sorted({f for f in fqs if f not in existing and f.rsplit('\\',1)[0]!=own_ns})
    if not want: return s
    ms=import_block(s)
    if ms:
        start,end=ms[0].start(),ms[-1].end()
        block=s[start:end]
        lines=[l for l in block.split('\n') if l.strip()]
        simple=[l for l in lines if re.match(r'^use [A-Za-z0-9_\\]+(?: as \w+)?;$',l)]
        other=[l for l in lines if l not in simple]
        simple+= [f'use {w};' for w in want]
        simple=sorted(set(simple),key=lambda l:l[4:].lower())
        return s[:start]+'\n'.join(simple+other)+'\n'+s[end:]
    m=re.search(r'^namespace [^;]+;\n',s,re.M)
    return s[:m.end()]+'\n'+'\n'.join(f'use {w};' for w in want)+'\n'+s[m.end():]

def move(root,moves,base_controller=False,dry=False):
    root=os.path.abspath(root); os.chdir(root)
    moves=[dict(m,src=os.path.abspath(m['src']),dst=os.path.abspath(m['dst'])) for m in moves]
    files=php_files(root)
    index={}   # fqcn -> path
    by_ns={}   # ns -> {short}
    for f in files:
        s=open(f).read(); ns,cl=declared(s)
        if ns and cl: index[f'{ns}\\{cl}']=f; by_ns.setdefault(ns,set()).add(cl)
    mapping={}; moved_paths={}
    for m in moves:
        s=open(m['src']).read(); ns,cl=declared(s)
        mapping[f'{ns}\\{cl}']=f"{m['ns']}\\{cl}"; moved_paths[m['src']]=m
    old_by_short={}
    for old,new in mapping.items(): old_by_short.setdefault(old.rsplit('\\',1)[0],{})[old.rsplit('\\',1)[1]]=new
    log=[]
    # 1. rewrite every file's text for FQCN references
    new_contents={}
    for f in files:
        s=open(f).read(); orig=s
        for old,new in mapping.items():
            e=re.escape(old)
            s=re.sub(r'(?<![\w\\])(\\?)'+e+r'(?![\w\\])',lambda mm:mm.group(1)+new,s)
            e2=re.escape(old.replace('\\','\\\\'))
            dbl=new.replace('\\','\\\\')
            s=re.sub(r'(?<![\w\\])'+e2+r'(?![\w\\])',lambda mm:dbl,s)
        new_contents[f]=s
    # 2. moved files: namespace, base controller, missing same-namespace imports
    for src,m in moved_paths.items():
        s=new_contents[src]; ns,cl=declared(s)
        s=re.sub(r'^namespace [^;]+;',lambda mm:f"namespace {m['ns']};",s,count=1,flags=re.M)
        if base_controller:
            s=s.replace('use App\\Http\\Controllers\\Controller;','use Sledeci\\Core\\Http\\Controller;')
        code=strip_code(re.sub(r'^use [^\n]*\n','',s,flags=re.M))
        need=[]
        for short in by_ns.get(ns,set()):
            if short==cl: continue
            fq=f'{ns}\\{short}'
            target=mapping.get(fq,fq)
            if target.rsplit('\\',1)[0]==m['ns']: continue       # lands in the same namespace again
            if re.search(r'(?<![\w\\$>:])'+short+r'(?![\w\\])',code) and not re.search(r'^use [^;]*\\'+short+r'(?: as \w+)?;',s,re.M):
                need.append(target)
        # classes that stayed behind but the moved file used through a *different* moved class ns are covered by step 1
        s=add_imports(s,need,m['ns'])
        new_contents[src]=s
        log.append((src,m['dst'],sorted(need)))
    # 3. unmoved files in an old namespace that used moved classes unqualified
    for f in files:
        if f in moved_paths: continue
        s=new_contents[f]; ns,cl=declared(s)
        if ns in old_by_short:
            code=strip_code(re.sub(r'^use [^\n]*\n','',s,flags=re.M))
            need=[new for short,new in old_by_short[ns].items()
                  if re.search(r'(?<![\w\\$>:])'+short+r'(?![\w\\])',code) and not re.search(r'^use [^;]*\\'+short+r'(?: as \w+)?;',s,re.M) and short!=cl]
            if need: s=add_imports(s,need,ns); new_contents[f]=s; log.append((f,'(imports added)',need))
    if dry: return log
    # 4. write
    for f,s in new_contents.items():
        if f in moved_paths: continue
        if s!=open(f).read(): open(f,'w').write(s)
    for src,m in moved_paths.items():
        os.makedirs(os.path.dirname(m['dst']),exist_ok=True)
        open(m['dst'],'w').write(new_contents[src]); os.remove(src)
    return log
