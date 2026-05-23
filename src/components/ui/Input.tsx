import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  prefixed?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ className, prefixed, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn('form-input', prefixed && 'form-input-prefixed', className)}
      {...props}
    />
  );
});

Input.displayName = 'Input';
export default Input;
