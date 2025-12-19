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
        const response = await api.request('/payments/initiate/', {
            method: 'POST',
            body: JSON.stringify({
                amount: amount,
                description: `Booking #${bookingId}`,
                booking_id: bookingId
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to initiate payment');
        }
        
        const data = await response.json();
        
        // Create form and submit to PayFast
        this.submitPayFastForm(data.payment_url, data.payment_data);
        
        return data;
    },

    async initiateMembershipPayment(plan: string) {
        const response = await api.request('/payments/membership/', {
            method: 'POST',
            body: JSON.stringify({
                plan: plan
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to initiate membership payment');
        }
        
        const data = await response.json();
        
        // Create form and submit to PayFast
        this.submitPayFastForm(data.payment_url, data.payment_data);
        
        return data;
    },

    // Helper function to create and submit PayFast form
    submitPayFastForm(paymentUrl: string, paymentData: Record<string, string>) {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = paymentUrl;
        
        // Add all payment data as hidden inputs
        Object.entries(paymentData).forEach(([key, value]) => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = value;
            form.appendChild(input);
        });
        
        // Append to body and submit
        document.body.appendChild(form);
        form.submit();
    }
};
