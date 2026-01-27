import { Toaster as SonnerPrimitive, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof SonnerPrimitive>;

function Toaster({ ...props }: ToasterProps) {
  return (
    <SonnerPrimitive
      theme="dark"
      position="bottom-right"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-dark-900 group-[.toaster]:text-dark-100 group-[.toaster]:border-dark-700 group-[.toaster]:shadow-xl group-[.toaster]:rounded-xl",
          title: "group-[.toast]:text-dark-100 group-[.toast]:font-medium",
          description: "group-[.toast]:text-dark-400",
          actionButton:
            "group-[.toast]:bg-primary-600 group-[.toast]:text-white group-[.toast]:rounded-lg group-[.toast]:font-medium",
          cancelButton: "group-[.toast]:bg-dark-800 group-[.toast]:text-dark-300 group-[.toast]:rounded-lg",
          success: "group-[.toaster]:border-emerald-500/30 group-[.toaster]:bg-emerald-500/10",
          error: "group-[.toaster]:border-red-500/30 group-[.toaster]:bg-red-500/10",
          warning: "group-[.toaster]:border-amber-500/30 group-[.toaster]:bg-amber-500/10",
          info: "group-[.toaster]:border-primary-500/30 group-[.toaster]:bg-primary-500/10",
        },
      }}
      {...props}
    />
  );
}

export { Toaster, toast };
