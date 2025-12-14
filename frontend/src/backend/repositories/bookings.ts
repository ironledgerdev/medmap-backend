import { api } from '../../lib/django-api';
import { Doctor } from './doctors';

export interface Booking {
  id: number;
  user: number;
  doctor: number;
  doctor_details?: Doctor;
  appointment_date: string;
  appointment_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export const BookingsRepo = {
  async getById(id: string) {
    try {
        const response = await api.request(`/bookings/bookings/${id}/`);
        if (!response.ok) return null;
        return response.json() as Promise<Booking>;
    } catch (e) {
        return null;
    }
  },

  async listAll() {
    const response = await api.request(`/bookings/bookings/?ordering=-created_at`);
    if (!response.ok) throw new Error('Failed to fetch bookings');
    const data = await response.json();
    return (data.results || data) as Booking[];
  },

  async listForUser(userId: string) {
    const response = await api.request(`/bookings/bookings/?user=${userId}&ordering=-created_at`);
    if (!response.ok) throw new Error('Failed to fetch bookings');
    const data = await response.json();
    return (data.results || data) as Booking[];
  },

  async listForDoctor(doctorId: string) {
    const response = await api.request(`/bookings/bookings/?doctor=${doctorId}&ordering=-created_at`);
    if (!response.ok) throw new Error('Failed to fetch bookings');
    const data = await response.json();
    return (data.results || data) as Booking[];
  },

  async countForDoctor(doctorId: string) {
    // Django REST Framework pagination usually includes 'count' in the response
    const response = await api.request(`/bookings/bookings/?doctor=${doctorId}&limit=1`);
    if (!response.ok) throw new Error('Failed to count bookings');
    const data = await response.json();
    return data.count || 0;
  },

  async create(payload: Partial<Booking>) {
    const response = await api.request('/bookings/bookings/', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Failed to create booking');
    return response.json();
  },

  async update(id: string, update: Partial<Booking>) {
    const response = await api.request(`/bookings/bookings/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(update)
    });
    if (!response.ok) throw new Error('Failed to update booking');
    return response.json();
  },

  async getTakenSlots(doctorId: string, date: string) {
    const response = await api.request(`/bookings/bookings/taken_slots/?doctor=${doctorId}&date=${date}`);
    if (!response.ok) throw new Error('Failed to fetch taken slots');
    const data = await response.json();
    return data.taken_slots || [];
  },

  async hasConflict(doctorId: string, date: string, time: string) {
    try {
        const takenSlots = await this.getTakenSlots(doctorId, date);
        // takenSlots is array of strings (times)
        // Check if time matches any slot
        // time input: "HH:MM"
        // slots: "HH:MM:SS" usually
        return takenSlots.some((slot: string) => slot.startsWith(time) || time.startsWith(slot.substring(0, 5)));
    } catch (e) {
        console.error('Error checking conflict', e);
        return false; // Or true to be safe?
    }
  },
};
