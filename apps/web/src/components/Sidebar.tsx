import { useState, useEffect, createContext, useContext, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/Button";

interface SidebarContextValue {
  isOpen: boolean;
  isMobile: boolean;
  toggle: () => void;
  close: () => void;
  open: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return context;
}

interface SidebarProviderProps {
  children: ReactNode;
  defaultOpen?: boolean;
}

export function SidebarProvider({ children, defaultOpen = true }: SidebarProviderProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setIsOpen(false);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const toggle = () => setIsOpen(prev => !prev);
  const close = () => setIsOpen(false);
  const open = () => setIsOpen(true);

  return (
    <SidebarContext.Provider value={{ isOpen, isMobile, toggle, close, open }}>{children}</SidebarContext.Provider>
  );
}

interface SidebarProps {
  children: ReactNode;
  className?: string;
}

export function Sidebar({ children, className }: SidebarProps) {
  const { isOpen, isMobile, close } = useSidebar();

  return (
    <>
      {isMobile && isOpen && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-40 lg:hidden animate-fade-in" onClick={close} />
      )}

      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-50 lg:z-auto",
          "h-screen lg:h-[calc(100vh-4rem)]",
          "w-72 flex-shrink-0",
          "bg-dark-900 lg:bg-transparent",
          "border-r border-dark-800 lg:border-0",
          "transition-transform duration-300 ease-out",
          "lg:transform-none lg:translate-x-0",
          "overflow-hidden",
          isOpen ? "translate-x-0" : "-translate-x-full",
          className,
        )}
      >
        <div className="h-full overflow-y-auto p-4 lg:p-0 space-y-4">
          {isMobile && (
            <div className="flex items-center justify-between pb-4 border-b border-dark-800 lg:hidden">
              <span className="text-lg font-semibold text-dark-100">Menú</span>
              <Button variant="ghost" size="icon" onClick={close}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>
          )}
          {children}
        </div>
      </aside>
    </>
  );
}

interface SidebarTriggerProps {
  className?: string;
}

export function SidebarTrigger({ className }: SidebarTriggerProps) {
  const { toggle, isOpen } = useSidebar();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      className={cn("lg:hidden", className)}
      aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </Button>
  );
}

interface SidebarGroupProps {
  children: ReactNode;
  title?: string;
  className?: string;
}

export function SidebarGroup({ children, title, className }: SidebarGroupProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {title && <h3 className="px-3 text-xs font-semibold text-dark-500 uppercase tracking-wider">{title}</h3>}
      <div className="space-y-1">{children}</div>
    </div>
  );
}

interface SidebarItemProps {
  href: string;
  icon?: ReactNode;
  children: ReactNode;
  active?: boolean;
  badge?: string | number;
  external?: boolean;
}

export function SidebarItem({ href, icon, children, active = false, badge, external = false }: SidebarItemProps) {
  const { close, isMobile } = useSidebar();

  const handleClick = () => {
    if (isMobile) {
      close();
    }
  };

  const linkProps = external ? { target: "_blank", rel: "noopener noreferrer" } : {};

  return (
    <a
      href={href}
      onClick={handleClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg",
        "text-sm font-medium transition-all duration-200",
        active ? "bg-primary-500/20 text-primary-400" : "text-dark-400 hover:text-dark-100 hover:bg-dark-800/50",
      )}
      {...linkProps}
    >
      {icon && (
        <span
          className={cn(
            "flex-shrink-0 w-5 h-5 flex items-center justify-center",
            active ? "text-primary-400" : "text-dark-500",
          )}
        >
          {icon}
        </span>
      )}
      <span className="flex-1 truncate">{children}</span>
      {badge !== undefined && (
        <span
          className={cn(
            "px-2 py-0.5 text-xs font-medium rounded-full",
            active ? "bg-primary-500/30 text-primary-300" : "bg-dark-700 text-dark-300",
          )}
        >
          {badge}
        </span>
      )}
      {external && (
        <svg className="w-4 h-4 text-dark-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      )}
    </a>
  );
}

interface SidebarSeparatorProps {
  className?: string;
}

export function SidebarSeparator({ className }: SidebarSeparatorProps) {
  return <div className={cn("h-px bg-dark-800 my-4", className)} />;
}
