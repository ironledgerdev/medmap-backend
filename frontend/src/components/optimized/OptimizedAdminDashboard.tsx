import React, { useState, useEffect, memo, useMemo, useCallback } from 'react';
import { AdminGuard } from '@/components/AdminGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  UserCheck, 
  Clock, 
  Calendar, 
  DollarSign,
  TrendingUp,
  CheckCircle,
  XCircle,
  UserPlus,
  Stethoscope,
  Shield
} from 'lucide-react';
import { SystemRepo } from '@/backend/repositories/system';
import { DoctorsRepo } from '@/backend/repositories/doctors';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

import { AdminRoleManager } from '@/components/AdminRoleManager';
import { AdminAnalytics } from '@/components/AdminAnalytics';

// Split into smaller components for better performance
const StatsCard = memo(({ title, value, icon: Icon, trend, color = "primary" }: any) => (
  <Card className="medical-card hover:shadow-lg transition-all duration-300">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className={`text-3xl font-bold text-${color}`}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {trend && (
            <p className="text-xs text-green-600 flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              {trend}
            </p>
          )}
        </div>
        <div className={`p-3 bg-${color}/10 rounded-full`}>
          <Icon className={`h-6 w-6 text-${color}`} />
        </div>
      </div>
    </CardContent>
  </Card>
));

StatsCard.displayName = 'StatsCard';

const PendingDoctorRow = memo(({ doctor, onApprove, onReject, isLoading }: any) => (
  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
    <div className="flex-1">
      <h4 className="font-medium">
        Dr. {doctor.profiles?.first_name} {doctor.profiles?.last_name}
      </h4>
      <p className="text-sm text-muted-foreground">{doctor.speciality}</p>
      <p className="text-xs text-muted-foreground">{doctor.practice_name}</p>
    </div>
    <div className="text-right mr-4">
      <p className="text-sm font-medium">{doctor.years_experience} years exp.</p>
      <p className="text-xs text-muted-foreground">
        R{((doctor.consultation_fee || 0) / 100).toFixed(2)}
      </p>
    </div>
    <div className="flex gap-2">
      <Button
        size="sm"
        onClick={() => onApprove(doctor.id)}
        disabled={isLoading}
        className="bg-green-600 hover:bg-green-700"
      >
        <CheckCircle className="h-4 w-4 mr-1" />
        Approve
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => onReject(doctor.id)}
        disabled={isLoading}
        className="text-red-600 border-red-200 hover:bg-red-50"
      >
        <XCircle className="h-4 w-4 mr-1" />
        Reject
      </Button>
    </div>
  </div>
));

PendingDoctorRow.displayName = 'PendingDoctorRow';

// Main dashboard content component
const OptimizedAdminDashboardContent = memo(() => {
  const [stats, setStats] = useState({
    totalDoctors: 0,
    pendingApplications: 0,
    totalBookings: 0,
    totalRevenue: 0,
    totalUsers: 0,
    premiumMembers: 0
  });
  const [pendingDoctors, setPendingDoctors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const { toast } = useToast();

  // Memoized stats cards configuration
  const statsCards = useMemo(() => [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      trend: "+12% from last month",
      color: "primary"
    },
    {
      title: "Approved Doctors", 
      value: stats.totalDoctors,
      icon: UserCheck,
      trend: "+5% from last month",
      color: "green"
    },
    {
      title: "Pending Applications",
      value: stats.pendingApplications,
      icon: Clock,
      color: "orange"
    },
    {
      title: "Total Bookings",
      value: stats.totalBookings,
      icon: Calendar,
      trend: "+18% from last month",
      color: "blue"
    },
    {
      title: "Revenue",
      value: `R${(stats.totalRevenue).toFixed(2)}`,
      icon: DollarSign,
      trend: "+23% from last month",
      color: "green"
    },
    {
      title: "Premium Members",
      value: stats.premiumMembers,
      icon: Shield,
      trend: "+8% from last month",
      color: "purple"
    }
  ], [stats]);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch stats from Django backend
      const data = await SystemRepo.getAdminStats();
      
      // Map Django response to stats state
      setStats({
        totalDoctors: data.total_doctors,
        pendingApplications: data.pending_doctors ? data.pending_doctors.length : 0,
        totalBookings: data.total_bookings,
        totalRevenue: data.total_revenue,
        totalUsers: data.total_users,
        premiumMembers: data.premium_members
      });
      
      // Use the pending doctors from the stats response or fetch separately if needed
      // Our admin_stats endpoint returns pending_doctors list
      setPendingDoctors(data.pending_doctors || []);

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data. ' + (error.message || ''),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleApproveDoctor = async (id: string) => {
    setActionLoading(true);
    try {
      await DoctorsRepo.verify(id);
      
      toast({
        title: 'Doctor Approved',
        description: 'The doctor application has been approved.',
      });
      
      // Refresh data
      fetchDashboardData();
    } catch (error: any) {
      console.error('Error approving doctor:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve doctor. ' + (error.message || ''),
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectDoctor = async (id: string) => {
    if (!confirm('Are you sure you want to reject this application? This action cannot be undone.')) return;
    
    setActionLoading(true);
    try {
      // Currently Django repo only supports delete for rejection/removal
      await DoctorsRepo.delete(id);
      
      toast({
        title: 'Application Rejected',
        description: 'The doctor application has been rejected and removed.',
      });
      
      // Refresh data
      fetchDashboardData();
    } catch (error: any) {
      console.error('Error rejecting doctor:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject application. ' + (error.message || ''),
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-medical-gradient">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-2">Manage doctors, users, and monitor platform activity</p>
          </div>
          <Badge variant="secondary" className="text-sm">
            <Shield className="h-4 w-4 mr-2" />
            Admin Access
          </Badge>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {statsCards.map((stat, index) => (
            <StatsCard key={index} {...stat} />
          ))}
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="doctors" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="doctors">
              <Stethoscope className="h-4 w-4 mr-2" />
              Doctor Applications
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              User Management  
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <TrendingUp className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="doctors" className="space-y-6">
            <Card className="medical-hero-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Pending Doctor Applications ({pendingDoctors.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pendingDoctors.length === 0 ? (
                  <div className="text-center py-8">
                    <UserCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No pending applications</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingDoctors.map((doctor: any) => (
                      <PendingDoctorRow
                        key={doctor.id}
                        doctor={doctor}
                        onApprove={handleApproveDoctor}
                        onReject={handleRejectDoctor}
                        isLoading={isLoading}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <AdminRoleManager />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <AdminAnalytics />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
});

OptimizedAdminDashboardContent.displayName = 'OptimizedAdminDashboardContent';

const OptimizedAdminDashboard = memo(() => {
  return (
    <AdminGuard>
      <OptimizedAdminDashboardContent />
    </AdminGuard>
  );
});

OptimizedAdminDashboard.displayName = 'OptimizedAdminDashboard';

export default OptimizedAdminDashboard;
