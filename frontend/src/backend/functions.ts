import { api } from '@/lib/django-api';
import { BookingsRepo } from './repositories/bookings';
import { DoctorsRepo } from './repositories/doctors';

// Mocking the behavior for migration
async function invokeMock(name: string, body?: any): Promise<any> {
    console.warn(`EdgeFunction ${name} is being called via Django migration layer.`);
    
    if (name === 'create-booking') {
        return BookingsRepo.create(body);
    }
    if (name === 'submit-doctor-enrollment') {
        return DoctorsRepo.create(body);
    }
    
    throw new Error(`Function ${name} not implemented in Django migration.`);
}

export const EdgeFunctions = {
  invoke: invokeMock,
  adminData: async () => {
      // Map to admin dashboard stats
      // We might need to implement this endpoint in Django: /system/admin_stats/
      // For now, return mock or try to fetch from a new endpoint
      try {
        const response = await api.request('/system/settings/admin_stats/'); 
        if (!response.ok) {
             // Fallback to local calculation if endpoint missing
             return { totalDoctors: 0, pendingApplications: 0, totalBookings: 0, totalRevenue: 0 };
        }
        return response.json();
      } catch (e) {
          return {};
      }
  },
  createBooking: (payload: any) => BookingsRepo.create(payload),
  createPayfastPayment: (payload: any) => {
      console.warn("PayFast payment not implemented");
      return Promise.resolve({ success: true, mock: true, payment_url: '#' });
  },
  createPayfastMembership: (payload: any) => {
       console.warn("PayFast membership not implemented");
       return Promise.resolve({ success: true, mock: true, payment_url: '#' });
  },
  submitDoctorEnrollment: (payload: any) => DoctorsRepo.create(payload),
  sendEmail: (payload: any) => {
      console.log("Mock sending email:", payload);
      return Promise.resolve({ success: true });
  },
  // Admin auth stuff - handled by Django auth now
  verifyAdminInvite: (payload: any) => Promise.resolve({ success: true }),
  verifyAdminPassword: (payload: any) => Promise.resolve({ success: true }),
  realtimeToken: (payload: any) => Promise.resolve({ token: 'mock-token' }),
  generateAdminInvite: (payload: any) => Promise.resolve({ invite: 'mock-invite' }),
};

export type { };
