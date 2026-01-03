import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ka } from 'date-fns/locale';
import { Search, ChevronLeft, ChevronRight, ExternalLink, Image, Film } from 'lucide-react';

interface AvatarGeneration {
  id: string;
  user_id: string;
  source_image_url: string | null;
  avatar_url: string;
  is_current: boolean | null;
  created_at: string;
}

export const GenerationHistoryTable = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const { data, isLoading, error } = useQuery({
    queryKey: ['avatar-generations', page, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('avatar_generations')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      const { data, error, count } = await query;

      if (error) throw error;
      return { generations: data as AvatarGeneration[], totalCount: count || 0 };
    },
  });

  const totalPages = Math.ceil((data?.totalCount || 0) / pageSize);

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        შეცდომა მონაცემების ჩატვირთვისას: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="მოძებნე მომხმარებლის ID-ით..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(0);
            }}
            className="pl-9"
          />
        </div>
        <Badge variant="outline">
          სულ: {data?.totalCount || 0}
        </Badge>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">წყარო</TableHead>
              <TableHead className="w-20">შედეგი</TableHead>
              <TableHead>მომხმარებელი</TableHead>
              <TableHead>თარიღი</TableHead>
              <TableHead className="w-24">სტატუსი</TableHead>
              <TableHead className="w-20">მოქმედება</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="w-12 h-12 rounded" /></TableCell>
                  <TableCell><Skeleton className="w-12 h-12 rounded" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))
            ) : data?.generations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  გენერაციები ვერ მოიძებნა
                </TableCell>
              </TableRow>
            ) : (
              data?.generations.map((gen) => (
                <TableRow key={gen.id}>
                  <TableCell>
                    {gen.source_image_url ? (
                      <img
                        src={gen.source_image_url}
                        alt="Source"
                        className="w-12 h-12 object-cover rounded border"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                        <Image className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {gen.avatar_url?.includes('.mp4') || gen.avatar_url?.includes('video') ? (
                      <div className="w-12 h-12 bg-muted rounded flex items-center justify-center border">
                        <Film className="w-5 h-5 text-amber-500" />
                      </div>
                    ) : (
                      <img
                        src={gen.avatar_url}
                        alt="Generated"
                        className="w-12 h-12 object-cover rounded border"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {gen.user_id.slice(0, 8)}...
                      </code>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(gen.created_at), 'dd MMM, HH:mm', { locale: ka })}
                  </TableCell>
                  <TableCell>
                    {gen.is_current ? (
                      <Badge variant="default" className="text-xs">აქტიური</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">არქივი</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                    >
                      <a href={gen.avatar_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            გვერდი {page + 1} / {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
