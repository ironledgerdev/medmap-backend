import { api } from '@/lib/django-api';

export interface SystemSetting {
  id: number;
  setting_key: string;
  setting_value: string;
  description: string | null;
  updated_at: string;
  updated_by: number | null;
}

export const SystemRepo = {
  async get(setting_key: string) {
    // We can filter by setting_key using Django filter or manual search
    // Assuming we added filterset_fields to viewset, which I didn't yet.
    // So let's list and find. Or I should update the viewset.
    
    // Better: Update viewset to allow lookup by key or filter
    // For now, list all and find (not efficient but works for small config)
    const response = await api.request(`/system/settings/`);
    if (!response.ok) return null;
    
    const data = await response.json();
    const results = (data.results || data) as SystemSetting[];
    
    return results.find(s => s.setting_key === setting_key) || null;
  },

  async set(setting_key: string, setting_value: string, description?: string) {
    const existing = await this.get(setting_key);
    
    const payload = {
        setting_key,
        setting_value,
        description
    };

    if (existing) {
        const response = await api.request(`/system/settings/${existing.id}/`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('Failed to update setting');
        return response.json() as Promise<SystemSetting>;
    } else {
        const response = await api.request(`/system/settings/`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('Failed to create setting');
        return response.json() as Promise<SystemSetting>;
    }
  },
  
  async getAdminStats() {
      const response = await api.request('/system/settings/admin_stats/');
      if (!response.ok) throw new Error('Failed to fetch admin stats');
      return response.json();
  },

  async getAnalytics() {
      const response = await api.request('/system/settings/analytics_dashboard/');
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return response.json();
  }
};
