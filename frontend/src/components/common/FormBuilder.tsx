import React from 'react';
import { TextField, FormControl, InputLabel, Select, MenuItem, Checkbox, FormControlLabel } from '@mui/material';

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'select' | 'checkbox';
  value?: any;
  options?: Array<{ value: any; label: string }>;
  onChange: (name: string, value: any) => void;
}

interface FormBuilderProps {
  fields: FormField[];
}

export const FormBuilder: React.FC<FormBuilderProps> = ({ fields }) => {
  return (
    <>
      {fields.map((field) => {
        switch (field.type) {
          case 'select':
            return (
              <FormControl key={field.name} fullWidth margin="normal">
                <InputLabel>{field.label}</InputLabel>
                <Select
                  value={field.value || ''}
                  onChange={(e) => field.onChange(field.name, e.target.value)}
                >
                  {field.options?.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            );
          case 'checkbox':
            return (
              <FormControlLabel
                key={field.name}
                control={
                  <Checkbox
                    checked={field.value || false}
                    onChange={(e) => field.onChange(field.name, e.target.checked)}
                  />
                }
                label={field.label}
              />
            );
          default:
            return (
              <TextField
                key={field.name}
                label={field.label}
                type={field.type}
                value={field.value || ''}
                onChange={(e) => field.onChange(field.name, e.target.value)}
                fullWidth
                margin="normal"
              />
            );
        }
      })}
    </>
  );
};

export default FormBuilder;
