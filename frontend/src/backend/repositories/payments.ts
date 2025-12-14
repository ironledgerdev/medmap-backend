import { api } from '../../lib/django-api';

export const PaymentsRepo = {
    async listTransactions() {
        const response = await api.request('/payments/transactions/', {
            method: 'GET'
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to fetch transactions');
        }
        return response.json();
    },

    async initiateBookingPayment(bookingId: string | number, amount: number) {
        const response = await api.request('/payments/payfast/initiate/', {
            method: 'POST',
            body: JSON.stringify({
                amount: amount,
                item_name: `Booking #${bookingId}`,
                booking_id: bookingId
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to initiate payment');
        }
        
        return response.json();
    },

    async initiateMembershipPayment(membershipId: string | number, amount: number, plan: string) {
        // Not strictly needed if Memberships.tsx handles it differently, but good for consistency
        // But Memberships.tsx likely uses a different flow or similar flow.
        // For now, let's just support booking.
        return null; 
    }
};
