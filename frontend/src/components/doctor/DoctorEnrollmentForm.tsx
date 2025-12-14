import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { supabase } from '@/integrations/supabase/client';
import { DoctorsRepo } from '@/backend/repositories/doctors';
import { api } from '@/lib/django-api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Upload, FileText } from 'lucide-react';

export const DoctorEnrollmentForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    practice_name: '',
    speciality: '',
    qualification: '',
    license_number: '',
    years_experience: '',
    consultation_fee: '',
    address: '',
    city: '',
    province: '',
    postal_code: '',
    bio: '',
    accepted_insurances: '',
  });
  
  const { user, signIn } = useAuth();
  const { toast } = useToast();
  const [applicant, setApplicant] = useState({ first_name: '', last_name: '', email: '', password: '', confirm_password: '' });
  const [licenseFile, setLicenseFile] = useState<File | null>(null);

  const specialties = [
    'General Practitioner',
    'Cardiologist',
    'Dermatologist',
    'Neurologist',
    'Pediatrician',
    'Psychiatrist',
    'Orthopedic Surgeon',
    'Gynecologist',
    'Urologist',
    'Radiologist',
    'Anesthesiologist',
    'Emergency Medicine',
    'Family Medicine',
    'Internal Medicine',
    'Other'
  ];

  const southAfricanProvinces = [
    'Eastern Cape',
    'Free State',
    'Gauteng',
    'KwaZulu-Natal',
    'Limpopo',
    'Mpumalanga',
    'Northern Cape',
    'North West',
    'Western Cape'
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let currentUser = user;

      // 1. Create user account if not logged in
      if (!currentUser) {
        if (applicant.password !== applicant.confirm_password) {
          throw new Error("Passwords do not match");
        }

        const signupData = {
          email: applicant.email,
          password: applicant.password,
          first_name: applicant.first_name,
          last_name: applicant.last_name,
          is_doctor: true,
          is_patient: false,
          role: 'doctor'
        };

        const { error: signupError } = await api.signup(signupData);
        if (signupError) {
             // Handle error format from Django (might be object with field errors)
             const msg = typeof signupError === 'object' ? Object.values(signupError).flat().join(', ') : String(signupError);
             throw new Error(msg || "Signup failed");
        }
        
        // Login to get token
        const { error: loginError } = await signIn(applicant.email, applicant.password);
        if (loginError) {
             throw new Error("Login failed after signup");
        }
        
        // Context is updated by signIn
        // Wait a bit for context to update or just assume we are logged in for the next step?
        // Actually, signIn sets the state, but 'user' variable in this closure is still null.
        // But DoctorsRepo uses api.request which reads token from localStorage.
        // signIn sets localStorage. So we are good to go.
      }

      // 2. Create Doctor Profile
      const acceptedInsArray = formData.accepted_insurances 
        ? formData.accepted_insurances.split(',').map(s => s.trim()).filter(Boolean) 
        : [];

      const payload = new FormData();
      payload.append('practice_name', formData.practice_name);
      payload.append('speciality', formData.speciality);
      payload.append('qualification', formData.qualification);
      payload.append('license_number', formData.license_number);
      payload.append('years_experience', formData.years_experience || '0');
      payload.append('price', formData.consultation_fee || '0');
      payload.append('address', formData.address);
      payload.append('city', formData.city);
      payload.append('province', formData.province);
      payload.append('postal_code', formData.postal_code);
      payload.append('bio', formData.bio);
      payload.append('accepted_insurances', JSON.stringify(acceptedInsArray));
      payload.append('is_available', 'false');
      payload.append('verified', 'false');
      
      if (licenseFile) {
        // Validate file size (max 5MB)
        if (licenseFile.size > 5 * 1024 * 1024) {
          throw new Error("License document must be less than 5MB");
        }
        
        // Validate file type
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(licenseFile.type)) {
           throw new Error("License document must be a PDF, JPG, or PNG file");
        }
        
        payload.append('license_document', licenseFile);
      } else {
          // If it's a new application, license document is usually required
          throw new Error("Please upload your license document");
      }
      
      await DoctorsRepo.create(payload);

      toast({
        title: 'Application Submitted',
        description: "Your application has been submitted for review. We'll contact you within 2-3 business days.",
      });

      // Reset form
      setFormData({
        practice_name: '',
        speciality: '',
        qualification: '',
        license_number: '',
        years_experience: '',
        consultation_fee: '',
        address: '',
        city: '',
        province: '',
        postal_code: '',
        bio: '',
        accepted_insurances: '',
      });
      
      if (!user) {
         setApplicant({ first_name: '', last_name: '', email: '', password: '', confirm_password: '' });
      }

    } catch (error: any) {
      console.error(error);
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-medical-gradient mb-4">
              Join Our Healthcare Network
            </h1>
            <p className="text-xl text-muted-foreground">
              Apply to become a verified healthcare provider on IronLedgerMedMap
            </p>
          </div>

          <Card className="medical-hero-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <FileText className="h-6 w-6" />
                Healthcare Provider Application
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!user && (
                <div className="mb-4 p-4 rounded-lg bg-accent/50 border border-primary/20 text-sm space-y-3">
                  <p className="text-foreground">Create your provider account and submit in one step:</p>
                  <div className="grid md:grid-cols-3 gap-3">
                    <div>
                      <Label>First name *</Label>
                      <Input value={applicant.first_name} onChange={(e) => setApplicant({ ...applicant, first_name: e.target.value })} required />
                    </div>
                    <div>
                      <Label>Last name *</Label>
                      <Input value={applicant.last_name} onChange={(e) => setApplicant({ ...applicant, last_name: e.target.value })} required />
                    </div>
                    <div>
                      <Label>Email *</Label>
                      <Input type="email" value={applicant.email} onChange={(e) => setApplicant({ ...applicant, email: e.target.value })} required />
                    </div>
                    <div>
                      <Label>Password *</Label>
                      <Input type="password" value={applicant.password} onChange={(e) => setApplicant({ ...applicant, password: e.target.value })} required />
                    </div>
                    <div>
                      <Label>Confirm Password *</Label>
                      <Input type="password" value={applicant.confirm_password} onChange={(e) => setApplicant({ ...applicant, confirm_password: e.target.value })} required />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">We’ll create your account and submit your application.</p>
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Practice Information */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="practice_name">Practice Name *</Label>
                    <Input
                      id="practice_name"
                      value={formData.practice_name}
                      onChange={(e) => handleInputChange('practice_name', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="speciality">Specialty *</Label>
                    <select
                      id="speciality"
                      value={formData.speciality}
                      onChange={(e) => handleInputChange('speciality', e.target.value)}
                      required
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="" disabled>Select your specialty</option>
                      {specialties.map((specialty) => (
                        <option key={specialty} value={specialty}>{specialty}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Qualifications */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="qualification">Qualification *</Label>
                    <Input
                      id="qualification"
                      placeholder="e.g., MBChB, MD, DO"
                      value={formData.qualification}
                      onChange={(e) => handleInputChange('qualification', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="license_number">HPCSA License Number *</Label>
                    <Input
                      id="license_number"
                      value={formData.license_number}
                      onChange={(e) => handleInputChange('license_number', e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* License Document Upload */}
                <div className="space-y-2">
                  <Label htmlFor="license_document">Upload License Document</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="license_document"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setLicenseFile(e.target.files ? e.target.files[0] : null)}
                      className="cursor-pointer"
                    />
                    {licenseFile && (
                      <span className="text-sm text-green-600 flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {licenseFile.name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Upload a copy of your HPCSA registration (PDF, JPG, PNG)</p>
                </div>

                {/* Experience & Fees */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="years_experience">Years of Experience</Label>
                    <Input
                      id="years_experience"
                      type="number"
                      min="0"
                      value={formData.years_experience}
                      onChange={(e) => handleInputChange('years_experience', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="consultation_fee">Consultation Fee (ZAR) *</Label>
                    <Input
                      id="consultation_fee"
                      type="number"
                      min="0"
                      placeholder="e.g., 500"
                      value={formData.consultation_fee}
                      onChange={(e) => handleInputChange('consultation_fee', e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="address">Practice Address *</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="province">Province *</Label>
                      <select
                        id="province"
                        value={formData.province}
                        onChange={(e) => handleInputChange('province', e.target.value)}
                        required
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="" disabled>Select province</option>
                        {southAfricanProvinces.map((province) => (
                          <option key={province} value={province}>{province}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="postal_code">Postal Code *</Label>
                      <Input
                        id="postal_code"
                        value={formData.postal_code}
                        onChange={(e) => handleInputChange('postal_code', e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="bio">Professional Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell patients about your experience, approach to healthcare, and what makes you unique..."
                    value={formData.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    rows={4}
                  />
                </div>

                {/* Accepted Insurance / Medical Aids */}
                <div className="space-y-2">
                  <Label htmlFor="accepted_insurances">Accepted Medical Aids / Insurance (comma-separated)</Label>
                  <Input
                    id="accepted_insurances"
                    placeholder="e.g., Discovery Health, Bonitas"
                    value={formData.accepted_insurances}
                    onChange={(e) => handleInputChange('accepted_insurances', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">List accepted medical aids or insurance providers separated by commas.</p>
                </div>

                {/* Requirements Notice */}
                <div className="bg-accent/50 p-4 rounded-lg border-l-4 border-primary">
                  <h4 className="font-semibold text-primary mb-2">Required Documents</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Valid HPCSA registration certificate</li>
                    <li>• Professional indemnity insurance certificate</li>
                    <li>• Qualification certificates</li>
                    <li>• Practice registration documents</li>
                  </ul>
                  <p className="text-xs text-muted-foreground mt-2">
                    Our team will contact you via email to request these documents after application submission.
                  </p>
                </div>

                <Button 
                  type="submit" 
                  className="w-full btn-medical-primary"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting Application...
                    </>
                  ) : (
                    'Submit Application'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
