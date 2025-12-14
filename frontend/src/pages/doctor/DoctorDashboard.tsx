import React, { useState, useEffect, useCallback, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  Clock,
  Users,
  DollarSign,
  Settings,
  TrendingUp,
  Eye,
  Edit
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DoctorsRepo, Doctor, DoctorSchedule } from '@/backend/repositories/doctors';
import { BookingsRepo } from '@/backend/repositories/bookings';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface DoctorStats {
  totalBookings: number;
  pendingBookings: number;
  monthlyRevenue: number;
  rating: number;
}

const DoctorDashboard = () => {
  const [stats, setStats] = useState<DoctorStats>({
    totalBookings: 0,
    pendingBookings: 0,
    monthlyRevenue: 0,
    rating: 0
  });
  const [doctorInfo, setDoctorInfo] = useState<Doctor | null>(null);
  // Tee-time style slots per day
  type DayState = { open: string; close: string; selected: Set<string> };
  const [dayStates, setDayStates] = useState<Record<number, DayState>>(() => {
    const base: Record<number, DayState> = {} as any;
    for (let i = 0; i < 7; i++) base[i] = { open: '08:00', close: '17:00', selected: new Set() };
    return base;
  });
  const [activeDay, setActiveDay] = useState<number>(1); // default Monday
  const [pendingBookings, setPendingBookings] = useState<any[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<any[]>([]);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [loadingUpcoming, setLoadingUpcoming] = useState(false);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [analyticsData, setAnalyticsData] = useState({
    bookingStatus: [] as any[],
    revenueTrend: [] as any[],
    summary: {
      totalPatients: 0,
      newPatients: 0,
      returningPatients: 0,
      totalReviews: 0,
      averageRating: 0,
      estimatedRevenue: 0
    }
  });

  // Edit profile state
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({
    practice_name: '',
    speciality: '',
    consultation_fee: '',
    years_experience: '',
    address: '', // still not in model, maybe map to bio or ignore
    city: '',
    province: '',
    postal_code: '',
    bio: '',
    accepted_insurances: '',
    profile_image: null as File | null,
    profile_image_url: ''
  });
  const [uploading, setUploading] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (doctorInfo) {
      setEditForm({
        practice_name: doctorInfo.practice_name || '',
        speciality: doctorInfo.speciality || '',
        qualification: doctorInfo.qualification || '',
        license_number: doctorInfo.license_number || '',
        consultation_fee: doctorInfo.price ? String(doctorInfo.price) : '',
        years_experience: doctorInfo.years_experience ? String(doctorInfo.years_experience) : '',
        address: doctorInfo.address || '',
        city: doctorInfo.city || '',
        province: doctorInfo.province || '',
        postal_code: doctorInfo.postal_code || '',
        bio: doctorInfo.bio || '',
        accepted_insurances: Array.isArray(doctorInfo.accepted_insurances) ? doctorInfo.accepted_insurances.join(', ') : '',
        profile_image_url: (doctorInfo as any).image_url || ''
      });
    }
  }, [doctorInfo]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file || !user) return;
    
    // We'll upload on save
    setEditForm((prev: any) => ({ ...prev, profile_image: file, profile_image_url: URL.createObjectURL(file) }));
  };

  const handleEditSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!doctorInfo?.id) {
      toast({ title: 'No doctor profile', description: 'Create your practice profile first.', variant: 'destructive' });
      return;
    }
    setSavingEdit(true);
    try {
      const payload: any = {
        practice_name: editForm.practice_name,
        speciality: editForm.speciality,
        qualification: editForm.qualification,
        license_number: editForm.license_number,
        price: parseFloat(editForm.consultation_fee || '0'),
        years_experience: editForm.years_experience ? parseInt(editForm.years_experience, 10) : null,
    address: editForm.address,
    city: editForm.city,
    province: editForm.province,
        postal_code: editForm.postal_code,
        bio: editForm.bio,
        accepted_insurances: editForm.accepted_insurances.split(',').map((s: string) => s.trim()).filter(Boolean)
      };
      
      if (editForm.profile_image) {
          // If using a repository that supports file upload, or we handle upload separately
          // DoctorsRepo.update handles FormData if a File object is present in values
          payload.image = editForm.profile_image;
      }

      const updated = await DoctorsRepo.update(String(doctorInfo.id), payload);
      
      toast({ title: 'Profile updated', description: 'Your practice profile has been updated.' });
      setDoctorInfo(updated);
      setEditOpen(false);
    } catch (err: any) {
      console.error('Save failed', err?.message || err);
      toast({ title: 'Save failed', description: err?.message || 'Unable to save profile', variant: 'destructive' });
    } finally {
      setSavingEdit(false);
    }
  };

  useEffect(() => {
    if (user && profile?.role === 'doctor') {
      fetchDoctorInfo();
    }
  }, [user, profile]);

  // Ensure we have a doctor profile for this user (no restricted-table lookups)
  const ensureDoctorProfile = async () => {
    if (!user) return null;
    try {
      const existing = await DoctorsRepo.getByUserId(user.id);
      return existing;
    } catch (e: any) {
      console.error('ensureDoctorProfile failed:', e?.message || e);
      return null;
    }
  };

  const fetchDoctorInfo = async () => {
    try {
      if (!user) return;
      const ensured = await ensureDoctorProfile();
      setDoctorInfo(ensured);
      if (!ensured) {
        console.warn('No doctor record found for current user.');
      }
    } catch (error: any) {
      console.error('Error fetching doctor info:', error?.message || error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount);
  };

  const toMinutes = (t: string) => { const [h,m] = t.split(':').map(Number); return h*60+m; };
  const toHHMM = (mins: number) => {
    const h = Math.floor(mins / 60).toString().padStart(2, '0');
    const m = (mins % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  const fetchDoctorStats = async () => {
    if (!doctorInfo?.id) return;

    try {
      const bookings = await BookingsRepo.listForDoctor(String(doctorInfo.id));
      
      // Calculate revenue from completed bookings
      const completed = bookings.filter(b => b.status === 'completed');
      const revenue = completed.length * Number(doctorInfo.price || 0);

      setStats({
        totalBookings: bookings.length,
        pendingBookings: bookings.filter(b => b.status === 'pending').length,
        monthlyRevenue: revenue,
        rating: doctorInfo.rating || 0
      });

      // Analytics Processing
      // 1. Booking Status Distribution
      const statusCounts = bookings.reduce((acc: any, curr) => {
        acc[curr.status] = (acc[curr.status] || 0) + 1;
        return acc;
      }, {});
      
      const COLORS: Record<string, string> = {
        pending: '#F59E0B',   // Amber
        confirmed: '#10B981', // Emerald
        completed: '#3B82F6', // Blue
        cancelled: '#EF4444'  // Red
      };

      const bookingStatusData = Object.keys(statusCounts).map(status => ({
        name: status.charAt(0).toUpperCase() + status.slice(1),
        value: statusCounts[status],
        color: COLORS[status] || '#888888'
      }));

      // 2. Revenue Trend (Last 6 months)
      // Since we don't have historical prices, we use current price for all.
      // Or we should use booking.consultation_fee if available.
      const today = new Date();
      const last6Months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(today.getFullYear(), today.getMonth() - 5 + i, 1);
        return { 
          month: d.toLocaleString('default', { month: 'short' }), 
          year: d.getFullYear(),
          revenue: 0,
          bookings: 0
        };
      });

      bookings.forEach(b => {
        if (b.status === 'completed' || b.status === 'confirmed') {
          const d = new Date(b.appointment_date);
          const monthStr = d.toLocaleString('default', { month: 'short' });
          const year = d.getFullYear();
          
          const monthData = last6Months.find(m => m.month === monthStr && m.year === year);
          if (monthData) {
            monthData.bookings += 1;
            // Use booking fee if available, else doctor price
            const fee = Number(b.consultation_fee) || Number(doctorInfo.price || 0);
            monthData.revenue += fee;
          }
        }
      });

      // 3. Patient Stats
      const patientBookings: Record<number, number> = {};
      bookings.forEach(b => {
        patientBookings[b.user] = (patientBookings[b.user] || 0) + 1;
      });
      const uniquePatients = Object.keys(patientBookings).length;
      const returningPatients = Object.values(patientBookings).filter(count => count > 1).length;
      const newPatients = uniquePatients - returningPatients;

      setAnalyticsData({
        bookingStatus: bookingStatusData,
        revenueTrend: last6Months,
        summary: {
          totalPatients: uniquePatients,
          newPatients: newPatients,
          returningPatients: returningPatients,
          totalReviews: doctorInfo.review_count || 0,
          averageRating: Number(doctorInfo.rating || 0),
          estimatedRevenue: revenue // Revenue from completed only, or use confirmed too? User said "Estimated revenue based on fee set"
        }
      });

    } catch (error) {
      console.error('Error fetching doctor stats:', error);
    }
  };

  const loadSchedule = async () => {
    if (!doctorInfo?.id) return;
    try {
      const data = await DoctorsRepo.getSchedules(String(doctorInfo.id));
      
      const next: Record<number, DayState> = {} as any;
      for (let i = 0; i < 7; i++) next[i] = { open: '08:00', close: '17:00', selected: new Set() };

      (data || []).forEach((row: any) => {
        if (row.is_available === false) return;
        const d = row.day_of_week as number;
        const start = (row.start_time as string).slice(0,5);
        const end = (row.end_time as string).slice(0,5);
        if (!next[d]) next[d] = { open: '08:00', close: '17:00', selected: new Set() };
        // ensure open/close encompass existing rows
        if (toMinutes(start) < toMinutes(next[d].open)) next[d].open = start;
        if (toMinutes(end) > toMinutes(next[d].close)) next[d].close = end;
        for (let m = toMinutes(start); m < toMinutes(end); m += 30) {
          next[d].selected.add(toHHMM(m));
        }
      });
      setDayStates(next);
    } catch (e: any) {
      console.error('Failed to load schedule', e?.message || e);
    }
  };

  const saveSchedule = async () => {
    let doctorId = doctorInfo?.id;
    if (!doctorId) {
        // ... handle error
        return;
    }
    setSavingSchedule(true);
    try {
      // Logic to sync schedule
      // For now, we might need to delete existing and recreate, or diff
      // Django doesn't support easy 'delete all for doctor' via standard viewset unless we add custom action
      // OR we just create new ones.
      
      // Ideally: BE endpoint to replace schedules.
      // Current Repo implementation: upsertSchedules calls PATCH one by one if ID exists.
      // But we don't track IDs in `dayStates`.
      
      // Let's assume we can clear schedules first? Or maybe we should improve BE to handle bulk replace.
      // For this migration, I'll skip complex diffing and assume we need a way to clear.
      
      // Workaround: Get existing schedules, delete them, then create new ones.
      // const existing = await DoctorsRepo.getSchedules(String(doctorId)); // Not used yet
      
      // Delete all schedules for this doctor first
      // Since we don't have a bulk delete endpoint yet, we iterate and delete.
      // Or we can rely on a custom endpoint if we add one.
      await DoctorsRepo.clearSchedules(String(doctorId));

      const rows: any[] = [];
      for (let d = 0; d < 7; d++) {
        const state = dayStates[d];
        if (!state) continue;
        const selectedTimes = Array.from(state.selected.values()).sort();
        if (selectedTimes.length === 0) continue;
        
        let currentStart = selectedTimes[0];
        let prevTime = selectedTimes[0];

        for (let i = 1; i < selectedTimes.length; i++) {
            const t = selectedTimes[i];
            // Check if this time is contiguous (30 mins after prev)
            if (toMinutes(t) === toMinutes(prevTime) + 30) {
                prevTime = t;
            } else {
                // Gap detected, close current block
                rows.push({
                    doctor: doctorId,
                    day_of_week: d,
                    start_time: currentStart,
                    end_time: toHHMM(toMinutes(prevTime) + 30),
                    is_available: true,
                });
                // Start new block
                currentStart = t;
                prevTime = t;
            }
        }
        // Push the last block
        rows.push({
            doctor: doctorId,
            day_of_week: d,
            start_time: currentStart,
            end_time: toHHMM(toMinutes(prevTime) + 30),
            is_available: true,
        });
      }

      await DoctorsRepo.upsertSchedules(rows);
      
      toast({ title: 'Schedule saved', description: 'Your schedule has been updated.' });

    } catch (e: any) {
      console.error('Failed to save schedule', e?.message || e);
      toast({ title: 'Failed to save schedule', description: e?.message || String(e), variant: 'destructive' });
    } finally {
      setSavingSchedule(false);
    }
  };

  const fetchPendingAppointments = async () => {
    if (!doctorInfo?.id) return;
    setLoadingBookings(true);
    try {
      const data = await BookingsRepo.listForDoctor(String(doctorInfo.id));
      setPendingBookings(data.filter(b => b.status === 'pending'));
    } catch (e: any) {
      console.error('Failed to fetch pending appointments', e?.message || e);
    } finally {
      setLoadingBookings(false);
    }
  };

  const fetchUpcomingAppointments = async () => {
    if (!doctorInfo?.id) return;
    setLoadingUpcoming(true);
    try {
      const data = await BookingsRepo.listForDoctor(String(doctorInfo.id));
      const today = new Date();
      // Filter for upcoming
      const upcoming = data.filter(b => {
          const d = new Date(b.appointment_date + 'T' + b.appointment_time);
          return d >= today && b.status !== 'cancelled';
      });
      setUpcomingBookings(upcoming);
    } catch (e: any) {
      console.error('Failed to fetch upcoming appointments', e?.message || e);
    } finally {
      setLoadingUpcoming(false);
    }
  };

  const approveBooking = async (bookingId: string) => {
    try {
      await BookingsRepo.update(bookingId, { status: 'confirmed' });
      fetchPendingAppointments();
      fetchDoctorStats();
    } catch (e: any) {
      console.error('Failed to approve booking', e?.message || e);
    }
  };

  const rejectBooking = async (bookingId: string) => {
    try {
      await BookingsRepo.update(bookingId, { status: 'cancelled' });
      fetchPendingAppointments();
      fetchDoctorStats();
    } catch (e: any) {
      console.error('Failed to reject booking', e?.message || e);
    }
  };

  useEffect(() => {
    if (doctorInfo?.id) {
      loadSchedule();
      fetchPendingAppointments();
      fetchUpcomingAppointments();
      fetchDoctorStats();
      
      // Polling for updates (replacement for realtime)
      const pollInterval = setInterval(() => {
          fetchPendingAppointments();
          fetchUpcomingAppointments();
          fetchDoctorStats();
      }, 15000); // 15 seconds

      return () => clearInterval(pollInterval);
    }
  }, [doctorInfo?.id]);

  if (user && profile?.role === 'doctor' && !doctorInfo) {
      return (
          <div className="container mx-auto px-4 py-12">
              <Card>
                  <CardHeader>
                      <CardTitle>Complete Your Profile</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <p className="mb-4">You need to set up your practice profile before you can manage bookings.</p>
                      <Button onClick={() => window.location.href = '/doctor-enrollment'}>
                          Go to Enrollment
                      </Button>
                  </CardContent>
              </Card>
          </div>
      );
  }

  if (profile?.role !== 'doctor') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-2xl font-bold mb-2">Doctor Dashboard</h2>
            <p className="text-muted-foreground">Only approved healthcare providers can access this dashboard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-medical-gradient mb-2">
              Welcome back, Dr. {profile?.first_name} {profile?.last_name}
            </h1>
            <p className="text-muted-foreground">Manage your practice and patient appointments</p>
          </div>
          <div>
            <Link to="/" className="inline-flex">
              <Button variant="outline" className="btn-medical-secondary">Home</Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="medical-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-primary">{stats.totalBookings}</div>
                <Calendar className="h-5 w-5 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="medical-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-amber-600">{stats.pendingBookings}</div>
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="medical-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats.monthlyRevenue)}
                </div>
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="medical-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Rating</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-blue-600">{Number(stats.rating || 0).toFixed(1)}</div>
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="appointments" className="space-y-6">
          <TabsList>
            <TabsTrigger value="appointments" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Appointments
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="appointments">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="medical-hero-card">
                <CardHeader>
                  <CardTitle>Pending Appointments</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingBookings ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                  ) : pendingBookings.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No pending appointments</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pendingBookings.map((b) => (
                        <div key={b.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium">{b.appointment_date} at {b.appointment_time}</div>
                            {b.notes && (<div className="text-sm text-muted-foreground">{b.notes}</div>)}
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => approveBooking(b.id)}>Approve</Button>
                            <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => rejectBooking(b.id)}>Reject</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="medical-hero-card">
                <CardHeader>
                  <CardTitle>Upcoming Appointments</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingUpcoming ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                  ) : upcomingBookings.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No upcoming appointments</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {upcomingBookings.map((b) => (
                        <div key={b.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium">{b.appointment_date} at {b.appointment_time}</div>
                            <div className="text-xs text-muted-foreground">Status: {b.status}</div>
                          </div>
                          <Badge variant={b.status === 'confirmed' ? 'default' : 'secondary'}>
                            {b.status === 'confirmed' ? 'Booked' : b.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="schedule">
            <Card className="medical-hero-card">
              <CardHeader>
                <CardTitle>Manage Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Day selector */}
                  <div className="flex gap-2 flex-wrap">
                    {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, i) => (
                      <Button key={d} variant={activeDay===i?'default':'outline'} className={activeDay===i?'btn-medical-primary':'btn-medical-secondary'} onClick={() => setActiveDay(i)}>
                        {d}
                      </Button>
                    ))}
                  </div>

                  {/* Open/Close for active day */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                    <div>
                      <label className="text-sm text-muted-foreground">Open</label>
                      <input type="time" className="border rounded px-2 py-2 w-full" value={dayStates[activeDay]?.open}
                        onChange={(e) => setDayStates((prev) => ({ ...prev, [activeDay]: { ...prev[activeDay], open: e.target.value } }))} />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Close</label>
                      <input type="time" className="border rounded px-2 py-2 w-full" value={dayStates[activeDay]?.close}
                        onChange={(e) => setDayStates((prev) => ({ ...prev, [activeDay]: { ...prev[activeDay], close: e.target.value } }))} />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => {
                        const state = dayStates[activeDay];
                        const next = new Set<string>();
                        for (let m = toMinutes(state.open); m < toMinutes(state.close); m += 30) next.add(toHHMM(m));
                        setDayStates((prev) => ({ ...prev, [activeDay]: { ...prev[activeDay], selected: next } }));
                      }}>Select All</Button>
                      <Button variant="outline" onClick={() => setDayStates((prev) => ({ ...prev, [activeDay]: { ...prev[activeDay], selected: new Set() } }))}>Clear</Button>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => {
                        const copy = dayStates[activeDay];
                        setDayStates((prev) => {
                          const next = { ...prev } as Record<number, DayState>;
                          for (let i = 0; i < 7; i++) next[i] = i===activeDay ? prev[i] : { open: copy.open, close: copy.close, selected: new Set(copy.selected) };
                          return next;
                        });
                      }}>Copy to all days</Button>
                    </div>
                  </div>

                  {/* Slot grid for active day */}
                  <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-2">
                    {(() => {
                      const state = dayStates[activeDay];
                      const items: JSX.Element[] = [];
                      for (let m = toMinutes(state.open); m < toMinutes(state.close); m += 30) {
                        const t = toHHMM(m);
                        const selected = state.selected.has(t);
                        items.push(
                          <Button key={t} variant={selected?'default':'outline'} onClick={() => {
                            setDayStates((prev) => {
                              const next = new Set(prev[activeDay].selected);
                              if (next.has(t)) next.delete(t); else next.add(t);
                              return { ...prev, [activeDay]: { ...prev[activeDay], selected: next } };
                            });
                          }} className={`h-10 ${selected?'btn-medical-primary':'btn-medical-secondary'}`}>{t}</Button>
                        );
                      }
                      return items;
                    })()}
                  </div>

                  <div className="pt-2">
                    <Button onClick={saveSchedule} disabled={savingSchedule} className="btn-medical-primary">
                      {savingSchedule ? 'Saving...' : 'Save Schedule'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <Card className="medical-hero-card">
              <CardHeader>
                <CardTitle>Practice Profile</CardTitle>
              </CardHeader>
              <CardContent>
                {doctorInfo ? (
                  <div className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Practice Name</label>
                        <p className="text-lg font-semibold">{(doctorInfo as any).practice_name || 'My Practice'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Specialty</label>
                        <div className="text-lg font-semibold">
                          <Badge variant="outline" className="text-base">{doctorInfo.speciality}</Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Consultation Fee</label>
                        <p className="text-lg font-semibold">{formatCurrency(doctorInfo.price || 0)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Location</label>
                        <p className="text-lg font-semibold">{doctorInfo.city}, {doctorInfo.province}</p>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Bio</label>
                      <p className="mt-1">{doctorInfo.bio || 'No bio provided'}</p>
                    </div>

                    <Button className="btn-medical-primary" onClick={() => setEditOpen(true)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>

                    {/* Edit Profile Dialog */}
                    <Dialog open={editOpen} onOpenChange={(open) => { if (!open) setEditOpen(false); }}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Practice Profile</DialogTitle>
                          <DialogDescription>Update your public profile information shown to patients.</DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleEditSubmit} className="space-y-4">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Practice Name</Label>
                              <Input value={editForm.practice_name} onChange={(e) => setEditForm({ ...editForm, practice_name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                              <Label>Speciality</Label>
                              <Input value={editForm.speciality} onChange={(e) => setEditForm({ ...editForm, speciality: e.target.value })} />
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Qualification</Label>
                              <Input value={editForm.qualification} onChange={(e) => setEditForm({ ...editForm, qualification: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                              <Label>HPCSA License Number</Label>
                              <Input value={editForm.license_number} onChange={(e) => setEditForm({ ...editForm, license_number: e.target.value })} />
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Consultation Fee (ZAR)</Label>
                              <Input type="number" value={editForm.consultation_fee} onChange={(e) => setEditForm({ ...editForm, consultation_fee: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                              <Label>Years of Experience</Label>
                              <Input type="number" value={editForm.years_experience} onChange={(e) => setEditForm({ ...editForm, years_experience: e.target.value })} />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Practice Address</Label>
                            <Input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
                          </div>

                          <div className="grid md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label>City</Label>
                              <Input value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                              <Label>Province</Label>
                              <Input value={editForm.province} onChange={(e) => setEditForm({ ...editForm, province: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                              <Label>Postal Code</Label>
                              <Input value={editForm.postal_code} onChange={(e) => setEditForm({ ...editForm, postal_code: e.target.value })} />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Accepted Medical Aids / Insurances (comma-separated)</Label>
                            <Input value={editForm.accepted_insurances} onChange={(e) => setEditForm({ ...editForm, accepted_insurances: e.target.value })} />
                          </div>

                          <div className="space-y-2">
                            <Label>Professional Bio</Label>
                            <Textarea value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} rows={4} />
                          </div>

                          <div className="space-y-2">
                            <Label>Profile Image</Label>
                            <input type="file" accept="image/*" onChange={handleFileChange} />
                            {uploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
                            {editForm.profile_image_url && (
                              <img src={editForm.profile_image_url} alt="profile preview" className="w-24 h-24 object-cover rounded-md mt-2" />
                            )}
                          </div>

                          <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                            <Button type="submit" className="btn-medical-primary" disabled={savingEdit}>{savingEdit ? 'Saving…' : 'Save Changes'}</Button>
                          </DialogFooter>
                        </form>

                      </DialogContent>
                    </Dialog>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Loading profile information...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalBookings}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analyticsData.summary.totalPatients}</div>
                  <p className="text-xs text-muted-foreground">
                    {analyticsData.summary.newPatients} new, {analyticsData.summary.returningPatients} returning
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Est. Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">R {analyticsData.summary.estimatedRevenue.toFixed(2)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Rating</CardTitle>
                  <div className="flex items-center">
                    <span className="text-yellow-500 mr-1">★</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analyticsData.summary.averageRating.toFixed(1)}</div>
                  <p className="text-xs text-muted-foreground">
                    Based on {analyticsData.summary.totalReviews} reviews
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Trend (Last 6 Months)</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.revenueTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <RechartsTooltip formatter={(value) => `R ${value}`} />
                      <Bar dataKey="revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Booking Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Booking Status</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analyticsData.bookingStatus}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {analyticsData.bookingStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DoctorDashboard;
