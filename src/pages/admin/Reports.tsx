import { useState, useEffect } from 'react';
import { Flag, Search, Check, X, User, MessageSquare, Clock, Filter, ChevronDown, AlertTriangle, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ResolvedAvatarImage } from "@/components/ui/resolved-avatar-image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from "@/lib/toast";
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ka } from 'date-fns/locale';

interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  report_type: string;
  description: string | null;
  message_id: string | null;
  room_id: string | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  reporter?: {
    nickname: string;
    avatar_url: string | null;
  };
  reported?: {
    nickname: string;
    avatar_url: string | null;
  };
}

const REPORT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  spam: { label: "სპამი", color: "bg-yellow-100 text-yellow-800" },
  harassment: { label: "შეურაცხყოფა", color: "bg-red-100 text-red-800" },
  inappropriate: { label: "შეუსაბამო", color: "bg-orange-100 text-orange-800" },
  cheating: { label: "თაღლითობა", color: "bg-purple-100 text-purple-800" },
  // Not a person: the flag under a King reveal, filed by a player who spotted
  // a bad puzzle. The reporter stands in as reported_user_id because that
  // column is NOT NULL — read the description, not the pair of avatars.
  king_question: { label: "King კითხვა", color: "bg-indigo-100 text-indigo-800" },
  words_word: { label: "Words სიტყვა", color: "bg-teal-100 text-teal-800" },
  other: { label: "სხვა", color: "bg-gray-100 text-gray-800" },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "მოლოდინში", color: "bg-amber-100 text-amber-800" },
  reviewed: { label: "განხილულია", color: "bg-blue-100 text-blue-800" },
  resolved: { label: "გადაწყვეტილია", color: "bg-green-100 text-green-800" },
  dismissed: { label: "უარყოფილია", color: "bg-gray-100 text-gray-800" },
};

