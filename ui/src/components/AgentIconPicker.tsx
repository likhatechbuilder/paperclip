import { useState, useMemo, useRef } from "react";
import { Upload } from "lucide-react";
import { AGENT_ICON_NAMES, type AgentIconName } from "@paperclipai/shared";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AGENT_ICONS, getAgentIcon } from "../lib/agent-icons";
import { useCompany } from "../context/CompanyContext";
import { useToast } from "../context/ToastContext";

const DEFAULT_ICON: AgentIconName = "bot";

interface AgentIconProps {
  icon: string | null | undefined;
  className?: string;
}

export function AgentIcon({ icon, className }: AgentIconProps) {
  if (icon && (icon.startsWith("/") || icon.startsWith("http") || icon.startsWith("data:"))) {
    return <img src={icon} alt="Agent icon" className={cn("object-cover rounded-sm", className)} />;
  }
  const Icon = getAgentIcon(icon);
  return <Icon className={className} />;
}

interface AgentIconPickerProps {
  value: string | null | undefined;
  onChange: (icon: string) => void;
  children: React.ReactNode;
}

export function AgentIconPicker({ value, onChange, children }: AgentIconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const { selectedCompanyId } = useCompany();
  const { pushToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const entries = AGENT_ICON_NAMES.map((name) => [name, AGENT_ICONS[name]] as const);
    if (!search) return entries;
    const q = search.toLowerCase();
    return entries.filter(([name]) => name.includes(q));
  }, [search]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedCompanyId) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("namespace", "agents");

    try {
      const res = await fetch(`/api/companies/${selectedCompanyId}/assets/images`, {
        method: "POST",
        body: formData,
        headers: {
          // fetch automatically adds boundary to multipart/form-data
          Authorization: `Bearer ${localStorage.getItem("paperclip_access_token") ?? ""}`
        }
      });
      
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to upload image");
      }
      
      const payload = await res.json();
      onChange(payload.contentPath);
      setOpen(false);
      pushToast({ title: "Custom icon uploaded" });
    } catch (err: any) {
      pushToast({ title: "Upload failed: " + err.message });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        <Tabs defaultValue="icons" className="w-full">
          <TabsList className="w-full mb-3">
            <TabsTrigger className="flex-1" value="icons">Library</TabsTrigger>
            <TabsTrigger className="flex-1" value="custom">Custom Image</TabsTrigger>
          </TabsList>
          
          <TabsContent value="icons" className="m-0 focus-visible:ring-0">
            <Input
              placeholder="Search icons..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-2 h-8 text-sm"
              autoFocus
            />
            <div className="grid grid-cols-7 gap-1 max-h-48 overflow-y-auto">
              {filtered.map(([name, Icon]) => (
                <button
                  key={name}
                  onClick={() => {
                    onChange(name);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={cn(
                    "flex items-center justify-center h-8 w-8 rounded hover:bg-accent transition-colors",
                    (value ?? DEFAULT_ICON) === name && "bg-accent ring-1 ring-primary"
                  )}
                  title={name}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="col-span-7 text-xs text-muted-foreground text-center py-2">No icons match</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="custom" className="m-0 focus-visible:ring-0 py-4 text-center">
             <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleFileUpload}
              />
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || !selectedCompanyId}
                className="w-full"
              >
                {isUploading ? "Uploading..." : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Image
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-3">
                Supported formats: PNG, JPEG, WebP. Limit: 5MB.
              </p>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
