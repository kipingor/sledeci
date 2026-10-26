import re,glob,json,os
def parse(files):
    out=[]
    for rf in files:
        s=open(rf).read()
        # strip comments
        s=re.sub(r'/\*.*?\*/','',s,flags=re.S); s=re.sub(r'(?m)^\s*//.*$','',s)
        # tokenise statements: split on ';' and group openers
        i=0; stack=[]  # (prefix,name)
        # find statements
        pos=0
        tokens=re.finditer(r"Route::[^;{]*?(?:->group\(function\s*\(\)\s*\{)|\}\);|Route::[^;]*;",s,re.S)
        for m in tokens:
            t=m.group(0)
            if t.startswith('});'):
                if stack: stack.pop()
                continue
            if '->group(function' in t:
                pre=re.search(r"prefix\('([^']*)'\)",t); nm=re.search(r"name\('([^']*)'\)",t)
                stack.append(((pre.group(1).strip('/') if pre else ''),(nm.group(1) if nm else '')))
                continue
            vm=re.match(r"Route::(get|post|put|patch|delete|any)\(\s*'([^']*)'\s*,\s*\[(\w+)::class,\s*'(\w+)'\]\)(.*)",t,re.S)
            if vm:
                verb,uri,c,a,rest=vm.groups()
                nm=re.search(r"->name\('([^']*)'\)",rest)
                full='/'.join([p for p,_ in stack if p]+[uri.strip('/')]).strip('/')
                name=''.join(n for _,n in stack)+(nm.group(1) if nm else '')
                out.append(dict(verb=verb.upper(),uri='/'+full,controller=c,action=a,name=name,file=rf))
                continue
            rm=re.match(r"Route::(resource|apiResource)\(\s*'([^']*)'\s*,\s*(\w+)::class",t)
            if rm:
                kind,uri,c=rm.groups()
                full='/'.join([p for p,_ in stack if p]+[uri.strip('/')])
                out.append(dict(verb='RESOURCE',uri='/'+full,controller=c,action='*',name='',file=rf))
    return out
