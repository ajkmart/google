// Shared UI components, hooks, and utilities

// Hooks
export { useIsMobile } from "./hooks/use-mobile";
export { useToast, toast } from "./hooks/use-toast";

// Utilities
export { cn } from "./lib/utils";

// SafeImage
export { SafeImage } from "./components/ui/SafeImage";
export type { SafeImageProps } from "./components/ui/SafeImage";

// Accordion
export { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "./components/ui/accordion";

// Alert
export { Alert, AlertTitle, AlertDescription } from "./components/ui/alert";

// Alert Dialog
export {
  AlertDialog, AlertDialogPortal, AlertDialogOverlay, AlertDialogTrigger,
  AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from "./components/ui/alert-dialog";

// Aspect Ratio
export { AspectRatio } from "./components/ui/aspect-ratio";

// Avatar
export { Avatar, AvatarImage, AvatarFallback } from "./components/ui/avatar";

// Badge
export { Badge, badgeVariants } from "./components/ui/badge";
export type { BadgeProps } from "./components/ui/badge";

// Breadcrumb
export {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbPage, BreadcrumbSeparator, BreadcrumbEllipsis,
} from "./components/ui/breadcrumb";

// Button
export { Button, buttonVariants } from "./components/ui/button";
export type { ButtonProps } from "./components/ui/button";

// Button Group
export { ButtonGroup, ButtonGroupSeparator, ButtonGroupText, buttonGroupVariants } from "./components/ui/button-group";

// Calendar
export { Calendar, CalendarDayButton } from "./components/ui/calendar";

// Card
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from "./components/ui/card";

// Carousel
export { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "./components/ui/carousel";
export type { CarouselApi } from "./components/ui/carousel";

// Chart
export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, ChartStyle } from "./components/ui/chart";
export type { ChartConfig } from "./components/ui/chart";

// Checkbox
export { Checkbox } from "./components/ui/checkbox";

// Collapsible
export { Collapsible, CollapsibleTrigger, CollapsibleContent } from "./components/ui/collapsible";

// Command
export {
  Command, CommandDialog, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem, CommandShortcut, CommandSeparator,
} from "./components/ui/command";

// Context Menu
export {
  ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem,
  ContextMenuCheckboxItem, ContextMenuRadioItem, ContextMenuLabel,
  ContextMenuSeparator, ContextMenuShortcut, ContextMenuGroup,
  ContextMenuPortal, ContextMenuSub, ContextMenuSubContent,
  ContextMenuSubTrigger, ContextMenuRadioGroup,
} from "./components/ui/context-menu";

// Dialog
export {
  Dialog, DialogPortal, DialogOverlay, DialogTrigger, DialogClose,
  DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from "./components/ui/dialog";

// Drawer
export {
  Drawer, DrawerPortal, DrawerOverlay, DrawerTrigger, DrawerClose,
  DrawerContent, DrawerHeader, DrawerFooter, DrawerTitle, DrawerDescription,
} from "./components/ui/drawer";

// Dropdown Menu
export {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuCheckboxItem, DropdownMenuRadioItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuGroup,
  DropdownMenuPortal, DropdownMenuSub, DropdownMenuSubContent,
  DropdownMenuSubTrigger, DropdownMenuRadioGroup,
} from "./components/ui/dropdown-menu";

// Empty State
export { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia } from "./components/ui/empty";

// Field
export {
  Field, FieldLabel, FieldDescription, FieldError, FieldGroup,
  FieldLegend, FieldSeparator, FieldSet, FieldContent, FieldTitle,
} from "./components/ui/field";

// Form
export {
  useFormField, Form, FormItem, FormLabel, FormControl,
  FormDescription, FormMessage, FormField,
} from "./components/ui/form";

// Hover Card
export { HoverCard, HoverCardTrigger, HoverCardContent } from "./components/ui/hover-card";

// Input
export { Input } from "./components/ui/input";

// Input Group
export {
  InputGroup, InputGroupAddon, InputGroupButton, InputGroupText,
  InputGroupInput, InputGroupTextarea,
} from "./components/ui/input-group";

// Input OTP
export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "./components/ui/input-otp";

// Item
export {
  Item, ItemMedia, ItemContent, ItemActions, ItemGroup, ItemSeparator,
  ItemTitle, ItemDescription, ItemHeader, ItemFooter,
} from "./components/ui/item";

// Kbd
export { Kbd, KbdGroup } from "./components/ui/kbd";

// Label
export { Label } from "./components/ui/label";

// Menubar
export {
  Menubar, MenubarMenu, MenubarTrigger, MenubarContent, MenubarItem,
  MenubarSeparator, MenubarLabel, MenubarCheckboxItem, MenubarRadioGroup,
  MenubarRadioItem, MenubarPortal, MenubarSubContent, MenubarSubTrigger,
  MenubarGroup, MenubarSub, MenubarShortcut,
} from "./components/ui/menubar";

// Navigation Menu
export {
  navigationMenuTriggerStyle, NavigationMenu, NavigationMenuList,
  NavigationMenuItem, NavigationMenuContent, NavigationMenuTrigger,
  NavigationMenuLink, NavigationMenuIndicator, NavigationMenuViewport,
} from "./components/ui/navigation-menu";

// Pagination
export {
  Pagination, PaginationContent, PaginationLink, PaginationItem,
  PaginationPrevious, PaginationNext, PaginationEllipsis,
} from "./components/ui/pagination";

// Popover
export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor } from "./components/ui/popover";

// Progress
export { Progress } from "./components/ui/progress";

// Radio Group
export { RadioGroup, RadioGroupItem } from "./components/ui/radio-group";

// Resizable
export { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "./components/ui/resizable";

// Scroll Area
export { ScrollArea, ScrollBar } from "./components/ui/scroll-area";

// Select
export {
  Select, SelectGroup, SelectValue, SelectTrigger, SelectContent,
  SelectLabel, SelectItem, SelectSeparator, SelectScrollUpButton, SelectScrollDownButton,
} from "./components/ui/select";

// Separator
export { Separator } from "./components/ui/separator";

// Sheet
export {
  Sheet, SheetPortal, SheetOverlay, SheetTrigger, SheetClose,
  SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription,
} from "./components/ui/sheet";

// Sidebar
export {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupAction,
  SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInput,
  SidebarInset, SidebarMenu, SidebarMenuAction, SidebarMenuBadge,
  SidebarMenuButton, SidebarMenuItem, SidebarMenuSkeleton, SidebarMenuSub,
  SidebarMenuSubButton, SidebarMenuSubItem, SidebarProvider, SidebarRail,
  SidebarSeparator, SidebarTrigger, useSidebar,
} from "./components/ui/sidebar";

// Skeleton
export { Skeleton } from "./components/ui/skeleton";

// Slider
export { Slider } from "./components/ui/slider";

// Sonner (aliased to avoid collision with shadcn Toaster)
export { Toaster as SonnerToaster } from "./components/ui/sonner";

// Spinner / LoadingSpinner
export { Spinner } from "./components/ui/spinner";

// Switch
export { Switch } from "./components/ui/switch";

// Table
export {
  Table, TableHeader, TableBody, TableFooter,
  TableHead, TableRow, TableCell, TableCaption,
} from "./components/ui/table";

// Tabs
export { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs";

// Textarea
export { Textarea } from "./components/ui/textarea";

// Toast (shadcn radix-based)
export {
  ToastProvider, ToastViewport, Toast, ToastTitle,
  ToastDescription, ToastClose, ToastAction,
} from "./components/ui/toast";
export type { ToastProps, ToastActionElement } from "./components/ui/toast";

// Toaster (renders active toasts via useToast hook)
export { Toaster } from "./components/ui/toaster";

// Toggle
export { Toggle, toggleVariants } from "./components/ui/toggle";

// Toggle Group
export { ToggleGroup, ToggleGroupItem } from "./components/ui/toggle-group";

// Tooltip
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "./components/ui/tooltip";
