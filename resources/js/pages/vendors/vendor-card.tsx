import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Link } from '@inertiajs/react';

export default function VendorCard({ vendor }: { vendor: any }) {
    return (
        <Card  className="border-0 bg-linear-to-br from-card to-card/50 shadow-sm transition-shadow duration-300 hover:shadow-lg">
            <CardHeader className='pd-4'>
                <CardTitle className='text-lg font-semibold'>
                    {vendor.name ?? 'no name yet'}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">{vendor.email}</p>
                <p className="mt-2 line-clamp-3 text-sm">{vendor.phone}</p>
                <p className="mt-2 line-clamp-3 text-sm">{vendor.address}</p>
            </CardContent>
        </Card>
    );
}