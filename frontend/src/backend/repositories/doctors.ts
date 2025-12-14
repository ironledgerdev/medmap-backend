import { api } from '../../lib/django-api';

export interface Doctor {
  id: number;
  user: number;
  first_name: string;
  last_name: string;
  email: string;
  practice_name?: string;
  speciality: string;
  qualification?: string;
  license_number?: string;
  license_document?: string;
  address?: string;
  city: string;
  province: string;
  postal_code?: string;
  price: number;
  years_experience: number;
  rating: number;
  review_count: number;
  image_url: string;
  bio: string;
  languages: string[];
  accepted_insurances?: string[];
  is_available: boolean;
  verified: boolean;
  latitude?: number;
  longitude?: number;
  created_at?: string;
  updated_at?: string;
}

export interface DoctorSchedule {
    id: number;
    doctor: number;
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_available: boolean;
}

export const DoctorsRepo = {
  async getById(id: string) {
    try {
        const response = await api.request(`/doctors/doctors/${id}/`);
        if (!response.ok) return null;
        const d = await response.json();
        
        // Apply same mapping as list()
        return {
            ...d,
            practice_name: d.practice_name || (d.first_name && d.last_name ? `Dr. ${d.first_name} ${d.last_name}` : `${d.speciality || 'Medical'} Practice`),
            consultation_fee: typeof d.price === 'string' ? parseFloat(d.price) : d.price,
            province: d.province || '',
            city: d.city || '',
            speciality: d.speciality || 'General',
            profiles: d.user_details || {
                first_name: d.first_name,
                last_name: d.last_name,
                email: d.email
            }
        } as Doctor;
    } catch (e) {
        return null;
    }
  },

  async getByUserId(userId: string) {
      const response = await api.request(`/doctors/doctors/?user=${userId}`);
      if (!response.ok) return null;
      const results = await response.json();
      return results.results?.[0] || results[0] || null; 
  },

  async list(filters?: Partial<Pick<Doctor, 'city' | 'province' | 'speciality' | 'is_available' | 'verified'>> & { search?: string }) {
    const params = new URLSearchParams();
    if (filters) {
        if (filters.search) params.append('search', filters.search);
        if (filters.city) params.append('city', filters.city);
        if (filters.speciality) params.append('speciality', filters.speciality);
        if (filters.province) params.append('province', filters.province);
        if (filters.is_available !== undefined) params.append('is_available', String(filters.is_available));
        if (filters.verified !== undefined) params.append('verified', String(filters.verified));
    }
    const response = await api.request(`/doctors/doctors/?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to fetch doctors');
    const data = await response.json();
    const results = data.results || data;

    // Map backend fields to frontend interface compatibility
    return results.map((d: any) => ({
        ...d,
        practice_name: d.practice_name || (d.first_name && d.last_name ? `Dr. ${d.first_name} ${d.last_name}` : `${d.speciality || 'Medical'} Practice`),
        consultation_fee: typeof d.price === 'string' ? parseFloat(d.price) : d.price,
        province: d.province || '',
        city: d.city || '',
        speciality: d.speciality || 'General',
        profiles: d.user_details || {
            first_name: d.first_name,
            last_name: d.last_name,
            email: d.email
        }
    }));
  },

  async create(payload: Partial<Doctor> | FormData) {
    const isFormData = payload instanceof FormData;
    const response = await api.request('/doctors/doctors/', {
        method: 'POST',
        body: isFormData ? payload : JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Failed to create doctor');
    return response.json();
  },

  async getSchedule(doctorId: string) {
    const response = await api.request(`/doctors/schedules/?doctor=${doctorId}`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.results || data;
  },

  async update(id: string, update: Partial<Doctor> | any) {
    let body;
    let isFormData = false;

    // Check if any value is a File object (naive check)
    const hasFile = Object.values(update).some(v => v instanceof File);

    if (hasFile) {
        body = new FormData();
        Object.entries(update).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                 if (Array.isArray(value)) {
                     // Handle arrays if needed (e.g. languages)
                     // Django expects multiple values for same key or JSON string depending on implementation.
                     // For JSONField 'languages', we should send JSON string.
                     if (key === 'languages') {
                        body.append(key, JSON.stringify(value));
                     } else {
                        // generic array handling
                        value.forEach(v => body.append(key, v));
                     }
                 } else {
                    body.append(key, value as any);
                 }
            }
        });
        isFormData = true;
    } else {
        body = JSON.stringify(update);
    }

    const response = await api.request(`/doctors/doctors/${id}/`, {
        method: 'PATCH',
        body: body
    });
    if (!response.ok) throw new Error('Failed to update doctor');
    return response.json();
  },

  async verify(id: string) {
    const response = await api.request(`/doctors/doctors/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ verified: true })
    });
    if (!response.ok) return null;
    return response.json();
  },

  async delete(id: string) {
    const response = await api.request(`/doctors/doctors/${id}/`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete doctor');
    return true;
  },

  async getSchedules(doctorId: string) {
    const response = await api.request(`/doctors/schedules/?doctor=${doctorId}`);
    if (!response.ok) throw new Error('Failed to fetch schedules');
    const data = await response.json();
    return data.results || data;
  },

  async upsertSchedules(rows: Partial<DoctorSchedule>[], onConflict: string = 'doctor_id,day_of_week') {
      const promises = rows.map(async row => {
          let response;
          if (row.id) {
               response = await api.request(`/doctors/schedules/${row.id}/`, {
                   method: 'PATCH', 
                   body: JSON.stringify(row)
               });
          } else {
              response = await api.request(`/doctors/schedules/`, {
                  method: 'POST',
                  body: JSON.stringify(row)
               });
          }
          if (!response.ok) {
              const text = await response.text();
              throw new Error(`Failed to save schedule: ${text}`);
          }
          return response.json();
      });
      await Promise.all(promises);
  },

  async clearSchedules(doctorId: string) {
      const response = await api.request(`/doctors/schedules/bulk_delete/?doctor=${doctorId}`, {
          method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to clear schedules');
      return response.json();
  }
};
