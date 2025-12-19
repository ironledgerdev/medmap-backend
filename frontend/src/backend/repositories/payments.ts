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
        
        // Ensure we have the data before submitting
        if (data.payment_url && data.payment_data) {
            // Use setTimeout to ensure the form submission happens after this function returns
            setTimeout(() => {
                this.submitPayFastForm(data.payment_url, data.payment_data);
            }, 0);
        } else {
            throw new Error('Invalid payment response from server');
        }
        
        return data;
    },

    async initiateMembershipPayment(plan: string) {
        console.log('🚀 Starting membership payment for plan:', plan);
        
        const response = await api.request('/payments/membership/', {
            method: 'POST',
            body: JSON.stringify({
                plan: plan
            })
        });
        
        console.log('📡 Response status:', response.status);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to initiate membership payment');
        }
        
        const data = await response.json();
        console.log('📦 Payment data received:', data);
        
        // Ensure we have the data before submitting
        if (data.payment_url && data.payment_data) {
            console.log('✅ Valid payment data, creating form...');
            // Use setTimeout to ensure the form submission happens after this function returns
            setTimeout(() => {
                this.submitPayFastForm(data.payment_url, data.payment_data);
            }, 100); // Increased to 100ms to ensure render completes
        } else {
            console.error('❌ Invalid payment response:', data);
            throw new Error('Invalid payment response from server');
        }
        
        return data;
    },

    // Helper function to create and submit PayFast form
    submitPayFastForm(paymentUrl: string, paymentData: Record<string, string>) {
        console.log('🔐 Submitting PayFast form to:', paymentUrl);
        console.log('📋 Payment data keys:', Object.keys(paymentData));
        
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = paymentUrl;
        form.style.display = 'none'; // Hide the form
        
        // Add all payment data as hidden inputs
        Object.entries(paymentData).forEach(([key, value]) => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = value;
            form.appendChild(input);
            console.log(`  ✓ ${key}: ${value.substring(0, 20)}...`);
        });
        
        // Append to body and submit
        document.body.appendChild(form);
        
        console.log('✅ Form created with', Object.keys(paymentData).length, 'fields');
        console.log('🚀 Submitting form now...');
        
        // Submit the form
        form.submit();
        
        console.log('✅ Form submitted successfully');
    }
};
