"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  sizeText?: string;
}

export function Pagination({ currentPage, totalPages, onPageChange, className, sizeText }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  // Display a window of pages centered around the current page
  const getVisiblePages = () => {
    if (totalPages <= 5) return pages;
    if (currentPage <= 3) return [1, 2, 3, 4, 5];
    if (currentPage >= totalPages - 2) return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2];
  };

  const visiblePages = getVisiblePages();

  return (
    <div className={cn("flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-50 dark:border-slate-800/50 pt-5 w-full", className)}>
      <span className={cn("text-xs text-slate-400 font-bold", sizeText)}>
        Page <span className="font-extrabold text-slate-700 dark:text-slate-350">{currentPage}</span> of{" "}
        <span className="font-extrabold text-slate-700 dark:text-slate-350">{totalPages}</span> pages
      </span>
      <div className="flex items-center gap-1.5 flex-wrap">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9 rounded-xl border border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-850/50"
          disabled={currentPage === 1}
          onClick={() => onPageChange(1)}
          title="First Page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9 rounded-xl border border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-850/50"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          title="Previous Page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {visiblePages.map((page) => (
          <Button
            key={page}
            variant={currentPage === page ? "default" : "ghost"}
            className={cn(
              "h-9 w-9 rounded-xl text-xs font-black transition-all",
              currentPage === page 
                ? "bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 text-white" 
                : "border border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-850/50"
            )}
            onClick={() => onPageChange(page)}
          >
            {page}
          </Button>
        ))}

        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9 rounded-xl border border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-850/50"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          title="Next Page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9 rounded-xl border border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-850/50"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(totalPages)}
          title="Last Page"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
