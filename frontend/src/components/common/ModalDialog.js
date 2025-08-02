import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
export const ModalDialog = ({ open, onClose, title, children, actions }) => {
    return (_jsxs(Dialog, { open: open, onClose: onClose, maxWidth: "md", fullWidth: true, children: [_jsx(DialogTitle, { children: title }), _jsx(DialogContent, { children: children }), actions && _jsx(DialogActions, { children: actions })] }));
};
export default ModalDialog;
