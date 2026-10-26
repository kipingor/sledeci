import re,glob,os,sys
root=sys.argv[1] if len(sys.argv)>1 else '.'
os.chdir(root)
def block(src,start):
    i=src.index('{',start); d=0
    for j in range(i,len(src)):
        d+= (src[j]=='{') - (src[j]=='}')
        if d==0: return src[i+1:j]
cols={}
NOTCOL={'index','unique','primary','foreign','dropColumn','dropIndex','dropUnique','dropForeign','dropPrimary','renameColumn','renameIndex','fullText','spatialIndex','dropSoftDeletes','dropTimestamps','dropRememberToken','dropMorphs','comment','after','constrained','references','on','charset','collation','engine','default','useCurrent','nullable','change','hasColumn','hasTable'}
TYPE=r"(?:string|text|longText|mediumText|tinyText|integer|unsignedInteger|bigInteger|unsignedBigInteger|tinyInteger|unsignedTinyInteger|smallInteger|mediumInteger|boolean|date|dateTime|dateTimeTz|timestamp|timestampTz|time|decimal|unsignedDecimal|float|double|json|jsonb|uuid|ulid|enum|set|char|binary|year|foreignId|foreignUuid|ipAddress|macAddress|geometry|point)"
for f in sorted(glob.glob('database/migrations/*.php')+glob.glob('packages/*/database/migrations/*.php'),key=os.path.basename):
    s=open(f).read()
    s=s.split('public function down')[0]
    for m in re.finditer(r"Schema::(create|table)\(\s*'(\w+)'\s*,\s*function\s*\(Blueprint \$\w+\)",s):
        t=m.group(2); b=block(s,m.end()); c=cols.setdefault(t,set())
        for meth,n in re.findall(r"\$\w+->(\w+)\(\s*'(\w+)'",b):
            if meth not in NOTCOL: c.add(n)
        if re.search(r"->id\(\)",b): c.add('id')
        if re.search(r"->timestamps\(\)",b): c|={'created_at','updated_at'}
        if re.search(r"->softDeletes\(\)",b): c.add('deleted_at')
        if re.search(r"->rememberToken\(\)",b): c.add('remember_token')
        for n in re.findall(r"(?:morphs|nullableMorphs|uuidMorphs)\(\s*'(\w+)'",b): c|={n+'_id',n+'_type'}
        for a,bn in re.findall(r"renameColumn\(\s*'(\w+)'\s*,\s*'(\w+)'",b): c.discard(a); c.add(bn)
        for n in re.findall(r"dropColumn\(\s*'(\w+)'",b): c.discard(n)
def plural(n):
    s=re.sub(r'(?<!^)([A-Z])',r'_\1',n).lower()
    if s.endswith('y') and s[-2] not in 'aeiou': return s[:-1]+'ies'
    if s.endswith(('s','x','ch','sh')): return s+'es'
    return s+'s'
allow={'ProjectLessonsLearned','ProjectMilestone','ProjectTask'}
bad=[];checked=0
for f in sorted(glob.glob('app/Models/*.php')+glob.glob('packages/*/src/Models/*.php')):
    s=open(f).read(); n=os.path.basename(f)[:-4]
    if n in allow or re.search(r'\babstract class',s): continue
    fm=re.search(r"\$fillable\s*=\s*\[(.*?)\];",s,re.S)
    if not fm: continue
    body=re.sub(r'//[^\n]*','',fm.group(1)); body=re.sub(r'/\*.*?\*/','',body,flags=re.S)
    fill=re.findall(r"'(\w+)'",body)
    tm=re.search(r"\$table\s*=\s*'(\w+)'",s); t=tm.group(1) if tm else plural(n)
    if t not in cols: bad.append((n,t,'NO TABLE')); continue
    checked+=1
    miss=[x for x in fill if x not in cols[t]]
    if miss: bad.append((n,t,miss))
print('models checked:',checked,'| problems:',len(bad))
for b in bad: print(' ',b)
