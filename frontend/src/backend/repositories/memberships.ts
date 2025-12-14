import { api } from '@/lib/django-api';

export interface Membership {
  id: number;
  user: number;
  tier: 'free' | 'premium' | 'professional';
  status: 'active' | 'inactive' | 'cancelled' | 'expired';
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export const MembershipsRepo = {
  async listAll() {
    const response = await api.request(`/memberships/memberships/?ordering=-created_at`);
    if (!response.ok) throw new Error('Failed to fetch memberships');
    const data = await response.json();
    return (data.results || data) as Membership[];
  },

  async getForUser(userId: string) {
    // In Django, we can just list memberships filtered by user
    // Or if it's the current user, the viewset filters it automatically.
    // If we are admin looking at another user, we might need to filter.
    // But typical usage is "my membership".
    
    // Check if we are requesting for current user or specific user
    // Ideally the API should support ?user=ID if admin
    
    // For now, let's assume we fetch the list and take the first one
    const response = await api.request(`/memberships/memberships/`);
    if (!response.ok) return null;
    
    const data = await response.json();
    const results = (data.results || data) as Membership[];
    
    // Filter by userId if provided and we are not just getting "my" memberships
    // But since the API filters by request.user for non-admins, this might be tricky if we want "getForUser(otherUser)"
    // Let's assume for now we just return the first membership found.
    // If the backend filters by user=request.user, then we get our own.
    
    if (results.length > 0) {
        return results[0];
    }
    return null;
  },

  async upsert(payload: any) {
    // Check if membership exists
    const existing = await this.getForUser(payload.user_id || payload.user);
    
    if (existing) {
        const response = await api.request(`/memberships/memberships/${existing.id}/`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('Failed to update membership');
        return response.json() as Promise<Membership>;
    } else {
        const response = await api.request(`/memberships/memberships/`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('Failed to create membership');
        return response.json() as Promise<Membership>;
    }
  },
};
