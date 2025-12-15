import React, { useEffect, useState } from 'react';
import { AdminRoleManager } from '@/components/AdminRoleManager';
import { AdminAnalytics } from '@/components/AdminAnalytics';
import { AdminGuard } from '@/components/AdminGuard';
import { AdminStats } from '@/components/admin/AdminStats';
import { PendingDoctorsTab } from '@/components/admin/PendingDoctorsTab';
import { CreateUserTab } from '@/components/admin/CreateUserTab';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Users, 
  UserCheck, 
  Clock, 
  Calendar, 
  DollarSign,
  TrendingUp,
  CheckCircle,
  XCircle,
  Eye,
  Settings,
  UserPlus,
  Stethoscope,
  Search,
  Shield
} from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { DoctorsRepo } from '@/backend/repositories/doctors';
import { BookingsRepo } from '@/backend/repositories/bookings';
import { MembershipsRepo } from '@/backend/repositories/memberships';
import { PaymentsRepo } from '@/backend/repositories/payments';
import { api } from '@/lib/django-api';
import { PaymentsTable, PaymentTransaction } from '@/components/admin/PaymentsTable';

interface PendingDoctor {
  id: string;
  user_id: string;
  practice_name: string;
  speciality: string;
  qualification: string;
  license_number: string;
  years_experience: number;
  consultation_fee: number;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  bio: string;
  status: string;
  created_at: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface DashboardStats {
  totalDoctors: number;
  pendingApplications: number;
  totalBookings: number;
  totalRevenue: number;
  totalUsers: number;
  premiumMembers: number;
}

interface UserMembership {
  id: string;
  user_id: string;
  membership_type: 'basic' | 'premium';
  is_active: boolean;
  current_period_start: string | null;
  current_period_end: string | null;
  free_bookings_remaining: number;
  created_at: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    email: string;
    role: string;
  } | null;
}

interface RecentBooking {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  doctors: {
    id: string;
    practice_name: string;
    user_id: string;
    profiles: {
      first_name: string | null;
      last_name: string | null;
    } | null;
  } | null;
}

export const AdminDashboard: React.FC = () => {
  return (
    <AdminGuard>
      <AdminDashboardContent />
    </AdminGuard>
  );
};

