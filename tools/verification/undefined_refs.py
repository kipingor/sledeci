"""Find unqualified class names used in a PHP file that are neither imported, declared in the
same namespace, nor globally available. Static approximation; compare two trees to isolate regressions."""
import re,glob,os,sys,json
root=sys.argv[1]; os.chdir(root)
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__))); from movetool import strip_code,declared,php_files
files=[f for f in php_files(root) if '/tests/' not in f and '/database/migrations/' not in f]
idx={}
for f in php_files(root):
    s=open(f).read(); ns,cl=declared(s)
    if ns and cl: idx.setdefault(ns,set()).add(cl)
GLOBAL=set('''self static parent Closure Exception Throwable RuntimeException InvalidArgumentException LogicException DomainException
DateTime DateTimeImmutable DateTimeInterface DateInterval DatePeriod Stringable ArrayAccess Countable IteratorAggregate Iterator Traversable JsonSerializable
Generator ReflectionClass ReflectionMethod ReflectionNamedType ReflectionProperty ZipArchive PDO PDOException SplFileInfo Attribute UnitEnum BackedEnum
ArrayObject ArrayIterator Error TypeError ValueError OutOfBoundsException BadMethodCallException UnexpectedValueException Random NumberFormatter IntlDateFormatter Locale
Auth Cache Config DB Event File Gate Hash Http Lang Log Mail Notification Password Queue Redirect Request Response Route Schema Session Storage URL Validator View Str Arr Schedule Artisan Bus Cookie Crypt Date Process RateLimiter Vite Inertia
'''.split())
KW=set('self static parent true false null int string float bool array mixed void never object iterable callable'.split())
pat=re.compile(r'(?:(?<![\w\\$>:])new\s+|(?<![\w\\$>:]))([A-Z]\w*)(?=::|\s*\(|\s+\$|\s*\|\s*[A-Z\w]|\)?\s*\{|;|,|\)\s*:|\s*&)')
def check(f):
    s=open(f).read(); ns,cl=declared(s)
    code=strip_code(s)
    imports={}
    for m in re.finditer(r'^use ([A-Za-z0-9_\\]+)(?: as (\w+))?;',s,re.M):
        imports[m.group(2) or m.group(1).split('\\')[-1]]=m.group(1)
    for m in re.finditer(r'^use ([A-Za-z0-9_\\]+)\\\{([^}]*)\}',s,re.M):
        for p in m.group(2).split(','): imports[p.strip().split(' as ')[-1]]=1
    body=re.sub(r'^(?:use|namespace) [^\n]*\n','',code,flags=re.M)
    used=set()
    for m in re.finditer(r'(?<![\w\\$>:])(?:new\s+)?([A-Z][A-Za-z0-9_]*)(?=::|\()',body): used.add(m.group(1))
    for m in re.finditer(r'(?:extends|implements|instanceof)\s+([A-Z]\w*)',body): used.add(m.group(1))
    for m in re.finditer(r'function\s+\w+\([^)]*\)',body):
        for t in re.findall(r'(?:\?|\||\(|,)\s*([A-Z]\w*)\s+\$',m.group(0)): used.add(t)
    for m in re.finditer(r'\)\s*:\s*\??([A-Z]\w*)',body): used.add(m.group(1))
    # trait uses inside class
    for m in re.finditer(r'^\s+use ([A-Z][\w, ]*);',body,re.M):
        for t in m.group(1).split(','): used.add(t.strip())
    bad=[]
    for n in used:
        if n in imports or n in GLOBAL or n in KW or n==cl: continue
        if n in idx.get(ns,set()): continue
        bad.append(n)
    return sorted(set(bad))
res={}
for f in files:
    b=check(f)
    if b: res[os.path.relpath(f,root)]=b
json.dump(res,open(sys.argv[2],'w'),indent=1)
print(root.split('/')[-1],'files with suspect names:',len(res),'| total suspect names:',sum(len(v) for v in res.values()))
