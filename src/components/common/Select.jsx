import { h } from 'preact';

/**
 * Select component for dropdown selections
 * 
 * @param {Object} props - Component props
 * @param {string} [props.id] - Select ID
 * @param {string} [props.name] - Select name
 * @param {string} [props.label] - Select label
 * @param {string} [props.value] - Selected value
 * @param {Function} [props.onChange] - Change handler
 * @param {Array} [props.options] - Array of options to display
 * @param {string} [props.optionValueKey='value'] - Key to use for option value
 * @param {string} [props.optionLabelKey='label'] - Key to use for option label
 * @param {string} [props.placeholder] - Placeholder text for empty selection
 * @param {string} [props.error] - Error message
 * @param {string} [props.helpText] - Help text
 * @param {boolean} [props.disabled=false] - Whether the select is disabled
 * @param {boolean} [props.required=false] - Whether the select is required
 * @param {string} [props.className] - Additional CSS classes
 * @param {JSX.Element} [props.leftIcon] - Icon to display on the left
 * @param {string} [props.variant='outlined'] - Select variant ('outlined' or 'borderless')
 */
const Select = ({
  id,
  name,
  label,
  value,
  onChange,
  options = [],
  optionValueKey = 'value',
  optionLabelKey = 'label',
  placeholder,
  error,
  helpText,
  disabled = false,
  required = false,
  className = '',
  leftIcon,
  variant = 'outlined',
  ...rest
}) => {
  // Generate a unique ID if not provided
  const selectId = id || `select-${name || Math.random().toString(36).substring(2, 9)}`;
  
  // Base classes - optimized for mobile with better touch targets
  const baseSelectClasses = 'block w-full rounded-md focus:border-primary-500 focus:ring-2 focus:ring-primary-500 py-3 px-3 appearance-none pr-10 min-h-[44px] leading-tight';
  
  // Variant classes
  const variantClasses = variant === 'outlined' ? 'shadow-sm border-gray-300' : 'border-transparent';
  
  // Error classes
  const errorClasses = error ? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500' : '';
  
  // Disabled classes
  const disabledClasses = disabled ? 'bg-gray-100 cursor-not-allowed' : '';
  
  // Icon classes
  const leftIconClasses = leftIcon ? 'pl-10' : '';
  
  // Combine classes
  const selectClasses = [
    baseSelectClasses,
    variantClasses,
    errorClasses,
    disabledClasses,
    leftIconClasses,
    className,
  ].join(' ');
  
  return (
    <div>
      {/* Label */}
      {label && (
        <label htmlFor={selectId} class="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span class="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      {/* Select with icons */}
      <div class="relative rounded-md">
        {/* Left icon */}
        {leftIcon && (
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {leftIcon}
          </div>
        )}
        
        {/* Select element */}
        <select
          id={selectId}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          class={selectClasses}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${selectId}-error` : helpText ? `${selectId}-description` : undefined}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled={required}>
              {placeholder}
            </option>
          )}
          
          {options.map((option) => {
            // Handle both array of objects and array of strings
            const optionValue = typeof option === 'object' ? option[optionValueKey] : option;
            const optionLabel = typeof option === 'object' ? option[optionLabelKey] : option;
            
            return (
              <option key={optionValue} value={optionValue}>
                {optionLabel}
              </option>
            );
          })}
        </select>
        
        {/* Dropdown arrow */}
        <div class="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </div>
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
    </div>
  );
};

export default Select;
