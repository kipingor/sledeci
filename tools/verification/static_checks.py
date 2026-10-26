import re,glob,os,sys,json
root=sys.argv[1]; os.chdir(root)
# PSR-4 map: App\ => app/, plus packages
psr={'App\\':'app/','Database\\Seeders\\':'database/seeders/','Database\\Factories\\':'database/factories/','Tests\\':'tests/'}
for pj in glob.glob('packages/*/composer.json'):
    c=json.load(open(pj)); base=os.path.dirname(pj)
    for ns,d in c.get('autoload',{}).get('psr-4',{}).items(): psr[ns]=os.path.join(base,d)+'/'
def resolve(fq):
    for ns,d in sorted(psr.items(),key=lambda x:-len(x[0])):
        if fq.startswith(ns): return os.path.exists(d+fq[len(ns):].replace('\\','/')+'.php')
    return None
miss={}
for r in ('app','tests','routes','database','config','bootstrap','packages'):
    for f in glob.glob(f'{r}/**/*.php',recursive=True):
        if 'php-cs' in f or '/vendor/' in f: continue
        s=open(f).read()
        for u in re.findall(r'^use ((?:App|Database|Tests|Sledeci)\\[A-Za-z0-9_\\]+)(?: as \w+)?;',s,re.M):
            ok=resolve(u)
            if ok is False: miss.setdefault(u,[]).append(f)
print('unresolved imports:',len(miss))
for u,fs in sorted(miss.items()): print('  ',u,'<-',fs[0])
# route targets
ctrl={}
for f in glob.glob('app/Http/Controllers/**/*.php',recursive=True)+glob.glob('packages/*/src/**/*.php',recursive=True):
    s=open(f).read(); m=re.search(r'namespace ([^;]+);',s); c=re.search(r'\bclass (\w+)',s)
    if m and c: ctrl[m.group(1)+'\\'+c.group(1)]=set(re.findall(r'function (\w+)\(',s))
probs=[];n=0
for rf in glob.glob('routes/**/*.php',recursive=True)+glob.glob('packages/*/routes/*.php'):
    if 'php-cs' in rf: continue
    s=open(rf).read(); uses=dict((u.split('\\')[-1],u) for u in re.findall(r'^use ([^;]+);',s,re.M))
    for cn,meth in re.findall(r"\[(\w+)::class,\s*'(\w+)'\]",s):
        n+=1; fq=uses.get(cn)
        if fq not in ctrl: probs.append((rf,cn,meth,'class')); continue
        if meth not in ctrl[fq]: probs.append((rf,cn,meth,'method'))
    for cn in re.findall(r"Route::(?:resource|apiResource)\([^,]+,\s*(\w+)::class",s):
        n+=1
        if uses.get(cn) not in ctrl: probs.append((rf,cn,'*','class'))
print('route targets checked:',n,'| problems:',len(probs)); [print('  ',p) for p in probs]
