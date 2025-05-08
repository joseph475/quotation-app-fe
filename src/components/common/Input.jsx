import { h } from 'preact';

/**
 * Input component
 * 
 * @param {Object} props - Component props
 * @param {string} [props.id] - Input ID
 * @param {string} [props.name] - Input name
 * @param {string} [props.type='text'] - Input type
 * @param {string} [props.label] - Input label
 * @param {string} [props.placeholder] - Input placeholder
 * @param {string} [props.value] - Input value
 * @param {Function} [props.onChange] - Change handler
 * @param {Function} [props.onBlur] - Blur handler
 * @param {Function} [props.onFocus] - Focus handler
 * @param {string} [props.error] - Error message
 * @param {string} [props.helpText] - Help text
 * @param {boolean} [props.disabled=false] - Whether the input is disabled
 * @param {boolean} [props.required=false] - Whether the input is required
 * @param {boolean} [props.readOnly=false] - Whether the input is read-only
 * @param {string} [props.className] - Additional CSS classes
 * @param {JSX.Element} [props.leftIcon] - Icon to display on the left
 * @param {JSX.Element} [props.rightIcon] - Icon to display on the right
 */
const Input = ({
  id,
  name,
  type = 'text',
  label,
  placeholder,
  value,
  onChange,
  onBlur,
  onFocus,
  error,
  helpText,
  disabled = false,
  required = false,
  readOnly = false,
  className = '',
  leftIcon,
  rightIcon,
  ...rest
}) => {
  // Generate a unique ID if not provided
  const inputId = id || `input-${name || Math.random().toString(36).substring(2, 9)}`;
  
  // Base classes
  const baseInputClasses = 'block w-full rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm';
  
  // Error classes
  const errorClasses = error ? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300';
  
  // Disabled classes
  const disabledClasses = disabled ? 'bg-gray-100 cursor-not-allowed' : '';
  
  // Icon classes
  const leftIconClasses = leftIcon ? 'pl-10' : '';
  const rightIconClasses = rightIcon ? 'pr-10' : '';
  
  // Combine classes
  const inputClasses = [
    baseInputClasses,
    errorClasses,
    disabledClasses,
    leftIconClasses,
    rightIconClasses,
    className,
  ].join(' ');
  
  return (
    <div>
      {/* Label */}
      {label && (
        <label htmlFor={inputId} class="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span class="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      {/* Input with icons */}
      <div class="relative rounded-md shadow-sm">
        {/* Left icon */}
        {leftIcon && (
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {leftIcon}
          </div>
        )}
        
        {/* Input element */}
        <input
          id={inputId}
          name={name}
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={onChange}
          onBlur={onBlur}
          onFocus={onFocus}
          disabled={disabled}
          required={required}
          readOnly={readOnly}
          class={inputClasses}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${inputId}-error` : helpText ? `${inputId}-description` : undefined}
          {...rest}
        />
        
        {/* Right icon */}
        {rightIcon && (
          <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            {rightIcon}
          </div>
        )}
      </div>
      
      {/* Error message */}
      {error && (
        <p class="mt-2 text-sm text-red-600" id={`${inputId}-error`}>
          {error}
        </p>
      )}
      
      {/* Help text */}
      {!error && helpText && (
        <p class="mt-2 text-sm text-gray-500" id={`${inputId}-description`}>
          {helpText}
        </p>
      )}
    </div>
  );
};

export default Input;
