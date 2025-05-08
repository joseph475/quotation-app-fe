import { h } from 'preact';

/**
 * Button component
 * 
 * @param {Object} props - Component props
 * @param {string} [props.type='button'] - Button type (button, submit, reset)
 * @param {string} [props.variant='primary'] - Button variant (primary, secondary, success, danger, warning, outline)
 * @param {string} [props.size='md'] - Button size (sm, md, lg)
 * @param {boolean} [props.fullWidth=false] - Whether the button should take full width
 * @param {boolean} [props.disabled=false] - Whether the button is disabled
 * @param {boolean} [props.isLoading=false] - Whether the button is in loading state
 * @param {Function} [props.onClick] - Click handler
 * @param {string} [props.className] - Additional CSS classes
 * @param {JSX.Element} [props.leftIcon] - Icon to display on the left
 * @param {JSX.Element} [props.rightIcon] - Icon to display on the right
 * @param {JSX.Element} props.children - Button content
 */
const Button = ({
  type = 'button',
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  isLoading = false,
  onClick,
  className = '',
  leftIcon,
  rightIcon,
  children,
  ...rest
}) => {
  // Base classes
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors';
  
  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  
  // Variant classes
  const variantClasses = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 border border-transparent',
    secondary: 'bg-secondary-600 text-white hover:bg-secondary-700 focus:ring-secondary-500 border border-transparent',
    success: 'bg-success-600 text-white hover:bg-success-700 focus:ring-success-500 border border-transparent',
    danger: 'bg-danger-600 text-white hover:bg-danger-700 focus:ring-danger-500 border border-transparent',
    warning: 'bg-warning-600 text-white hover:bg-warning-700 focus:ring-warning-500 border border-transparent',
    outline: 'bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500',
  };
  
  // Disabled classes
  const disabledClasses = 'opacity-50 cursor-not-allowed';
  
  // Full width class
  const fullWidthClass = fullWidth ? 'w-full' : '';
  
  // Combine classes
  const buttonClasses = [
    baseClasses,
    sizeClasses[size] || sizeClasses.md,
    variantClasses[variant] || variantClasses.primary,
    disabled || isLoading ? disabledClasses : '',
    fullWidthClass,
    className,
  ].join(' ');
  
  return (
    <button
      type={type}
      class={buttonClasses}
      disabled={disabled || isLoading}
      onClick={onClick}
      {...rest}
    >
      {isLoading && (
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      
      {!isLoading && leftIcon && <span class="mr-2">{leftIcon}</span>}
      {children}
      {!isLoading && rightIcon && <span class="ml-2">{rightIcon}</span>}
    </button>
  );
};

export default Button;
