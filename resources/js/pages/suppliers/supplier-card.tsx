import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Link } from '@inertiajs/react';

export default function SupplierCard({ supplier }: { supplier: any }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{supplier.name}</CardTitle>
            </CardHeader>
            <CardContent>
                <p>{supplier.description}</p>
            </CardContent>
            <CardFooter>
                <Button>View</Button>
            </CardFooter>
        </Card>
    );
}