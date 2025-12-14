import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Mail, RefreshCw, Home, AlertCircle } from 'lucide-react';
import { api } from '@/lib/django-api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '@/components/Header';

const EmailVerification = () => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if there are verification tokens in the URL
    const token = searchParams.get('token');
    const type = searchParams.get('type');
    
    if (token && type === 'email_confirmation') {
      handleEmailConfirmation(token);
    }
    
    // Check if user is already verified
    if (user?.email_confirmed_at) {
      setIsVerified(true);
    }
  }, [searchParams, user]);

  const handleEmailConfirmation = async (token: string) => {
    setIsVerifying(true);
    setVerificationError(null);
    
    try {
      // Call Django API to verify email
      const response = await api.request('/users/verify_email/', {
        method: 'POST',
        body: JSON.stringify({ token })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to verify email');
      }
      
      const data = await response.json();

      // Assume success if we are here
      setIsVerified(true);
      await refreshProfile();
      
      toast({
        title: "Email Verified!",
        description: "Your email has been successfully verified. Welcome to IronLedgerMedMap!",
      });

      // Redirect to appropriate dashboard after a delay
      setTimeout(() => {
        // Use data.role if available, otherwise fallback to user state
        const role = data.role || user?.role;
        if (role === 'doctor') {
            navigate('/doctor');
        } else if (role === 'admin') {
            navigate('/admin');
        } else {
            navigate('/dashboard');
        }
      }, 2000);
      
    } catch (error: any) {
      setVerificationError(error.message || 'Failed to verify email');
      toast({
        title: "Verification Failed",
        description: error.message || 'Failed to verify your email. Please try again.',
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendVerification = async () => {
    if (!user?.email) {
      toast({
        title: "Error",
        description: "No email address found. Please sign in again.",
        variant: "destructive",
      });
      return;
    }

    setIsResending(true);
    
    try {
      const response = await api.request('/users/resend_verification/', {
        method: 'POST',
        body: JSON.stringify({ email: user.email })
      });
      
      if (!response.ok) {
        throw new Error('Failed to resend verification email');
      }
      
      toast({
        title: "Verification Email Sent",
        description: "Please check your inbox (and spam folder) for the verification link.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to resend verification email",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const handleGoToDashboard = () => {
    if (user?.user_metadata?.role === 'doctor') {
      navigate('/doctor');
    } else if (user?.user_metadata?.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <Card className="medical-card">
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                {isVerifying ? (
                  <RefreshCw className="h-8 w-8 text-primary animate-spin" />
                ) : isVerified ? (
                  <CheckCircle className="h-8 w-8 text-success" />
                ) : verificationError ? (
                  <AlertCircle className="h-8 w-8 text-destructive" />
                ) : (
                  <Mail className="h-8 w-8 text-primary" />
                )}
              </div>
              
              <CardTitle className="text-2xl text-medical-gradient">
                {isVerifying 
                  ? 'Verifying Email...' 
                  : isVerified 
                    ? 'Email Verified!' 
                    : verificationError
                      ? 'Verification Failed'
                      : 'Verify Your Email'
                }
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {isVerifying && (
                <div className="text-center">
                  <p className="text-muted-foreground">
                    Please wait while we verify your email address...
                  </p>
                </div>
              )}

              {isVerified && (
                <>
                  <Alert className="border-success/20 bg-success/10">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <AlertDescription className="text-success">
                      Your email has been successfully verified! You now have full access to IronLedgerMedMap.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="text-center space-y-3">
                    <p className="text-muted-foreground">
                      Welcome to South Africa's leading medical booking platform!
                    </p>
                    <Button 
                      className="btn-medical-primary w-full"
                      onClick={handleGoToDashboard}
                    >
                      Go to Dashboard
                    </Button>
                  </div>
                </>
              )}

              {verificationError && (
                <>
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {verificationError}
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-3">
                    <p className="text-center text-muted-foreground">
                      Don't worry! You can request a new verification email.
                    </p>
                    
                    <Button 
                      className="btn-medical-primary w-full"
                      onClick={handleResendVerification}
                      disabled={isResending}
                    >
                      {isResending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4 mr-2" />
                          Resend Verification Email
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}

              {!isVerifying && !isVerified && !verificationError && (
                <>
                  <div className="text-center space-y-4">
                    <p className="text-muted-foreground">
                      We've sent a verification email to <strong>{user?.email}</strong>
                    </p>
                    
                    <p className="text-sm text-muted-foreground">
                      Please check your email and click the verification link to activate your account.
                    </p>

                    <Alert>
                      <Mail className="h-4 w-4" />
                      <AlertDescription>
                        Don't forget to check your spam/junk folder if you don't see the email in your inbox.
                      </AlertDescription>
                    </Alert>
                  </div>

                  <div className="space-y-3">
                    <Button 
                      className="btn-medical-primary w-full"
                      onClick={handleResendVerification}
                      disabled={isResending}
                    >
                      {isResending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4 mr-2" />
                          Resend Verification Email
                        </>
                      )}
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="btn-medical-secondary w-full"
                      onClick={handleGoHome}
                    >
                      <Home className="h-4 w-4 mr-2" />
                      Back to Home
                    </Button>
                  </div>
                </>
              )}

              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  Having trouble? Contact our support team for assistance.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;