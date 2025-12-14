import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DollarSign } from 'lucide-react';

export interface PaymentTransaction {
    id: number;
    user_name: string;
    user_email: string;
    amount: string;
    status: string;
    transaction_type: string;
    description: string;
    created_at: string;
    reference: string;
}

interface PaymentsTableProps {
    transactions: PaymentTransaction[];
    isLoading: boolean;
}

export const PaymentsTable = ({ transactions, isLoading }: PaymentsTableProps) => {
    return (
        <Card className="medical-hero-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Transaction History
                </CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="text-center py-8">Loading...</div>
                ) : transactions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No transactions found</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Reference</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions.map((tx) => (
                                <TableRow key={tx.id}>
                                    <TableCell>{new Date(tx.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell>
                                        <div className="font-medium">{tx.user_name}</div>
                                        <div className="text-xs text-muted-foreground">{tx.user_email}</div>
                                    </TableCell>
                                    <TableCell className="capitalize">{tx.transaction_type}</TableCell>
                                    <TableCell>R{parseFloat(tx.amount).toFixed(2)}</TableCell>
                                    <TableCell>
                                        <Badge variant={
                                            tx.status === 'complete' ? 'default' :
                                            tx.status === 'pending' ? 'outline' : 'destructive'
                                        } className={
                                            tx.status === 'complete' ? 'bg-green-600' :
                                            tx.status === 'pending' ? 'text-amber-600 border-amber-600' : ''
                                        }>
                                            {tx.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs font-mono">{tx.reference || '-'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
};
