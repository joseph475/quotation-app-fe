# Common Input Components

This directory contains reusable input components for the Quotation App. These components are designed to be consistent, accessible, and easy to use across the application.

## Available Components

### Basic Input Components

- `Input`: A text input component with various customization options
- `Select`: A dropdown select component
- `SearchableSelect`: A select component with search functionality
- `MultiSelect`: A select component that allows selecting multiple options

### Other Common Components

- `Button`: A button component with various styles and states
- `Card`: A card container component
- `Modal`: A modal dialog component
- `Table`: A table component

## Usage

### Importing Components

You can import components individually:

```jsx
import Input from '../components/common/Input';
import Select from '../components/common/Select';
```

Or use the index file to import multiple components:

```jsx
import { Input, Select, Button } from '../components/common';
```

### Input Component

```jsx
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
```

### Select Component

```jsx
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
/>
```

### SearchableSelect Component

```jsx
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
  searchPlaceholder="Type to search countries..."
/>
```

### MultiSelect Component

```jsx
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
  searchPlaceholder="Search tags..."
/>
```

## Example Page

For a complete example of all input components, see the [Input Components Example Page](../../pages/examples/InputComponentsExamplePage.jsx).

You can access this example page at `/examples/input-components` when running the application in development mode.

## Props Reference

### Input Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| id | string | auto-generated | Input ID |
| name | string | - | Input name |
| type | string | 'text' | Input type (text, email, password, etc.) |
| label | string | - | Input label |
| placeholder | string | - | Input placeholder |
| value | string | - | Input value |
| onChange | function | - | Change handler |
| onBlur | function | - | Blur handler |
| onFocus | function | - | Focus handler |
| error | string | - | Error message |
| helpText | string | - | Help text |
| disabled | boolean | false | Whether the input is disabled |
| required | boolean | false | Whether the input is required |
| readOnly | boolean | false | Whether the input is read-only |
| className | string | - | Additional CSS classes |
| leftIcon | JSX.Element | - | Icon to display on the left |
| rightIcon | JSX.Element | - | Icon to display on the right |

### Select Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| id | string | auto-generated | Select ID |
| name | string | - | Select name |
| label | string | - | Select label |
| value | string | - | Selected value |
| onChange | function | - | Change handler |
| options | array | [] | Array of options to display |
| optionValueKey | string | 'value' | Key to use for option value |
| optionLabelKey | string | 'label' | Key to use for option label |
| placeholder | string | - | Placeholder text for empty selection |
| error | string | - | Error message |
| helpText | string | - | Help text |
| disabled | boolean | false | Whether the select is disabled |
| required | boolean | false | Whether the select is required |
| className | string | - | Additional CSS classes |
| leftIcon | JSX.Element | - | Icon to display on the left |

### SearchableSelect Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| id | string | auto-generated | Select ID |
| name | string | - | Select name |
| label | string | - | Select label |
| value | string | - | Selected value |
| displayValue | string | - | Text to display for the selected value |
| onChange | function | - | Change handler that receives the selected option |
| options | array | [] | Array of options to display |
| optionValueKey | string | 'value' | Key to use for option value |
| optionLabelKey | string | 'label' | Key to use for option label |
| placeholder | string | 'Select an option' | Placeholder text for empty selection |
| searchPlaceholder | string | 'Search...' | Placeholder text for search input |
| noOptionsMessage | string | 'No options found' | Message to display when no options match the search |
| error | string | - | Error message |
| helpText | string | - | Help text |
| disabled | boolean | false | Whether the select is disabled |
| required | boolean | false | Whether the select is required |
| className | string | - | Additional CSS classes |
| leftIcon | JSX.Element | - | Icon to display on the left |
| allowCustomValues | boolean | false | Whether to allow custom values not in the options list |

### MultiSelect Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| id | string | auto-generated | Select ID |
| name | string | - | Select name |
| label | string | - | Select label |
| value | array | [] | Array of selected values |
| onChange | function | - | Change handler that receives the array of selected options |
| options | array | [] | Array of options to display |
| optionValueKey | string | 'value' | Key to use for option value |
| optionLabelKey | string | 'label' | Key to use for option label |
| placeholder | string | 'Select options' | Placeholder text for empty selection |
| searchPlaceholder | string | 'Search...' | Placeholder text for search input |
| noOptionsMessage | string | 'No options found' | Message to display when no options match the search |
| error | string | - | Error message |
| helpText | string | - | Help text |
| disabled | boolean | false | Whether the select is disabled |
| required | boolean | false | Whether the select is required |
| className | string | - | Additional CSS classes |
| leftIcon | JSX.Element | - | Icon to display on the left |
| allowCustomValues | boolean | false | Whether to allow custom values not in the options list |
