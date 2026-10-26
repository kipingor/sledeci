import re,glob,os,sys,json
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from routes_parse import parse
os.chdir(sys.argv[1])
files=['routes/web.php','routes/site.php']+glob.glob('routes/domain/*.php')+glob.glob('packages/*/routes/web.php')
names=set()
for r in parse(files):
    if not r['name']: continue
    n=r['name']
    if r['file'].startswith('routes/domain') or r['file'].startswith('packages/'): n='web.'+n
    names.add(n)
# resource routes expand
for r in parse(files):
    if r['verb']=='RESOURCE':
        base=r['uri'].strip('/').split('/')[-1]
        pre='web.' if (r['file'].startswith('routes/domain') or r['file'].startswith('packages/')) else ''
        for a in ['index','create','store','show','edit','update','destroy']: names.add(f'{pre}{base}.{a}')
fortify={'login','register','logout','password.request','password.email','password.reset','password.store','verification.notice','verification.send','two-factor.login','password.confirm'}
def kebab(x): return re.sub(r'(?<!^)([A-Z])',lambda m:'-'+m.group(1).lower(),x)
bad=[];checked=0
for f in glob.glob('resources/js/**/*.ts*',recursive=True)+glob.glob('packages/*/resources/js/**/*.ts*',recursive=True):
    if any(x in f for x in ('/actions/','/routes/','/wayfinder/')): continue
    s=open(f).read()
    for m in re.finditer(r"import (\*\s+as\s+(\w+)|\{([^}]*)\}|(\w+)) from '@/routes(/[^']*)?'",s):
        path=m.group(5) or ''
        prefix=path.strip('/').replace('/','.')
        if m.group(3):   # named imports
            exps=[e.strip().split(' as ')[0] for e in m.group(3).split(',') if e.strip()]
            for e in exps:
                full=(prefix+'.' if prefix else '')+kebab(e)
                checked+=1
                if full not in names and full not in fortify: bad.append((f,path or '/',e,full))
        elif m.group(2):  # namespace import: check usage members
            alias=m.group(2)
            for e in set(re.findall(r'\b'+alias+r'\.(\w+)',s)):
                full=(prefix+'.' if prefix else '')+kebab(e); checked+=1
                if full not in names: bad.append((f,path,e,full))
print('wayfinder named imports checked:',checked,'| not matching a defined route name:',len(bad))
for b in bad: print('  ',b)
