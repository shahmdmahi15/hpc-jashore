import * as React from "react"
import { cn } from "cn"

export interface TextareaProps extends React.ComponentProps<"textarea"> {
  label?: React.ReactNode
}

function Textarea({ className, label, id, ...props }: TextareaProps) {
  const generatedId = React.useId()
  const textareaId = id || (label ? generatedId : undefined)

  const textareaElement = (
    <textarea
      id={textareaId}
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )

  if (!label) {
    return textareaElement
  }

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label htmlFor={textareaId} className="text-xs font-semibold text-muted-foreground">
        {label}
      </label>
      {textareaElement}
    </div>
  )
}

export { Textarea }
