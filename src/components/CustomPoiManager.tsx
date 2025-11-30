import React, { useState, useEffect } from "react";
import { customPoiService, CustomPOI } from "@/services/customPoiService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Plus, Trash2, Edit, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "./LanguageProvider";

interface CustomPoiManagerProps {
  selectedLocation?: { lng: number; lat: number } | null;
  onPOIAdded?: () => void;
  onPOIChanged?: () => void; // Called when POI is added, updated, or deleted
  onPOIClick?: (lng: number, lat: number) => void; // Called when POI is clicked to pan map
  isFullMode?: boolean;
}

const CATEGORY_OPTIONS = [
  { value: "health", labelKey: "healthcare", emoji: "🏥" },
  { value: "education", labelKey: "education", emoji: "🏫" },
  { value: "market", labelKey: "market", emoji: "🛒" },
  { value: "transport", labelKey: "transport", emoji: "🚌" },
  { value: "recreation", labelKey: "recreation", emoji: "🌳" },
  { value: "religious", labelKey: "religious", emoji: "🙏" },
  { value: "police", labelKey: "police", emoji: "👮" },
];

const CustomPoiManager: React.FC<CustomPoiManagerProps> = ({
  selectedLocation,
  onPOIAdded,
  onPOIChanged,
  onPOIClick,
  isFullMode = false,
}) => {
  const { t } = useLanguage();
  const [pois, setPois] = useState<CustomPOI[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPOI, setEditingPOI] = useState<CustomPOI | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    category: "health",
    description: "",
    lng: selectedLocation?.lng || 0,
    lat: selectedLocation?.lat || 0,
  });

  useEffect(() => {
    loadPOIs();
  }, []);

  useEffect(() => {
    if (selectedLocation) {
      setFormData((prev) => ({
        ...prev,
        lng: selectedLocation.lng,
        lat: selectedLocation.lat,
      }));
    }
  }, [selectedLocation]);

  const loadPOIs = () => {
    const allPOIs = customPoiService.getAllPOIs();
    setPois(allPOIs);
  };

  const handleAddPOI = () => {
    if (!formData.name.trim()) {
      toast.error(t("enter.name"));
      return;
    }

    if (!selectedLocation && formData.lng === 0 && formData.lat === 0) {
      toast.error(t("select.location.first"));
      return;
    }

    try {
      if (editingPOI) {
        customPoiService.updatePOI(editingPOI.id, formData);
        toast.success(t("place.updated"));
      } else {
        customPoiService.addPOI(formData);
        toast.success(t("place.added"));
      }

      loadPOIs();
      resetForm();
      setIsAddDialogOpen(false);
      onPOIChanged?.();
    } catch (error) {
      toast.error(t("failed.save.poi"));
    }
  };

  const handleDeletePOI = (id: string) => {
    if (confirm(t("confirm.delete.place"))) {
      customPoiService.deletePOI(id);
      loadPOIs();
      toast.success(t("place.deleted"));
      onPOIChanged?.();
    }
  };

  const handleEditPOI = (poi: CustomPOI) => {
    setEditingPOI(poi);
    setFormData({
      name: poi.name,
      category: poi.category,
      description: poi.description || "",
      lng: poi.lng,
      lat: poi.lat,
    });
    setIsAddDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      category: "health",
      description: "",
      lng: selectedLocation?.lng || 0,
      lat: selectedLocation?.lat || 0,
    });
    setEditingPOI(null);
  };

  const handleExport = () => {
    const json = customPoiService.exportPOIs();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `futuricity-my-places-${Date.now()}.json`;
    a.click();
    toast.success(t("pois.exported"));
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const success = customPoiService.importPOIs(json);
        if (success) {
          loadPOIs();
          toast.success(t("pois.imported"));
          onPOIChanged?.();
        } else {
          toast.error(t("invalid.file.format"));
        }
      } catch (error) {
        toast.error(t("failed.import.pois"));
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  return (
    <Card
      className={`bg-card border-border shadow-sm ${
        isFullMode ? "border-primary/50" : ""
      }`}
    >
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`${
                isFullMode ? "w-3 h-3" : "w-2 h-2"
              } bg-primary rounded-full ${isFullMode ? "animate-pulse" : ""}`}
            ></div>
            <CardTitle
              className={`${
                isFullMode ? "text-base md:text-lg" : "text-sm md:text-base"
              } font-semibold`}
            >
              {isFullMode ? t("my.places.mode") : t("my.places.mode")}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={pois.length === 0}
              title={t("export.pois")}
            >
              <Download className="w-4 h-4" />
            </Button>
            <label>
              <Input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  (
                    e.currentTarget.previousElementSibling as HTMLInputElement
                  )?.click();
                }}
                title={t("import.pois")}
              >
                <Upload className="w-4 h-4" />
              </Button>
            </label>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isFullMode && (
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <p className="text-sm text-foreground">
              {t("my.places.intro")}
            </p>
          </div>
        )}
        <Dialog
          open={isAddDialogOpen}
          onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="w-full" size="sm" disabled={!selectedLocation}>
              <Plus className="w-4 h-4 mr-2" />
              {t("add.place")}
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingPOI ? t("edit.place") : t("add.place")}
              </DialogTitle>
              <DialogDescription>
                {t("add.place.desc")}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">{t("name")} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder={t("name.placeholder")}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="category">{t("category")} *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("select.category")} />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.emoji} {t(cat.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">{t("description")} (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder={t("description.placeholder")}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="lat">{t("latitude")}</Label>
                  <Input
                    id="lat"
                    type="number"
                    step="0.000001"
                    value={formData.lat}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        lat: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lng">{t("longitude")}</Label>
                  <Input
                    id="lng"
                    type="number"
                    step="0.000001"
                    value={formData.lng}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        lng: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddDialogOpen(false);
                  resetForm();
                }}
              >
                {t("cancel")}
              </Button>
              <Button onClick={handleAddPOI}>
                {editingPOI ? t("update") : t("add")} {t("my.places")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* List of Custom POIs */}
        <div
          className={`space-y-2 ${
            isFullMode ? "max-h-96" : "max-h-60"
          } overflow-y-auto`}
        >
          {pois.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>{t("no.places.yet")}</p>
              <p className="text-xs mt-1">
                {t("select.location.add.place")}
              </p>
            </div>
          ) : (
            pois.map((poi) => {
              const category = CATEGORY_OPTIONS.find(
                (c) => c.value === poi.category
              );
              return (
                <div
                  key={poi.id}
                  className="flex items-center justify-between p-3 bg-gradient-to-r from-accent/20 to-accent/10 rounded-lg border border-border/30 hover:bg-accent/30 transition-all duration-200 cursor-pointer"
                  onClick={() => onPOIClick?.(poi.lng, poi.lat)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{category?.emoji || "📍"}</span>
                      <div>
                        <p className="text-sm font-medium text-foreground truncate">
                          {poi.name}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {category ? t(category.labelKey) : poi.category}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-1 ml-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditPOI(poi)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePOI(poi.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomPoiManager;
