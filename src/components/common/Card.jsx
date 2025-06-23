import { h } from 'preact';

/**
 * Card component
 * 
 * @param {Object} props - Component props
 * @param {string} [props.title] - Card title
 * @param {JSX.Element} [props.titleAction] - Action element to display in the title area
 * @param {JSX.Element} [props.footer] - Footer content
 * @param {boolean} [props.noPadding=false] - Whether to remove padding from the card body
 * @param {string} [props.className] - Additional CSS classes for the card
 * @param {string} [props.headerClassName] - Additional CSS classes for the header
 * @param {string} [props.bodyClassName] - Additional CSS classes for the body
 * @param {string} [props.footerClassName] - Additional CSS classes for the footer
 * @param {JSX.Element} props.children - Card content
 */
const Card = ({
  title,
  titleAction,
  footer,
  noPadding = false,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  footerClassName = '',
  children,
  ...rest
}) => {
  // Base classes
  const cardClasses = `bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`;
  const headerClasses = `px-4 py-3 border-b border-gray-200 bg-gray-50 ${headerClassName}`;
  const bodyClasses = `${noPadding ? '' : 'p-4'} ${bodyClassName}`;
  const footerClasses = `px-4 py-3 border-t border-gray-200 bg-gray-50 ${footerClassName}`;

  return (
    <div class={cardClasses} {...rest}>
      {/* Card Header */}
      {(title || titleAction) && (
        <div class={headerClasses}>
          <div class="flex justify-between items-center">
            {title && (
              <h3 class="text-sm sm:text-lg leading-6 font-medium text-gray-900">
                {title}
              </h3>
            )}
            {titleAction && (
              <div class="flex-shrink-0">
                {titleAction}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Card Body */}
      <div class={bodyClasses}>
        {children}
      </div>
      
      {/* Card Footer */}
      {footer && (
        <div class={footerClasses}>
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
