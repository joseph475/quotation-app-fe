import { h, Fragment } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import UserManagementForm from '../../components/users/UserManagementForm';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import useAuth from '../../hooks/useAuth';
import api from '../../services/api';

const UserManagementPage = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Fetch users from API
  const fetchUsers = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await api.users.getAll();
      
      if (response && response.success) {
        // Filter users to only show those with role 'user'
        const filteredUsers = response.data.filter(user => user.role === 'user');
        
        // Map the response to match our component's expected format
        const formattedUsers = filteredUsers.map(user => ({
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone || 'No phone number',
          role: user.role,
          department: user.department || 'No department',
          isActive: true, // Assuming all users are active by default
        }));
        
        setUsers(formattedUsers);
      } else {
        throw new Error(response?.message || 'Failed to fetch users');
      }
      
      setIsLoading(false);
    } catch (err) {
      setError('Failed to fetch users. Please try again.');
      setIsLoading(false);
      console.error('Error fetching users:', err);
    }
  };

  // Handle user form submission
  const handleSubmitUser = async (formData) => {
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      // Always set role to 'user' for new users created in user management
      const userData = { ...formData, role: 'user' };
      
      if (selectedUser) {
        // Update existing user
        const response = await api.users.update(selectedUser.id, userData);
        
        if (response && response.success) {
          // Update the user in the local state
          const updatedUsers = users.map(user => 
            user.id === selectedUser.id ? { 
              ...user, 
              name: userData.name,
              email: userData.email,
              phone: userData.phone || 'No phone number',
              department: userData.department || 'No department'
            } : user
          );
          setUsers(updatedUsers);
          setSuccessMessage('User updated successfully!');
        } else {
          throw new Error(response?.message || 'Failed to update user');
        }
      } else {
        // Create new user
        const response = await api.users.create(userData);
        
        if (response && response.success) {
          // Add the new user to the local state
          const newUser = {
            id: response.data._id,
            name: response.data.name,
            email: response.data.email,
            phone: response.data.phone || 'No phone number',
            role: response.data.role,
            department: response.data.department || 'No department',
            isActive: true,
          };
          setUsers([...users, newUser]);
          setSuccessMessage('User created successfully!');
        } else {
          throw new Error(response?.message || 'Failed to create user');
        }
      }
      
      setIsLoading(false);
      setShowForm(false);
      setSelectedUser(null);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      setError(err.message || 'Failed to save user. Please try again.');
      setIsLoading(false);
    }
  };

  // Handle edit user
  const handleEditUser = (user) => {
    setSelectedUser(user);
    setShowForm(true);
    setError('');
  };

  
  // Handle delete user
  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await api.users.delete(userId);
      
      if (response && response.success) {
        const updatedUsers = users.filter(user => user.id !== userId);
        setUsers(updatedUsers);
        setSuccessMessage('User deleted successfully!');
      } else {
        throw new Error(response?.message || 'Failed to delete user');
      }
      
      setIsLoading(false);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      setError('Failed to delete user. Please try again.');
      setIsLoading(false);
    }
  };

  // Check if current user is admin
  const isAdmin = currentUser?.role === 'admin';

  return (
    <div class="container mx-auto px-4 py-8">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">User Management</h1>
          <p class="mt-1 text-sm text-gray-500">
            Manage users and their permissions
          </p>
        </div>
        {isAdmin && !showForm && (
          <Button
            variant="primary"
            onClick={() => {
              setSelectedUser(null);
              setShowForm(true);
              setError('');
            }}
            leftIcon={
              <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd" />
              </svg>
            }
          >
            Add User
          </Button>
        )}
        {showForm && (
          <Button
            variant="secondary"
            onClick={() => {
              setShowForm(false);
              setSelectedUser(null);
              setError('');
            }}
          >
            Cancel
          </Button>
        )}
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

      {/* Error message */}
      {error && !showForm && (
        <div class="mb-6 bg-red-50 border-l-4 border-red-400 p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-red-700">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* User Form */}
      {showForm && (
        <div class="mb-8">
          <h2 class="text-xl font-semibold text-gray-800 mb-4">
            {selectedUser ? 'Edit User' : 'Create New User'}
          </h2>
          <UserManagementForm
            user={selectedUser}
            onSubmit={handleSubmitUser}
            isLoading={isLoading}
            error={error}
          />
        </div>
      )}

      {/* Users List */}
      {!showForm && (
        <div>
          {isLoading && !users.length ? (
            <div class="text-center py-12">
              <svg class="mx-auto h-12 w-12 text-gray-400 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p class="mt-2 text-sm text-gray-500">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div class="text-center py-12 bg-white rounded-lg shadow">
              <svg class="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <h3 class="mt-2 text-sm font-medium text-gray-900">No users found</h3>
              <p class="mt-1 text-sm text-gray-500">Get started by creating a new user.</p>
              {isAdmin && (
                <div class="mt-6">
                  <Button
                    variant="primary"
                    onClick={() => {
                      setSelectedUser(null);
                      setShowForm(true);
                    }}
                  >
                    Add User
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div class="bg-white shadow overflow-hidden sm:rounded-md">
              <ul class="divide-y divide-gray-200">
                {users.map((user) => (
                  <li key={user.id}>
                    <div class="px-4 py-4 sm:px-6">
                      <div class="flex items-center justify-between">
                        <div class="flex items-center">
                          <div class="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <span class="text-lg font-medium text-gray-600">
                              {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </span>
                          </div>
                          <div class="ml-4">
                            <div class="flex items-center">
                              <h3 class="text-sm font-medium text-gray-900">{user.name}</h3>
                              {!user.isActive && (
                                <span class="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                  Inactive
                                </span>
                              )}
                              <span class="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                {user.role}
                              </span>
                            </div>
                            <div class="text-sm text-gray-500">
                              {user.email}
                            </div>
                          </div>
                        </div>
                        <div class="flex space-x-2">
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => handleEditUser(user)}
                                class="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                class="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <div class="mt-2 sm:flex sm:justify-between">
                        <div class="sm:flex">
                          <div class="flex items-center text-sm text-gray-500">
                            <svg class="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2a1 1 0 00-1-1H7a1 1 0 00-1 1v2a1 1 0 01-1 1H3a1 1 0 01-1-1V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clip-rule="evenodd" />
                            </svg>
                            {user.department || 'No department'}
                          </div>
                          <div class="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                            <svg class="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                            </svg>
                            {user.phone || 'No phone number'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;
