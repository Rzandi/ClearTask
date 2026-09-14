import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  prefixed?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ className, prefixed, onFocus, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn('form-input', prefixed && 'form-input-prefixed', className)}
      onFocus={(e) => {
        if (props.type === 'number' || props.type === 'text') {
          e.target.select();
        }
        onFocus?.(e);
      }}
      {...props}
    />
  );
});

Input.displayName = 'Input';
export default Input;
