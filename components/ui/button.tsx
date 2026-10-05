import * as React from 'react';
import {Slot} from '@radix-ui/react-slot';
import {cva, type VariantProps} from 'class-variance-authority';
import {cn} from '@/lib/utils';
const buttonVariants = cva('inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none', {variants:{variant:{default:'bg-[#214e43] text-white hover:bg-[#16392f]',outline:'border border-[#cbd5ca] bg-transparent hover:bg-[#e9ede3]'}},defaultVariants:{variant:'default'}});
export function Button({className, variant, asChild=false,...props}:React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & {asChild?:boolean}) {const Comp = asChild ? Slot : 'button';return <Comp className={cn(buttonVariants({variant,className}))} {...props}/>;}
