import { h } from 'preact';

/**
 * Textarea component
 * 
 * @param {Object} props - Component props
 * @param {string} [props.id] - Textarea ID
 * @param {string} [props.name] - Textarea name
 * @param {string} [props.label] - Textarea label
 * @param {string} [props.placeholder] - Textarea placeholder
 * @param {string} [props.value] - Textarea value
 * @param {Function} [props.onChange] - Change handler
 * @param {Function} [props.onBlur] - Blur handler
 * @param {Function} [props.onFocus] - Focus handler
 * @param {string} [props.error] - Error message
 * @param {string} [props.helpText] - Help text
 * @param {boolean} [props.disabled=false] - Whether the textarea is disabled
 * @param {boolean} [props.required=false] - Whether the textarea is required
 * @param {boolean} [props.readOnly=false] - Whether the textarea is read-only
 * @param {string} [props.className] - Additional CSS classes
 * @param {JSX.Element} [props.leftIcon] - Icon to display on the left
 * @param {number} [props.rows=3] - Number of rows
 */
const Textarea = ({
  id,
  name,
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
  rows = 3,
  ...rest
}) => {
  // Generate a unique ID if not provided
  const textareaId = id || `textarea-${name || Math.random().toString(36).substring(2, 9)}`;
  
  // Base classes - removed sm:text-sm to prevent iOS zoom, font size now handled by CSS
  const baseTextareaClasses = 'block w-full rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 resize-vertical';
  
  // Error classes
  const errorClasses = error ? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300';
  
  // Disabled classes
  const disabledClasses = disabled ? 'bg-gray-100 cursor-not-allowed' : '';
  
  // Icon classes
  const leftIconClasses = leftIcon ? 'pl-10' : '';
  
  // Combine classes
  const textareaClasses = [
    baseTextareaClasses,
    errorClasses,
    disabledClasses,
    leftIconClasses,
    className,
  ].join(' ');
  
  return (
    <div>
      {/* Label */}
      {label && (
        <label htmlFor={textareaId} class="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span class="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      {/* Textarea with icons */}
      <div class="relative rounded-md shadow-sm">
        {/* Left icon */}
        {leftIcon && (
          <div class="absolute top-3 left-0 pl-3 flex items-start pointer-events-none">
            {leftIcon}
          </div>
        )}
        
        {/* Textarea element */}
        <textarea
          id={textareaId}
          name={name}
          rows={rows}
          value={value}
          placeholder={placeholder}
          onChange={onChange}
          onBlur={onBlur}
          onFocus={onFocus}
          disabled={disabled}
          required={required}
          readOnly={readOnly}
          class={textareaClasses}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${textareaId}-error` : helpText ? `${textareaId}-description` : undefined}
          {...rest}
        />
      </div>
      
      {/* Error message */}
      {error && (
        <p class="mt-2 text-sm text-red-600" id={`${textareaId}-error`}>
          {error}
        </p>
      )}
      
      {/* Help text */}
      {!error && helpText && (
        <p class="mt-2 text-sm text-gray-500" id={`${textareaId}-description`}>
          {helpText}
        </p>
      )}
    </div>
  );
};

export default Textarea;
