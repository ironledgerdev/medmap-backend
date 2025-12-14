import { api } from '@/lib/django-api';
// Keep types for compatibility if possible, or redefine them partially
// We are mocking Supabase types with "any" or partial interfaces to avoid type errors during migration
// import { supabase } from '../client'; 
// import type { Tables, TablesInsert, TablesUpdate, Enums } from '../client';

export type Profile = any; // Tables<'profiles'>;
export type ProfileInsert = any; // TablesInsert<'profiles'>;
export type ProfileUpdate = any; // TablesUpdate<'profiles'>;
export type Enums<T> = any;

export const ProfilesRepo = {
  async getById(id: string) {
    const user = await api.getUserById(id);
    if (!user) return null;
    return {
        ...user,
        role: user.role // Ensure role is mapped
    } as Profile;
  },

  async upsert(update: ProfileInsert | ProfileUpdate) {
    // Determine ID from update object
    const id = update.id; 
    if (!id) throw new Error("Cannot upsert without ID");

    const djangoData: any = {
        first_name: update.first_name,
        last_name: update.last_name,
        phone_number: update.phone, // Map phone to phone_number
        // Map other fields as necessary
    };

    if (update.role) {
       // Only if we can update role this way
       if (update.role === 'doctor') djangoData.is_doctor = true;
       if (update.role === 'patient') djangoData.is_patient = true;
    }

    const updatedUser = await api.updateUser(id, djangoData);
    return updatedUser as Profile | null;
  },

  async listAllProfiles() {
    try {
        // Admin only usually, fetches all users
        const response = await api.request('/users/');
        if (!response.ok) throw new Error("Failed to list profiles");
        return response.json();
    } catch (e) {
        console.error(e);
        return [];
    }
  },

  async searchProfiles(query: string) {
    try {
        const response = await api.request(`/users/?search=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error("Search failed");
        return response.json();
    } catch (e) {
        console.error(e);
        return [];
    }
  },

  async updateRole(userId: string, role: string) {
      return this.setRole(userId, role);
  },

  async setRole(userId: string, role: string) {
      const djangoData: any = {};
      if (role === 'doctor') {
          djangoData.is_doctor = true;
          djangoData.is_patient = false;
      }
      else if (role === 'patient') {
          djangoData.is_patient = true;
          djangoData.is_doctor = false;
      }
      else if (role === 'admin') {
           // Usually admin status is not set via simple profile update in Django for security
           // But if we must:
           // djangoData.is_staff = true; 
      }
      await api.updateUser(userId, djangoData);
  },

  async listBasic(ids?: string[]) {
      // TODO: Implement list endpoint in Django or loop
      // For now, return empty or implement bulk fetch
      console.warn("listBasic not fully implemented for Django");
      return [];
  },

  async isAdmin(userId: string) {
      const user = await api.getUserById(userId);
      return user?.role === 'admin';
  },

  async impersonateUser(userId: string) {
    const response = await api.request(`/users/${userId}/impersonate/`, {
        method: 'POST'
    });
    if (!response.ok) throw new Error("Impersonation failed");
    return response.json();
  },
};
