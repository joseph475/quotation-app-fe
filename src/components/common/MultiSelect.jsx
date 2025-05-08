import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';

/**
 * MultiSelect component for selecting multiple options from a dropdown
 * 
 * @param {Object} props - Component props
 * @param {string} [props.id] - Select ID
 * @param {string} [props.name] - Select name
 * @param {string} [props.label] - Select label
 * @param {Array} [props.value] - Array of selected values
 * @param {Function} [props.onChange] - Change handler that receives the array of selected options
 * @param {Array} [props.options] - Array of options to display
 * @param {string} [props.optionValueKey='value'] - Key to use for option value
 * @param {string} [props.optionLabelKey='label'] - Key to use for option label
 * @param {string} [props.placeholder] - Placeholder text for empty selection
 * @param {string} [props.searchPlaceholder] - Placeholder text for search input
 * @param {string} [props.noOptionsMessage] - Message to display when no options match the search
 * @param {string} [props.error] - Error message
 * @param {string} [props.helpText] - Help text
 * @param {boolean} [props.disabled=false] - Whether the select is disabled
 * @param {boolean} [props.required=false] - Whether the select is required
 * @param {string} [props.className] - Additional CSS classes
 * @param {JSX.Element} [props.leftIcon] - Icon to display on the left
 * @param {boolean} [props.allowCustomValues=false] - Whether to allow custom values not in the options list
 */
