import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Shield, User, Search, CheckCircle, XCircle, ArrowRightLeft } from 'lucide-react';
import { ProfilesRepo } from '@/backend/repositories/profiles';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  email_verified: boolean;
  created_at: string;
}

export const AdminRoleManager = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchUsers();
    }
  }, [profile]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch users from Django via ProfilesRepo (extended to support list)
      // Note: ProfilesRepo.getProfile needs to be adapted or we need a new method.
      // Assuming ProfilesRepo has a list method or we add it. 
      // For now, let's assume we can fetch all profiles.
      // The current ProfilesRepo only has getProfile and upsert.
      // We'll need to use api.get('/api/users/profiles/') if available or mock it.
      
      // Temporary: fetch current user only as placeholder or use mock list
      const allUsers = await ProfilesRepo.listAllProfiles(); // We need to add this method to Repo
      setUsers(allUsers as any[]);
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const searchUser = async () => {
    if (!searchEmail.trim()) {
      toast({
        title: "Error", 
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      const results = await ProfilesRepo.searchProfiles(searchEmail.trim());
      
      if (results && results.length > 0) {
        // Add to users list if not already present
        setUsers(prevUsers => {
          const exists = prevUsers.find(u => u.id === results[0].id);
          if (exists) return prevUsers;
          return [results[0] as any, ...prevUsers];
        });
        
        setSearchEmail('');
        toast({
          title: "User Found",
          description: `Found user: ${results[0].email}`,
        });
      } else {
        toast({
          title: "Not Found",
          description: "No user found with that email",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      // Map role string to boolean flags for Django User model
      // This logic should ideally be in the backend or a dedicated Repo method
      await ProfilesRepo.updateRole(userId, newRole);

      setUsers(users.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ));

      toast({
        title: "Success",
        description: "User role updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
    }
  };

  const handleImpersonate = async (userId: string) => {
    try {
        const data = await ProfilesRepo.impersonateUser(userId);
        if (data && data.access) {
            localStorage.setItem('access_token', data.access);
            localStorage.setItem('refresh_token', data.refresh);
            
            toast({
                title: "Impersonation Successful",
                description: `You are now logged in as ${data.email}`,
            });

            // Reload to reset auth state
            window.location.href = '/';
        }
    } catch (error: any) {
        toast({
            title: "Impersonation Failed",
            description: error.message || "Failed to impersonate user",
            variant: "destructive"
        });
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-destructive text-destructive-foreground">Admin</Badge>;
      case 'doctor':
        return <Badge className="bg-primary text-primary-foreground">Doctor</Badge>;
      case 'patient':
        return <Badge variant="secondary">Patient</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  if (profile?.role !== 'admin') {
    return (
      <Alert variant="destructive">
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Access denied. Admin privileges required.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="medical-card">
        <CardHeader>
          <CardTitle className="text-xl text-medical-gradient flex items-center gap-2">
            <User className="h-5 w-5" />
            User Management
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Search Section */}
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="searchEmail">Search by Email</Label>
              <Input
                id="searchEmail"
                type="email"
                placeholder="Enter user email address"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchUser()}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={searchUser}
                disabled={isSearching}
                className="btn-medical-primary"
              >
                {isSearching ? (
                  <>Loading...</>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Users Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Current Role</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        <span className="ml-2">Loading users...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <User className="h-8 w-8 text-muted-foreground" />
                        <span className="text-muted-foreground">No users found</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {user.first_name && user.last_name 
                              ? `${user.first_name} ${user.last_name}`
                              : 'No name provided'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            ID: {String(user.id)}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="font-mono text-sm">{user.email}</div>
                      </TableCell>
                      
                      <TableCell>
                        {getRoleBadge(user.role)}
                      </TableCell>
                      
                      <TableCell>
                        {user.email_verified ? (
                          <CheckCircle className="h-4 w-4 text-success" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                        <Select
                          value={user.role}
                          onValueChange={(newRole: 'patient' | 'doctor' | 'admin') => updateUserRole(user.id, newRole)}
                          disabled={user.id === profile?.id} // Prevent self-modification
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="patient">Patient</SelectItem>
                            <SelectItem value="doctor">Doctor</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleImpersonate(user.id)}
                            disabled={user.id === profile?.id}
                            title="Impersonate User"
                        >
                            <ArrowRightLeft className="h-4 w-4" />
                        </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> Changing user roles will immediately affect their access permissions. 
              Use this feature carefully and only assign admin roles to trusted users.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};