export default function AdminReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch reports
  useEffect(() => {
    fetchReports();
  }, [statusFilter, typeFilter]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('user_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (typeFilter !== 'all') {
        query = query.eq('report_type', typeFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch user profiles for reporters and reported users
      const userIds = new Set<string>();
      data?.forEach(report => {
        userIds.add(report.reporter_id);
        userIds.add(report.reported_user_id);
      });

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, nickname, avatar_url')
        .in('user_id', Array.from(userIds));

      const profilesMap = new Map(
        profiles?.map(p => [p.user_id, { nickname: p.nickname, avatar_url: p.avatar_url }])
      );

      const enrichedReports = data?.map(report => ({
        ...report,
        reporter: profilesMap.get(report.reporter_id),
        reported: profilesMap.get(report.reported_user_id),
      })) || [];

      setReports(enrichedReports);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('რეპორტების ჩატვირთვა ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (reportId: string, newStatus: string) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('user_reports')
        .update({
          status: newStatus,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', reportId);

      if (error) throw error;

      toast.success('სტატუსი განახლდა');
      setSelectedReport(null);
      fetchReports();
    } catch (error) {
      console.error('Error updating report:', error);
      toast.error('სტატუსის განახლება ვერ მოხერხდა');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredReports = reports.filter(report => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      report.reporter?.nickname?.toLowerCase().includes(term) ||
      report.reported?.nickname?.toLowerCase().includes(term) ||
      report.description?.toLowerCase().includes(term)
    );
  });

  const stats = {
    total: reports.length,
    pending: reports.filter(r => r.status === 'pending').length,
    reviewed: reports.filter(r => r.status === 'reviewed').length,
    resolved: reports.filter(r => r.status === 'resolved').length,
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/30 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-orange-600">
              <Flag className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">რეპორტები</h1>
              <p className="text-xs text-muted-foreground">მომხმარებლების რეპორტების მართვა</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">{stats.total}</div>
              <div className="text-xs text-muted-foreground">სულ</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-amber-500">{stats.pending}</div>
              <div className="text-xs text-muted-foreground">მოლოდინში</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-500">{stats.resolved}</div>
              <div className="text-xs text-muted-foreground">გადაწყვეტილი</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ძებნა..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="სტატუსი" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ყველა სტატუსი</SelectItem>
              <SelectItem value="pending">მოლოდინში</SelectItem>
              <SelectItem value="reviewed">განხილული</SelectItem>
              <SelectItem value="resolved">გადაწყვეტილი</SelectItem>
              <SelectItem value="dismissed">უარყოფილი</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="ტიპი" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ყველა ტიპი</SelectItem>
              <SelectItem value="spam">სპამი</SelectItem>
              <SelectItem value="harassment">შეურაცხყოფა</SelectItem>
              <SelectItem value="inappropriate">შეუსაბამო</SelectItem>
              <SelectItem value="cheating">თაღლითობა</SelectItem>
              <SelectItem value="king_question">King კითხვა</SelectItem>
              <SelectItem value="words_word">Words სიტყვა</SelectItem>
              <SelectItem value="other">სხვა</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={fetchReports}>
            განახლება
          </Button>
        </div>
      </div>

      {/* Reports List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>რეპორტები არ მოიძებნა</p>
            </div>
          ) : (
            filteredReports.map((report) => (
              <div
                key={report.id}
                onClick={() => setSelectedReport(report)}
                className="bg-card border border-border/50 rounded-xl p-4 hover:border-border transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {/* Reported User */}
                    <Avatar className="w-10 h-10">
                      <ResolvedAvatarImage src={report.reported?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {report.reported?.nickname?.charAt(0).toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{report.reported?.nickname || 'უცნობი'}</span>
                        <Badge className={cn("text-xs", REPORT_TYPE_LABELS[report.report_type]?.color)}>
                          {REPORT_TYPE_LABELS[report.report_type]?.label || report.report_type}
                        </Badge>
                        <Badge className={cn("text-xs", STATUS_LABELS[report.status]?.color)}>
                          {STATUS_LABELS[report.status]?.label || report.status}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-muted-foreground mt-1">
                        რეპორტერი: {report.reporter?.nickname || 'უცნობი'}
                      </div>

                      {report.description && (
                        <p className="text-sm text-foreground/80 mt-2 line-clamp-2">
                          {report.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(report.created_at), 'dd MMM, HH:mm', { locale: ka })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Report Detail Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>რეპორტის დეტალები</DialogTitle>
            <DialogDescription>
              რეპორტის სრული ინფორმაცია და მართვა
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4">
              {/* Reported User */}
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-2">რეპორტირებული მომხმარებელი</p>
                <div className="flex items-center gap-2">
                  <Avatar className="w-8 h-8">
                    <ResolvedAvatarImage src={selectedReport.reported?.avatar_url || undefined} />
                    <AvatarFallback className="bg-red-100 text-red-800">
                      {selectedReport.reported?.nickname?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{selectedReport.reported?.nickname || 'უცნობი'}</span>
                </div>
              </div>

              {/* Reporter */}
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-2">რეპორტერი</p>
                <div className="flex items-center gap-2">
                  <Avatar className="w-8 h-8">
                    <ResolvedAvatarImage src={selectedReport.reporter?.avatar_url || undefined} />
                    <AvatarFallback className="bg-blue-100 text-blue-800">
                      {selectedReport.reporter?.nickname?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{selectedReport.reporter?.nickname || 'უცნობი'}</span>
                </div>
              </div>

              {/* Report Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">ტიპი</p>
                  <Badge className={cn("text-xs", REPORT_TYPE_LABELS[selectedReport.report_type]?.color)}>
                    {REPORT_TYPE_LABELS[selectedReport.report_type]?.label || selectedReport.report_type}
                  </Badge>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">სტატუსი</p>
                  <Badge className={cn("text-xs", STATUS_LABELS[selectedReport.status]?.color)}>
                    {STATUS_LABELS[selectedReport.status]?.label || selectedReport.status}
                  </Badge>
                </div>
              </div>

              {/* Description */}
              {selectedReport.description && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-2">აღწერა</p>
                  <p className="text-sm">{selectedReport.description}</p>
                </div>
              )}

              {/* Date */}
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">თარიღი</p>
                <p className="text-sm">
                  {format(new Date(selectedReport.created_at), 'dd MMMM yyyy, HH:mm', { locale: ka })}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleUpdateStatus(selectedReport!.id, 'dismissed')}
              disabled={actionLoading}
            >
              <X className="w-4 h-4 mr-2" />
              უარყოფა
            </Button>
            <Button
              variant="outline"
              onClick={() => handleUpdateStatus(selectedReport!.id, 'reviewed')}
              disabled={actionLoading}
            >
              <Eye className="w-4 h-4 mr-2" />
              განხილულია
            </Button>
            <Button
              onClick={() => handleUpdateStatus(selectedReport!.id, 'resolved')}
              disabled={actionLoading}
            >
              <Check className="w-4 h-4 mr-2" />
              გადაწყვეტა
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