const MultiSelect = ({
  id,
  name,
  label,
  value = [],
  onChange,
  options = [],
  optionValueKey = 'value',
  optionLabelKey = 'label',
  placeholder = 'Select options',
  searchPlaceholder = 'Search...',
  noOptionsMessage = 'No options found',
  error,
  helpText,
  disabled = false,
  required = false,
  className = '',
  leftIcon,
  allowCustomValues = false,
  ...rest
}) => {
  // Generate a unique ID if not provided
  const selectId = id || `multi-select-${name || Math.random().toString(36).substring(2, 9)}`;
  
  // State for the component
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options);
  const [selectedValues, setSelectedValues] = useState(value || []);
  
  // Ref for the dropdown container
  const dropdownRef = useRef(null);
  
  // Base classes
  const baseInputClasses = 'block w-full rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm';
  
  // Error classes
  const errorClasses = error ? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300';
  
  // Disabled classes
  const disabledClasses = disabled ? 'bg-gray-100 cursor-not-allowed' : '';
  
  // Icon classes
  const leftIconClasses = leftIcon ? 'pl-10' : '';
  
  // Combine classes
  const inputClasses = [
    baseInputClasses,
    errorClasses,
    disabledClasses,
    leftIconClasses,
    className,
  ].join(' ');
  
  // Update selected values when value prop changes
  useEffect(() => {
    setSelectedValues(value || []);
  }, [value]);
  
  // Filter options based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredOptions(options);
    } else {
      const filtered = options.filter(option => {
        const label = typeof option === 'object' ? option[optionLabelKey] : option;
        return label.toLowerCase().includes(searchTerm.toLowerCase());
      });
      setFilteredOptions(filtered);
    }
  }, [searchTerm, options, optionLabelKey]);
  
  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Get display labels for selected values
  const getSelectedLabels = () => {
    return selectedValues.map(selectedValue => {
      const option = options.find(opt => {
        const optValue = typeof opt === 'object' ? opt[optionValueKey] : opt;
        return optValue === selectedValue;
      });
      
      return option 
        ? (typeof option === 'object' ? option[optionLabelKey] : option) 
        : selectedValue;
    });
  };
  
  // Handle option toggle
  const handleOptionToggle = (option) => {
    const optionValue = typeof option === 'object' ? option[optionValueKey] : option;
    
    let newSelectedValues;
    if (selectedValues.includes(optionValue)) {
      // Remove the value if already selected
      newSelectedValues = selectedValues.filter(val => val !== optionValue);
    } else {
      // Add the value if not already selected
      newSelectedValues = [...selectedValues, optionValue];
    }
    
    setSelectedValues(newSelectedValues);
    
    if (onChange) {
      onChange(newSelectedValues);
    }
  };
  
  // Handle custom value submission
  const handleCustomValueSubmit = () => {
    if (!searchTerm || !allowCustomValues) return;
    
    if (!selectedValues.includes(searchTerm)) {
      const newSelectedValues = [...selectedValues, searchTerm];
      setSelectedValues(newSelectedValues);
      
      if (onChange) {
        onChange(newSelectedValues);
      }
    }
    
    setSearchTerm('');
  };
  
  // Handle input click
  const handleInputClick = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setSearchTerm('');
      }
    }
  };
  
  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };
  
  // Handle search input keydown
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      if (filteredOptions.length > 0) {
        handleOptionToggle(filteredOptions[0]);
      } else if (allowCustomValues && searchTerm) {
        handleCustomValueSubmit();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
    }
  };
  
  // Handle removing a selected item
  const handleRemoveItem = (value) => {
    const newSelectedValues = selectedValues.filter(val => val !== value);
    setSelectedValues(newSelectedValues);
    
    if (onChange) {
      onChange(newSelectedValues);
    }
  };
  
  // Check if an option is selected
  const isOptionSelected = (optionValue) => {
    return selectedValues.includes(optionValue);
  };
  
  return (
    <div>
      {/* Label */}
      {label && (
        <label htmlFor={selectId} class="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span class="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      {/* Multi Select */}
      <div ref={dropdownRef} class="relative">
        {/* Display Input */}
        <div class="relative rounded-md shadow-sm">
          {/* Left icon */}
          {leftIcon && (
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {leftIcon}
            </div>
          )}
          
          {/* Input element */}
          <div
            class={`${inputClasses} py-2 px-3 min-h-[38px] flex flex-wrap items-center cursor-pointer ${isOpen ? 'ring-2 ring-primary-500' : ''}`}
            onClick={handleInputClick}
            role="button"
            tabIndex="0"
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-labelledby={label ? `${selectId}-label` : undefined}
          >
            {selectedValues.length > 0 ? (
              <div class="flex flex-wrap gap-1">
                {getSelectedLabels().map((label, index) => (
                  <div 
                    key={index} 
                    class="bg-primary-100 text-primary-800 text-xs rounded-full px-2 py-1 flex items-center"
                  >
                    <span class="mr-1">{label}</span>
                    <button
                      type="button"
                      class="text-primary-500 hover:text-primary-700 focus:outline-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveItem(selectedValues[index]);
                      }}
                      aria-label={`Remove ${label}`}
                    >
                      <svg class="h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <span class="text-gray-500">{placeholder}</span>
            )}
            <span class="ml-auto inset-y-0 right-0 flex items-center pointer-events-none">
              <svg class={`h-5 w-5 text-gray-400 transform ${isOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </span>
          </div>
        </div>
        
        {/* Dropdown */}
        {isOpen && (
          <div class="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 overflow-hidden">
            {/* Search Input */}
            <div class="p-2 border-b border-gray-200">
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
                  </svg>
                </div>
                <input
                  type="text"
                  class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onKeyDown={handleSearchKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
              </div>
            </div>
            
            {/* Options List */}
            <div class="max-h-60 overflow-y-auto">
              {filteredOptions.length > 0 ? (
                <ul class="py-1" role="listbox" aria-multiselectable="true">
                  {filteredOptions.map((option, index) => {
                    const optionValue = typeof option === 'object' ? option[optionValueKey] : option;
                    const optionLabel = typeof option === 'object' ? option[optionLabelKey] : option;
                    const isSelected = isOptionSelected(optionValue);
                    
                    return (
                      <li
                        key={optionValue || index}
                        class={`px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center justify-between ${isSelected ? 'bg-primary-50' : ''}`}
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => handleOptionToggle(option)}
                      >
                        <span class="block truncate">{optionLabel}</span>
                        {isSelected && (
                          <svg class="h-5 w-5 text-primary-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                          </svg>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div class="px-4 py-3 text-sm text-gray-500">
                  {allowCustomValues ? (
                    <div>
                      <p>{noOptionsMessage}</p>
                      {searchTerm && (
                        <button
                          type="button"
                          class="mt-2 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                          onClick={handleCustomValueSubmit}
                        >
                          <svg class="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
                          </svg>
                          Add "{searchTerm}"
                        </button>
                      )}
                    </div>
                  ) : (
                    noOptionsMessage
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Error message */}
      {error && (
        <p class="mt-2 text-sm text-red-600" id={`${selectId}-error`}>
          {error}
        </p>
      )}
      
      {/* Help text */}
      {!error && helpText && (
        <p class="mt-2 text-sm text-gray-500" id={`${selectId}-description`}>
          {helpText}
        </p>
      )}
      
      {/* Hidden input for form submission */}
      <input
        type="hidden"
        name={name}
        value={selectedValues.join(',')}
        {...rest}
      />
    </div>
  );
};

export default MultiSelect;
