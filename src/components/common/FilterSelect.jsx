import { h } from 'preact';
import Select from './Select';

/**
 * FilterSelect component for consistent filter dropdowns across the application
 * 
 * @param {Object} props - Component props
 * @param {string} [props.id] - Select ID
 * @param {string} [props.name] - Select name
 * @param {string} [props.value] - Selected value
 * @param {Function} [props.onChange] - Change handler
 * @param {Array} [props.options] - Array of options to display
 * @param {string} [props.optionValueKey='value'] - Key to use for option value
 * @param {string} [props.optionLabelKey='label'] - Key to use for option label
 * @param {string} [props.placeholder] - Placeholder text for empty selection
 * @param {boolean} [props.disabled=false] - Whether the select is disabled
 * @param {string} [props.className] - Additional CSS classes
 */
const FilterSelect = ({
  id,
  name,
  value,
  onChange,
  options = [],
  optionValueKey = 'value',
  optionLabelKey = 'label',
  placeholder,
  disabled = false,
  className = '',
  ...rest
}) => {
  return (
    <div class="flex items-center h-full w-48">
      <Select
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        options={options}
        optionValueKey={optionValueKey}
        optionLabelKey={optionLabelKey}
        placeholder={placeholder}
        disabled={disabled}
        variant="borderless"
        className={`py-2 pl-3 hover:bg-gray-50 transition-all duration-200 focus:bg-white ${className}`}
        {...rest}
      />
    </div>
  );
};

export default FilterSelect;
