import React, { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ProfilesRepo } from '@/backend/repositories/profiles';
import { api } from '@/lib/django-api';

const Profile: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setPhone(profile.phone || '');
    }
  }, [profile]);

  const saveInfo = async () => {
    if (!user) return;
    setSavingInfo(true);
    try {
      await ProfilesRepo.upsert({
        id: user.id,
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        updated_at: new Date().toISOString(),
      });
      await refreshProfile();
      toast({ title: 'Profile updated', description: 'Your information has been saved.' });
    } catch (e: any) {
      toast({ title: 'Update failed', description: e.message, variant: 'destructive' });
    } finally {
      setSavingInfo(false);
    }
  };

  const changePassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      toast({ title: 'Weak password', description: 'Minimum 8 characters.', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Mismatch', description: 'Passwords do not match.', variant: 'destructive' });
      return;
    }
    if (!currentPassword) {
      toast({ title: 'Missing Password', description: 'Please enter your current password.', variant: 'destructive' });
      return;
    }

    setSavingPassword(true);
    try {
        await api.changePassword(currentPassword, newPassword);
        toast({ title: 'Success', description: 'Password changed successfully.' });
        
        setNewPassword('');
        setConfirmPassword('');
        setCurrentPassword('');
    } catch (e: any) {
      toast({ title: 'Change failed', description: e.message, variant: 'destructive' });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-medical-gradient">Profile</h1>
          <p className="text-muted-foreground">Manage your personal information and security</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Personal Info */}
          <Card className="medical-hero-card">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input value={user?.email || ''} disabled />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>First name</Label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div>
                  <Label>Last name</Label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. +27 82 000 0000" />
              </div>
              <Button onClick={saveInfo} disabled={savingInfo} className="btn-medical-primary">
                {savingInfo ? 'Saving...' : 'Save changes'}
              </Button>
            </CardContent>
          </Card>

          {/* Security */}
          <Card className="medical-hero-card">
            <CardHeader>
              <CardTitle>Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Current password</Label>
                  <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>New password</Label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
                <div>
                  <Label>Confirm password</Label>
                  <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </div>
              </div>
              <Button onClick={changePassword} disabled={savingPassword} className="btn-medical-secondary">
                {savingPassword ? 'Updating...' : 'Change password'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Profile;
