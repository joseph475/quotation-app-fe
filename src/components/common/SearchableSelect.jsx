import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';

// Hook to detect mobile devices
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return isMobile;
};

/**
 * SearchableSelect component for searchable dropdown selections
 * 
 * @param {Object} props - Component props
 * @param {string} [props.id] - Select ID
 * @param {string} [props.name] - Select name
 * @param {string} [props.label] - Select label
 * @param {string} [props.value] - Selected value
 * @param {string} [props.displayValue] - Text to display for the selected value
 * @param {Function} [props.onChange] - Change handler that receives the selected option
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
const SearchableSelect = ({
  id,
  name,
  label,
  value,
  displayValue,
  onChange,
  options = [],
  optionValueKey = 'value',
  optionLabelKey = 'label',
  placeholder = 'Select an option',
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
  const selectId = id || `searchable-select-${name || Math.random().toString(36).substring(2, 9)}`;
  
  // State for the component
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options);
  const [selectedDisplayValue, setSelectedDisplayValue] = useState(displayValue || '');
  
  // Ref for the dropdown container
  const dropdownRef = useRef(null);
  
  // Check if mobile
  const isMobile = useIsMobile();
  
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
  
  // Filter options based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredOptions(options);
    } else {
      const filtered = options.filter(option => {
        if (typeof option !== 'object') {
          return String(option).toLowerCase().includes(searchTerm.toLowerCase());
        }
        
        // Check if the search term matches the label
        const label = option[optionLabelKey] || '';
        if (label.toLowerCase().includes(searchTerm.toLowerCase())) {
          return true;
        }
        
        // Check if the search term matches the name
        const name = option.name || '';
        if (name.toLowerCase().includes(searchTerm.toLowerCase())) {
          return true;
        }
        
        // Check if the search term matches the itemCode
        const itemCode = option.itemCode || '';
        if (itemCode.toLowerCase().includes(searchTerm.toLowerCase())) {
          return true;
        }
        
        return false;
      });
      setFilteredOptions(filtered);
    }
  }, [searchTerm, options, optionLabelKey]);
  
  // Update display value when value or options change
  useEffect(() => {
    if (displayValue !== undefined) {
      setSelectedDisplayValue(displayValue);
    } else if (value) {
      const selectedOption = options.find(option => {
        const optionValue = typeof option === 'object' ? option[optionValueKey] : option;
        return optionValue === value;
      });
      
      if (selectedOption) {
        const newDisplayValue = typeof selectedOption === 'object' ? selectedOption[optionLabelKey] : selectedOption;
        setSelectedDisplayValue(newDisplayValue);
      }
    } else {
      setSelectedDisplayValue('');
    }
  }, [value, displayValue, options, optionValueKey, optionLabelKey]);
  
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
  
  // Handle option selection
  const handleOptionSelect = (option) => {
    const optionValue = typeof option === 'object' ? option[optionValueKey] : option;
    const optionLabel = typeof option === 'object' ? option[optionLabelKey] : option;
    
    setSelectedDisplayValue(optionLabel);
    setIsOpen(false);
    setSearchTerm('');
    
    if (onChange) {
      onChange(option);
    }
  };
  
  // Handle custom value submission
  const handleCustomValueSubmit = () => {
    if (!searchTerm || !allowCustomValues) return;
    
    setSelectedDisplayValue(searchTerm);
    setIsOpen(false);
    
    if (onChange) {
      onChange(searchTerm);
    }
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
        handleOptionSelect(filteredOptions[0]);
      } else if (allowCustomValues && searchTerm) {
        handleCustomValueSubmit();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
    }
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
      
      {/* Searchable Select */}
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
            class={`${inputClasses} py-3 px-4 flex items-center justify-between cursor-pointer transition-all duration-200 min-h-[44px] ${isOpen ? 'ring-2 ring-primary-500 ring-opacity-70' : 'hover:bg-gray-50'}`}
            onClick={handleInputClick}
            role="button"
            tabIndex="0"
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-labelledby={label ? `${selectId}-label` : undefined}
          >
            <span class={`block truncate ${!selectedDisplayValue ? 'text-gray-500' : ''}`}>
              {selectedDisplayValue || placeholder}
            </span>
            <span class="ml-3 inset-y-0 right-0 flex items-center pointer-events-none">
              <svg class={`h-5 w-5 text-gray-400 transform ${isOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </span>
          </div>
        </div>
        
        {/* Dropdown */}
        {isOpen && (
          <>
            {/* Mobile backdrop */}
            {isMobile && (
              <div class="mobile-dropdown-backdrop" onClick={() => setIsOpen(false)} />
            )}
            
            <div class={`${isMobile ? 'mobile-dropdown' : 'absolute z-10 mt-1 w-full'} bg-white shadow-lg rounded-md border border-gray-200 overflow-hidden`}>
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
                  <ul class="py-1" role="listbox">
                    {filteredOptions.map((option, index) => {
                      const optionValue = typeof option === 'object' ? option[optionValueKey] : option;
                      const optionLabel = typeof option === 'object' ? option[optionLabelKey] : option;
                      
                      return (
                        <li
                          key={optionValue || index}
                          class="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center justify-between"
                          role="option"
                          aria-selected={value === optionValue}
                          onClick={() => handleOptionSelect(option)}
                        >
                          <span class="block truncate">{optionLabel}</span>
                          {value === optionValue && (
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
                              <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
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
          </>
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
        value={value || ''}
        {...rest}
      />
    </div>
  );
};

export default SearchableSelect;
