import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { TextField, FormControl, InputLabel, Select, MenuItem, Checkbox, FormControlLabel } from '@mui/material';
export const FormBuilder = ({ fields }) => {
    return (_jsx(_Fragment, { children: fields.map((field) => {
            switch (field.type) {
                case 'select':
                    return (_jsxs(FormControl, { fullWidth: true, margin: "normal", children: [_jsx(InputLabel, { children: field.label }), _jsx(Select, { value: field.value || '', onChange: (e) => field.onChange(field.name, e.target.value), children: field.options?.map((option) => (_jsx(MenuItem, { value: option.value, children: option.label }, option.value))) })] }, field.name));
                case 'checkbox':
                    return (_jsx(FormControlLabel, { control: _jsx(Checkbox, { checked: field.value || false, onChange: (e) => field.onChange(field.name, e.target.checked) }), label: field.label }, field.name));
                default:
                    return (_jsx(TextField, { label: field.label, type: field.type, value: field.value || '', onChange: (e) => field.onChange(field.name, e.target.value), fullWidth: true, margin: "normal" }, field.name));
            }
        }) }));
};
export default FormBuilder;
