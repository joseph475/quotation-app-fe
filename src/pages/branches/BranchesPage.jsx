import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';
import BranchForm from '../../components/branches/BranchForm';
import { getFromStorage, storeInStorage } from '../../utils/localStorageHelpers';

const BranchesPage = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentBranch, setCurrentBranch] = useState(null);

  useEffect(() => {
    // Only fetch branches if the user is authenticated
    if (isAuthenticated) {
      fetchBranches();
    } else if (!isLoading) {
      // If authentication check is complete and user is not authenticated, redirect to login
      route('/login', true);
    }
  }, [isAuthenticated, isLoading]);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      
      // Try to get branches from local storage
      const storedBranches = getFromStorage('branches');
      
      if (storedBranches && Array.isArray(storedBranches)) {
        setBranches(storedBranches);
        setError(null);
      } else {
        // Fallback to API if not in local storage
        const response = await api.branches.getAll();
        
        // Check if response has the expected structure
        if (response && response.data) {
          setBranches(response.data);
          setError(null);
        } else {
          console.error('Unexpected response format:', response);
          setError('Received unexpected data format from server.');
        }
      }
    } catch (err) {
      setError('Failed to fetch branches. Please try again later.');
      console.error('Error fetching branches:', err);
      
      // Check if the error is due to authentication
      if (err.message && err.message.includes('401')) {
        setError('Authentication error. Please log in again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setCurrentBranch(null);
    setIsModalOpen(true);
  };

  const handleEdit = (branch) => {
    setCurrentBranch(branch);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this branch?')) {
      try {
        const response = await api.branches.delete(id);
        
        if (response && response.success) {
          // Get updated branches list
          const updatedBranchesResponse = await api.branches.getAll();
          
          if (updatedBranchesResponse && updatedBranchesResponse.success) {
            // Update local storage with new branches data
            storeInStorage('branches', updatedBranchesResponse.data || []);
            
            // Update state
            setBranches(updatedBranchesResponse.data || []);
          } else {
            // If API call fails, just refresh branches
            fetchBranches();
          }
        } else {
          throw new Error(response?.message || 'Failed to delete branch');
        }
      } catch (err) {
        setError('Failed to delete branch. Please try again later.');
        console.error('Error deleting branch:', err);
      }
    }
  };

  const handleFormSubmit = async (formData) => {
    try {
      if (currentBranch) {
        // Update existing branch
        const response = await api.branches.update(currentBranch._id, formData);
        if (response && response.success) {
          // Get updated branches list
          const updatedBranchesResponse = await api.branches.getAll();
          
          if (updatedBranchesResponse && updatedBranchesResponse.success) {
            // Update local storage with new branches data
            storeInStorage('branches', updatedBranchesResponse.data || []);
            
            // Update state
            setBranches(updatedBranchesResponse.data || []);
          } else {
            // If API call fails, just refresh branches
            fetchBranches();
          }
          
          setIsModalOpen(false);
          return { success: true };
        } else {
          return { error: response?.message || 'Failed to update branch' };
        }
      } else {
        // Create new branch
        console.log('Creating new branch with data:', formData);
        const response = await api.branches.create(formData);
        console.log('Create branch response:', response);
        
        if (response && response.success) {
          // Get updated branches list
          const updatedBranchesResponse = await api.branches.getAll();
          
          if (updatedBranchesResponse && updatedBranchesResponse.success) {
            // Update local storage with new branches data
            storeInStorage('branches', updatedBranchesResponse.data || []);
            
            // Update state
            setBranches(updatedBranchesResponse.data || []);
          } else {
            // If API call fails, just refresh branches
            fetchBranches();
          }
          
          setIsModalOpen(false);
          return { success: true };
        } else {
          return { error: response?.message || 'Failed to create branch' };
        }
      }
    } catch (err) {
      console.error('Error saving branch:', err);
      return { error: err.response?.data?.message || 'Failed to save branch' };
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Branch Management</h1>
        <button
          onClick={handleAddNew}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add New Branch
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      ) : branches.length === 0 ? (
        <div className="bg-gray-100 rounded-md p-6 text-center">
          <p className="text-gray-600">No branches found. Add your first branch to get started.</p>
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Address
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact Number
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Manager
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {branches.map((branch) => (
                <tr key={branch._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{branch.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{branch.address}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{branch.contactNumber}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{branch.manager}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(branch)}
                      className="text-primary-600 hover:text-primary-900 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(branch._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <BranchForm
          branch={currentBranch}
          onSubmit={handleFormSubmit}
          onCancel={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
};

export default BranchesPage;
