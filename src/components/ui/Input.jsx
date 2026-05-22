import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

const Input = forwardRef(({ className, prefixed, ...props }, ref) => {
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