export const AdminDashboardContent: React.FC<{ overrideProfile?: any; bypassAuth?: boolean }> = ({ overrideProfile, bypassAuth = false }) => {
  const [pendingDoctors, setPendingDoctors] = useState<PendingDoctor[]>([]);
  const [userMemberships, setUserMemberships] = useState<UserMembership[]>([]);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalDoctors: 0,
    pendingApplications: 0,
    totalBookings: 0,
    totalRevenue: 0,
    totalUsers: 0,
    premiumMembers: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'patient' as 'patient' | 'doctor' | 'admin'
  });
  const auth = useAuth();
  const profile = overrideProfile ?? auth.profile;
  const isLocalAdmin = profile?.id === 'local-admin';
  const { toast } = useToast();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const showDebug = params.get('debug') === '1';

  const [debugInfo, setDebugInfo] = useState<{ pending?: any; memberships?: any; recentBookings?: any; stats?: any; errors: string[] }>({ errors: [] });

  // Telecommunications
  const [callData, setCallData] = useState({ agentNumber: '', customerNumber: '' });
  const [isCalling, setIsCalling] = useState(false);

  const handleTestCall = async () => {
    if (!callData.agentNumber || !callData.customerNumber) {
      toast({ title: "Error", description: "Please enter both numbers", variant: "destructive" });
      return;
    }
    setIsCalling(true);
    try {
      const response = await api.request('/telecommunications/call/', {
          method: 'POST',
          body: JSON.stringify({
              agent_number: callData.agentNumber,
              customer_number: callData.customerNumber
          })
      });
      
      const text = await response.text();
      let data;
      try {
          data = JSON.parse(text);
      } catch (e) {
          console.error("Non-JSON response from server:", text);
          throw new Error(`Server returned non-JSON response (${response.status}). Check console for details.`);
      }

      if (response.ok) {
          toast({ title: "Success", description: "Call initiated! Your phone should ring shortly." });
      } else {
          toast({ title: "Error", description: data.error || "Failed to call", variant: "destructive" });
      }
    } catch (e: any) {
      console.error("Call failed", e);
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsCalling(false);
    }
  };

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      await Promise.allSettled([
        fetchPendingDoctors(),
        fetchUserMemberships(),
        fetchRecentBookings(),
        fetchDashboardStats(),
        fetchTransactions(),
      ]);
    } catch (error: any) {
      setDebugInfo(prev => ({ ...prev, errors: [...prev.errors, (error && error.message) || String(error)] }));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const data = await PaymentsRepo.listTransactions();
      setTransactions(data);
    } catch (e: any) {
      console.error('Failed to fetch transactions', e);
      setDebugInfo(prev => ({ ...prev, errors: [...prev.errors, 'Failed to fetch transactions: ' + e.message] }));
    }
  };

  useEffect(() => {
    // Only allow actual admin users, unless bypassAuth is true
    if (bypassAuth) {
      fetchAdminData();
      return;
    }

    if (profile?.role === 'admin') {
      fetchAdminData();
    } else if (profile && (profile.role === 'patient' || profile.role === 'doctor')) {
      // User is logged in but not admin - redirect
      toast({
        title: "Access Denied",
        description: "Admin privileges required to access this page.",
        variant: "destructive",
      });
      // Redirect to home after showing error
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    }

    return () => {
      // Cleanup
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, toast, bypassAuth]);

  // Realtime subscriptions removed for now
  /*
  const setupRealtimeSubscriptions = () => { ... };
  */

  const fetchPendingDoctors = async () => {
    try {
      const allDoctors = await DoctorsRepo.list();
      const pending = allDoctors.filter((d: any) => !d.verified);
      
      // Transform to PendingDoctor interface if needed, or adjust interface
      // Assuming Doctor object has user details nested or we can use what we have.
      // The frontend interface expects: id, user_id, practice_name, speciality, profiles: { first_name, last_name, email }
      // Django Doctor object likely has user: { id, first_name, last_name, email } or similar.
      
      const enrichedData = pending.map((d: any) => ({
        id: String(d.id),
        user_id: String(d.user?.id || d.user),
        practice_name: d.practice_name || 'Unknown Practice',
        speciality: d.specialization || 'General',
        created_at: d.created_at,
        profiles: {
            first_name: d.user?.first_name || '',
            last_name: d.user?.last_name || '',
            email: d.user?.email || ''
        }
      }));

      setPendingDoctors(enrichedData);
    } catch (error: any) {
      setDebugInfo(prev => ({ ...prev, errors: [...prev.errors, (error && error.message) || String(error)] }));
      if (!isLocalAdmin) {
        toast({
          title: "Error",
          description: "Failed to fetch pending applications",
          variant: "destructive",
        });
      }
    }
  };

  const fetchRecentBookings = async () => {
    try {
      const bookings = await BookingsRepo.listAll();
      const recent = bookings.slice(0, 10);
      
      const enriched = recent.map((b: any) => ({
        id: String(b.id),
        appointment_date: b.appointment_date,
        appointment_time: b.appointment_time,
        status: b.status,
        doctors: b.doctor_details ? {
            id: String(b.doctor_details.id),
            practice_name: b.doctor_details.practice_name || '',
            user_id: String(b.doctor_details.user || ''),
            profiles: {
                first_name: b.doctor_details.first_name || '',
                last_name: b.doctor_details.last_name || ''
            }
        } : null
      }));

      setRecentBookings(enriched);
      setDebugInfo(prev => ({ ...prev, recentBookings: enriched }));
    } catch (error: any) {
      setDebugInfo(prev => ({ ...prev, errors: [...prev.errors, (error && error.message) || String(error)] }));
      console.error('Failed to fetch recent bookings:', error);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      // Parallel requests
      const [doctors, bookings, memberships, usersRes] = await Promise.all([
        DoctorsRepo.list(),
        BookingsRepo.listAll(),
        MembershipsRepo.listAll(),
        api.request('/users/')
      ]);
      
      const usersData = await usersRes.json();
      const usersCount = usersData.count || (Array.isArray(usersData) ? usersData.length : (usersData.results ? usersData.results.length : 0));

      const pendingCount = doctors.filter((d: any) => !d.verified).length;
      const completedBookings = bookings.filter((b: any) => b.status === 'completed');
      
      // Calculate revenue
      const totalRevenue = completedBookings.reduce((sum: number, b: any) => {
          return sum + (Number(b.total_amount) || 0);
      }, 0);

      const premiumCount = memberships.filter((m: any) => m.tier === 'premium' && m.is_active).length;

      setStats({
        totalDoctors: doctors.length,
        pendingApplications: pendingCount,
        totalBookings: bookings.length,
        totalRevenue: totalRevenue,
        totalUsers: usersCount,
        premiumMembers: premiumCount
      });
    } catch (error: any) {
      setDebugInfo(prev => ({ ...prev, errors: [...prev.errors, (error && error.message) || String(error)] }));
      console.error('Failed to fetch dashboard stats:', error);
    }
  };

  const fetchUserMemberships = async () => {
    try {
      const memberships = await MembershipsRepo.listAll();
      
      // Fetch users to enrich data
      // We'll fetch all users for now since we don't have a batch get endpoint
      const usersRes = await api.request('/users/');
      const usersData = await usersRes.json();
      const allUsers = (usersData.results || usersData) as any[];

      const enriched = memberships.map((m: any) => {
          const user = allUsers.find((u: any) => u.id === (m.user_id || m.user));
          return {
              ...m,
              profiles: user ? {
                  first_name: user.first_name,
                  last_name: user.last_name,
                  email: user.email,
                  role: user.role // Assuming role is on user
              } : null
          };
      });

      setUserMemberships(enriched);
      setDebugInfo(prev => ({ ...prev, memberships }));
    } catch (error: any) {
      setDebugInfo(prev => ({ ...prev, errors: [...prev.errors, (error && error.message) || String(error)] }));
      toast({
        title: "Error",
        description: "Failed to fetch user memberships",
        variant: "destructive",
      });
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.firstName || !newUser.lastName) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { user, error } = await api.signup({
          email: newUser.email,
          password: newUser.password,
          first_name: newUser.firstName,
          last_name: newUser.lastName,
          // phone: newUser.phone, // Add phone to user model if needed
          is_patient: newUser.role === 'patient',
          is_doctor: newUser.role === 'doctor',
          is_superuser: newUser.role === 'admin' // careful with this
      });

      if (error) {
          throw new Error(JSON.stringify(error));
      }

      toast({
        title: "Success",
        description: `${newUser.role.charAt(0).toUpperCase() + newUser.role.slice(1)} account created!`,
      });

      // Reset form
      setNewUser({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
        role: 'patient'
      });

      // Refresh data
      fetchDashboardStats();
      fetchUserMemberships();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveDoctor = async (pendingId: string) => {
    setIsLoading(true);
    try {
      // pendingId is the doctor ID
      const updated = await DoctorsRepo.verify(pendingId);
      if (!updated) throw new Error("Failed to verify doctor");

      toast({
        title: 'Success',
        description: 'Doctor approved successfully!',
      });

      fetchPendingDoctors();
      fetchDashboardStats();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectDoctor = async (pendingId: string) => {
    setIsLoading(true);
    try {
      await api.request(`/doctors/doctors/${pendingId}/`, { method: 'DELETE' });

      toast({
        title: "Doctor Rejected",
        description: "The doctor application has been rejected.",
      });

      fetchPendingDoctors();
      fetchDashboardStats();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || "Failed to reject doctor",
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDoctor = (doctor: PendingDoctor) => {
    // Implementation for viewing doctor details
    toast({
      title: "Doctor Details",
      description: `${doctor.profiles.first_name} ${doctor.profiles.last_name} - ${doctor.speciality}`,
    });
  };



  // Show loading state while profile is being fetched
  if (!profile && !bypassAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show access denied for non-admin users
  if (!bypassAuth && profile?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="medical-hero-card max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Admin privileges are required to access this page.
            </p>
            <Button onClick={() => window.location.href = '/'} className="btn-medical-primary">
              Return to Home
            </Button>
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
            <h1 className="text-4xl font-bold text-medical-gradient mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage healthcare providers and platform operations</p>
          </div>
          <div>
            <Link to="/" className="inline-flex">
              <Button variant="outline" className="btn-medical-secondary">Home</Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <AdminStats stats={stats} />

        {/* Main Tabs */}
        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="pending">Pending ({stats.pendingApplications})</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="memberships">Memberships</TabsTrigger>
            <TabsTrigger value="create-user">Create User</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="role-management">Roles</TabsTrigger>
            <TabsTrigger value="telecoms">Communication</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <PendingDoctorsTab
              pendingDoctors={pendingDoctors}
              onApprove={handleApproveDoctor}
              onReject={handleRejectDoctor}
              onView={handleViewDoctor}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="payments">
            <PaymentsTable transactions={transactions} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="memberships">
            <Card className="medical-hero-card">
              <CardHeader>
                <CardTitle>User Memberships</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Membership Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Free Bookings</TableHead>
                      <TableHead>Period</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userMemberships.map((membership) => (
                      <TableRow key={membership.id}>
                        <TableCell className="font-medium">
                          {membership.profiles?.first_name} {membership.profiles?.last_name}
                        </TableCell>
                        <TableCell>{membership.profiles?.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {membership.profiles?.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={membership.membership_type === 'premium' ? 'default' : 'secondary'}
                            className="capitalize"
                          >
                            {membership.membership_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={membership.is_active ? 'default' : 'destructive'}
                          >
                            {membership.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>{membership.free_bookings_remaining}</TableCell>
                        <TableCell>
                          {membership.current_period_start && membership.current_period_end 
                            ? `${new Date(membership.current_period_start).toLocaleDateString()} - ${new Date(membership.current_period_end).toLocaleDateString()}`
                            : 'N/A'
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create-user">
            <CreateUserTab
              newUser={newUser}
              setNewUser={setNewUser}
              onCreateUser={handleCreateUser}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="analytics">
            <AdminAnalytics />
          </TabsContent>

          <TabsContent value="role-management">
            <AdminRoleManager />
          </TabsContent>

          <TabsContent value="telecoms">
            <Card className="medical-hero-card max-w-xl mx-auto">
              <CardHeader>
                <CardTitle>Test Click-to-Call</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Agent Number (Your Phone)</Label>
                  <Input 
                    placeholder="+27..." 
                    value={callData.agentNumber}
                    onChange={(e) => setCallData(prev => ({ ...prev, agentNumber: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">The number that will ring first (e.g. Doctor/Admin).</p>
                </div>
                <div className="space-y-2">
                  <Label>Customer Number (Patient Phone)</Label>
                  <Input 
                    placeholder="+27..." 
                    value={callData.customerNumber}
                    onChange={(e) => setCallData(prev => ({ ...prev, customerNumber: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">The number to connect to after the agent answers.</p>
                </div>
                <Button onClick={handleTestCall} disabled={isCalling} className="w-full btn-medical-primary">
                  {isCalling ? "Dialing..." : "Initiate Call"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="medical-hero-card">
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Configure platform settings and booking fees.</p>
                {/* Add settings form here */}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {showDebug && (
          <div className="mt-8">
            <Card className="medical-hero-card">
              <CardHeader>
                <CardTitle>Debug / Raw Responses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold">Errors</h4>
                    <pre className="text-xs bg-gray-50 p-2 rounded max-h-40 overflow-auto">{JSON.stringify(debugInfo.errors, null, 2)}</pre>
                  </div>
                  <div>
                    <h4 className="font-semibold">Pending Doctors Raw</h4>
                    <pre className="text-xs bg-gray-50 p-2 rounded max-h-40 overflow-auto">{JSON.stringify(debugInfo.pending, null, 2)}</pre>
                  </div>
                  <div>
                    <h4 className="font-semibold">Memberships Raw</h4>
                    <pre className="text-xs bg-gray-50 p-2 rounded max-h-40 overflow-auto">{JSON.stringify(debugInfo.memberships, null, 2)}</pre>
                  </div>
                  <div>
                    <h4 className="font-semibold">Stats Raw</h4>
                    <pre className="text-xs bg-gray-50 p-2 rounded max-h-40 overflow-auto">{JSON.stringify(debugInfo.stats, null, 2)}</pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
