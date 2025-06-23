import { h } from 'preact';
import { useState } from 'preact/hooks';
import ProfileForm from '../../components/profile/ProfileForm';
import { useAuth } from '../../contexts/AuthContext';

const ProfilePage = () => {
  const { user, updateProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleUpdateProfile = async (formData) => {
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      // Use the updateProfile function from useAuth hook
      await updateProfile(formData);
      
      // Show success message
      setSuccessMessage('Profile updated successfully!');
      setIsLoading(false);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      setError(err.message || 'Failed to update profile. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div class="container mx-auto px-4 py-8">
      <div class="mb-8">
        <h1 class="text-2xl font-bold text-gray-900">My Profile</h1>
        <p class="mt-1 text-sm text-gray-500">
          Manage your account information and preferences
        </p>
      </div>

      {/* Success message */}
      {successMessage && (
        <div class="mb-6 bg-green-50 border-l-4 border-green-400 p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-green-700">
                {successMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      <div class="max-w-3xl mx-auto">
        <div class="bg-white shadow rounded-lg overflow-hidden mb-8">
          {/* Profile Header */}
          <div class="p-6 bg-gray-50 border-b border-gray-200">
            <div class="flex items-center">
              <div class="flex-shrink-0 h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-400">
                {user?.name ? (
                  <span class="text-xl font-medium">
                    {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </span>
                ) : (
                  <svg class="h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </div>
              <div class="ml-4">
                <h2 class="text-xl font-bold text-gray-900">{user?.name || 'User'}</h2>
                <div class="flex items-center mt-1">
                  <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    {user?.role || 'User'}
                  </span>
                  <span class="ml-2 text-sm text-gray-500">{user?.email || 'email@example.com'}</span>
                </div>
                {user?.branchName && (
                  <div class="mt-1">
                    <span class="text-sm text-gray-500">Branch: </span>
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {user.branchName}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Profile Form */}
          <div class="p-6">
            <ProfileForm 
              user={user}
              onUpdate={handleUpdateProfile}
              isLoading={isLoading}
              error={error}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
