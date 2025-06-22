import { h } from 'preact';
import { useState } from 'preact/hooks';
import LoginForm from '../../components/auth/LoginForm';
import useAuth from '../../hooks/useAuth';

const LoginPage = () => {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (formData) => {
    setIsLoading(true);
    setError('');

    try {
      console.log('LoginPage.handleLogin received formData:', {
        email: formData.email,
        hasPassword: !!formData.password,
        hasDeviceFingerprint: !!formData.deviceFingerprint,
        deviceFingerprintKeys: formData.deviceFingerprint ? Object.keys(formData.deviceFingerprint) : [],
        allFormDataKeys: Object.keys(formData)
      });
      
      // Use the login function from useAuth hook - pass ALL formData
      await login(formData);
      
      // Redirect will be handled by the useAuth hook
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8 animate-gradient-x">
      <div class="max-w-md w-full">
        {/* Left side decorative elements */}
        <div class="absolute left-0 top-0 h-full w-1/4 overflow-hidden opacity-20 pointer-events-none">
          <div class="absolute -left-10 top-1/4 w-40 h-40 rounded-full bg-primary-400 blur-3xl"></div>
          <div class="absolute -left-10 bottom-1/4 w-40 h-40 rounded-full bg-secondary-400 blur-3xl"></div>
        </div>
        
        {/* Right side decorative elements */}
        <div class="absolute right-0 top-0 h-full w-1/4 overflow-hidden opacity-20 pointer-events-none">
          <div class="absolute -right-10 top-1/3 w-40 h-40 rounded-full bg-success-400 blur-3xl"></div>
          <div class="absolute -right-10 bottom-1/3 w-40 h-40 rounded-full bg-primary-400 blur-3xl"></div>
        </div>
        
        <div class="bg-white/80 backdrop-blur-sm shadow-2xl rounded-2xl overflow-hidden border border-gray-100">
          <div class="p-8 space-y-8">
            <div class="text-center">
              <div class="flex justify-center mb-6">
                <div class="h-20 w-20 rounded-full bg-gradient-to-r from-primary-500 to-primary-700 flex items-center justify-center shadow-lg transform transition-transform hover:scale-105">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
              <h2 class="mt-2 text-center text-3xl font-bold font-heading text-gray-900">
                Welcome Back
              </h2>
              <p class="mt-2 text-center text-sm text-gray-600">
                Sign in to access your account
              </p>
            </div>
            
            <LoginForm 
              onLogin={handleLogin}
              isLoading={isLoading}
              error={error}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
