# @sledeci/ui

Shared React UI primitives for the Sledeci suite (shadcn-style components + domain helpers).

## Install

```bash
pnpm add @sledeci/ui
# peer deps
pnpm add react react-dom lucide-react class-variance-authority clsx tailwind-merge
```

## Usage

```tsx
import { Button, Input, Card, StatusBadge, KpiCard, PageHeader } from '@sledeci/ui';

export function Example() {
  return (
    <>
      <PageHeader title="Invoices" description="Manage billing" />
      <KpiCard title="Outstanding" value="KES 120,000" />
      <StatusBadge status="paid" />
      <Button>Save</Button>
    </>
  );
}
```

Tree-shakeable subpath imports are also supported:

```tsx
import { Button } from '@sledeci/ui/button';
```

## Peer dependencies

| Package | Version |
|---------|---------|
| react | ^19 |
| react-dom | ^19 |
| lucide-react | >=0.400 |
| class-variance-authority | >=0.7 |
| clsx | >=2 |
| tailwind-merge | >=2 |

## Note on Tailwind

Components use Tailwind utility classes. Ensure your host app’s Tailwind content paths include the package:

```js
// tailwind.config / @source
content: ['./node_modules/@sledeci/ui/src/**/*.{ts,tsx}']
```

## License

MIT
