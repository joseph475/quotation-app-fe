import { h } from 'preact';
import { useState } from 'preact/hooks';
import { 
  Input, 
  Select, 
  SearchableSelect, 
  MultiSelect,
  Card,
  Button
} from '../../components/common';

/**
 * Example page demonstrating the usage of input components
 */
const InputComponentsExamplePage = () => {
  // Sample data for dropdowns
  const countries = [
    { id: 'ph', name: 'Philippines' },
    { id: 'us', name: 'United States' },
    { id: 'ca', name: 'Canada' },
    { id: 'uk', name: 'United Kingdom' },
    { id: 'au', name: 'Australia' },
    { id: 'jp', name: 'Japan' },
    { id: 'sg', name: 'Singapore' },
    { id: 'my', name: 'Malaysia' },
  ];
  
  const categories = [
    'Electronics',
    'Clothing',
    'Food',
    'Books',
    'Sports',
    'Home',
    'Beauty',
    'Toys',
  ];
  
  const tags = [
    { value: 'new', label: 'New' },
    { value: 'sale', label: 'Sale' },
    { value: 'popular', label: 'Popular' },
    { value: 'trending', label: 'Trending' },
    { value: 'featured', label: 'Featured' },
    { value: 'limited', label: 'Limited Edition' },
    { value: 'exclusive', label: 'Exclusive' },
    { value: 'clearance', label: 'Clearance' },
  ];
  
  // State for form values
  const [formValues, setFormValues] = useState({
    name: '',
    email: '',
    country: '',
    category: '',
    tags: [],
    searchableCountry: '',
    notes: '',
  });
  
  // State for form errors (for demonstration)
  const [errors, setErrors] = useState({});
  
  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormValues(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error when field is changed
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };
  
  // Handle select changes
  const handleSelectChange = (e) => {
    handleChange(e);
  };
  
  // Handle searchable select changes
  const handleSearchableSelectChange = (option, name) => {
    const value = typeof option === 'object' ? option.id : option;
    setFormValues(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error when field is changed
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };
  
  // Handle multi select changes
  const handleMultiSelectChange = (selectedValues, name) => {
    setFormValues(prev => ({
      ...prev,
      [name]: selectedValues,
    }));
    
    // Clear error when field is changed
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate form (simple example)
    const newErrors = {};
    if (!formValues.name) newErrors.name = 'Name is required';
    if (!formValues.email) newErrors.email = 'Email is required';
    if (!formValues.country) newErrors.country = 'Country is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Form is valid, show the values
    alert('Form submitted successfully!\n\n' + JSON.stringify(formValues, null, 2));
  };
  
  // Icons for demonstration
  const userIcon = (
    <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
    </svg>
  );
  
  const emailIcon = (
    <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
    </svg>
  );
  
  const globeIcon = (
    <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clip-rule="evenodd" />
    </svg>
  );
  
  const tagIcon = (
    <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
    </svg>
  );
  
  return (
    <div class="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <h1 class="text-2xl font-bold text-gray-900 mb-6">Input Components Examples</h1>
      
      <form onSubmit={handleSubmit} class="space-y-8">
        {/* Basic Input Examples */}
        <Card title="Basic Input Examples">
          <div class="space-y-4">
            <Input
              id="name"
              name="name"
              type="text"
              label="Name"
              placeholder="Enter your name"
              value={formValues.name}
              onChange={handleChange}
              error={errors.name}
              required
              leftIcon={userIcon}
            />
            
            <Input
              id="email"
              name="email"
              type="email"
              label="Email"
              placeholder="Enter your email"
              value={formValues.email}
              onChange={handleChange}
              error={errors.email}
              required
              leftIcon={emailIcon}
              helpText="We'll never share your email with anyone else."
            />
            
            <Input
              id="password"
              name="password"
              type="password"
              label="Password"
              placeholder="Enter your password"
              value={formValues.password}
              onChange={handleChange}
              error={errors.password}
              helpText="Password must be at least 8 characters long."
            />
            
            <Input
              id="disabled-input"
              name="disabled-input"
              type="text"
              label="Disabled Input"
              placeholder="This input is disabled"
              value="Disabled value"
              disabled
            />
          </div>
        </Card>
        
        {/* Select Examples */}
        <Card title="Select Examples">
          <div class="space-y-4">
            <Select
              id="country"
              name="country"
              label="Country"
              placeholder="Select your country"
              value={formValues.country}
              onChange={handleSelectChange}
              options={countries}
              optionValueKey="id"
              optionLabelKey="name"
              error={errors.country}
              required
              leftIcon={globeIcon}
            />
            
            <Select
              id="category"
              name="category"
              label="Category"
              placeholder="Select a category"
              value={formValues.category}
              onChange={handleSelectChange}
              options={categories}
              error={errors.category}
              helpText="Select a category for your product."
            />
            
            <Select
              id="disabled-select"
              name="disabled-select"
              label="Disabled Select"
              placeholder="This select is disabled"
              value=""
              options={categories}
              disabled
            />
          </div>
        </Card>
        
        {/* Searchable Select Examples */}
        <Card title="Searchable Select Examples">
          <div class="space-y-4">
            <SearchableSelect
              id="searchable-country"
              name="searchableCountry"
              label="Country (Searchable)"
              placeholder="Search and select your country"
              value={formValues.searchableCountry}
              onChange={(option) => handleSearchableSelectChange(option, 'searchableCountry')}
              options={countries}
              optionValueKey="id"
              optionLabelKey="name"
              error={errors.searchableCountry}
              leftIcon={globeIcon}
              searchPlaceholder="Type to search countries..."
            />
            
            <SearchableSelect
              id="searchable-category"
              name="searchableCategory"
              label="Category (Searchable with Custom Values)"
              placeholder="Search or add a custom category"
              value={formValues.searchableCategory}
              onChange={(option) => handleSearchableSelectChange(option, 'searchableCategory')}
              options={categories}
              error={errors.searchableCategory}
              allowCustomValues
              searchPlaceholder="Type to search or add a category..."
              noOptionsMessage="No matching categories. Type to add a new one."
            />
          </div>
        </Card>
        
        {/* Multi Select Examples */}
        <Card title="Multi Select Examples">
          <div class="space-y-4">
            <MultiSelect
              id="tags"
              name="tags"
              label="Tags"
              placeholder="Select tags"
              value={formValues.tags}
              onChange={(values) => handleMultiSelectChange(values, 'tags')}
              options={tags}
              optionValueKey="value"
              optionLabelKey="label"
              error={errors.tags}
              leftIcon={tagIcon}
              searchPlaceholder="Search tags..."
            />
            
            <MultiSelect
              id="custom-tags"
              name="customTags"
              label="Custom Tags (with custom values)"
              placeholder="Add or select tags"
              value={formValues.customTags}
              onChange={(values) => handleMultiSelectChange(values, 'customTags')}
              options={tags}
              optionValueKey="value"
              optionLabelKey="label"
              error={errors.customTags}
              allowCustomValues
              searchPlaceholder="Type to search or add tags..."
              noOptionsMessage="No matching tags. Type to add a new one."
            />
          </div>
        </Card>
        
        {/* Form Actions */}
        <div class="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setFormValues({
                name: '',
                email: '',
                country: '',
                category: '',
                tags: [],
                searchableCountry: '',
                notes: '',
              });
              setErrors({});
            }}
          >
            Reset
          </Button>
          
          <Button
            type="submit"
            variant="primary"
          >
            Submit
          </Button>
        </div>
      </form>
      
      {/* Current Values Display */}
      <Card title="Current Form Values" className="mt-8">
        <pre class="bg-gray-100 p-4 rounded-md overflow-auto text-sm">
          {JSON.stringify(formValues, null, 2)}
        </pre>
      </Card>
    </div>
  );
};

export default InputComponentsExamplePage;
