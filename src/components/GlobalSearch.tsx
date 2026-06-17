"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";
import { globalSearchPO } from "@/app/actions/search";
import { useRouter } from "next/navigation";
import { PurchaseTracking, Season } from "@prisma/client";

type SearchResult = PurchaseTracking & {
  season?: Season | null;
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Keyboard listener for Ctrl+K / Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Execute search ONLY when button is clicked or Enter is pressed
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    try {
      const data = await globalSearchPO(query);
      setResults(data);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToResult = (batchId: string) => {
    setOpen(false);
    // Adjust this route to where you want the user to go (e.g., focus on the item in tracking page)
    // using batchId because tracking groups by batchId
    router.push(`/tracking?highlight=${batchId}`);
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogContent className="sm:max-w-[550px] top-[20%] translate-y-0">
        <DialogHeader>
          <DialogTitle className="sr-only">Global Search</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSearch} className="flex items-center space-x-2 mt-2">
          <Input 
            onChange={(e) => setQuery(e.target.value)} 
            placeholder="Cari Article, Model, atau nomor PO..." 
            value={query}
            className="flex-1 uppercase"
            autoFocus
          />
          <Button disabled={isLoading} type="submit">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Search className="h-4 w-4 mr-2"/>}
            Cari
          </Button>
        </form>

        <div className="mt-4 max-h-[300px] overflow-y-auto space-y-2">
          {results.length === 0 && query !== "" && !isLoading && (
            <p className="text-sm text-center text-muted-foreground py-4">Data tidak ditemukan.</p>
          )}
          {results.map((item) => (
            <div 
              key={item.id} 
              onClick={() => navigateToResult(item.batchId)}
              className="flex justify-between items-center p-3 border rounded-md hover:bg-accent cursor-pointer transition-colors"
            >
              <div>
                <p className="font-semibold text-sm">{item.article} - {item.modelName}</p>
                <p className="text-xs text-muted-foreground">PO: {item.poNumber || "Belum ada"} | Season: {item.season?.name || "-"}</p>
              </div>
              <div className="text-xs font-medium px-2 py-1 bg-primary/10 text-primary rounded-full">
                {item.isOrdered ? "ORDERED" : "PENDING"}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
