import { useState, useEffect } from 'react';
import { Flag, Search, Check, X, User, MessageSquare, Clock, Filter, ChevronDown, AlertTriangle, Eye, Trash2, Ban, UserCheck, Loader2 } from 'lucide-react';
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
  // Added by 20261013120000_moderation_actions.sql, and optional here because
  // src/integrations/supabase/types.ts is not regenerated in this repo (see
  // CLAUDE.md rule 1) — the columns arrive on the row at runtime.
  content_type?: string | null;
  content_id?: string | null;
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

/**
 * The two moderation functions, called by name.
 *
 * `supabase.rpc` is typed off `Database["public"]["Functions"]`, and this repo
 * deliberately does not regenerate `src/integrations/supabase/types.ts`
 * (CLAUDE.md rule 1), so two functions that exist in the database are absent
 * from the generated union. This is the narrow, explicit escape hatch rather
 * than an `any` at each call site.
 *
 * Both are SECURITY DEFINER and both check `has_role(auth.uid(), 'admin')` in
 * their own body: this page runs as the ordinary `authenticated` role, so the
 * gate that matters is in Postgres, not here.
 */
type AdminRpc = (
  fn: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

const callAdminRpc = (fn: string, args: Record<string, unknown>) =>
  (supabase.rpc as unknown as AdminRpc)(fn, args);

/**
 * The moderation actions this page can take.
 *
 * Removal is soft where the schema has a soft flag: a reported quiz is
 * unpublished (`is_public = false`), a reported room is closed and archived,
 * and a reported profile keeps its account and its history while losing the
 * nickname and avatar that were the offence. Only a chat message is actually
 * deleted, because that table has no flag any reader honours.
 */
type ModerationAction =
  | { kind: 'remove'; target: 'auto' | 'profile' }
  | { kind: 'suspend'; suspended: boolean };

const actionKey = (a: ModerationAction) =>
  a.kind === 'remove'
    ? a.target === 'profile'
      ? 'clearProfile'
      : 'removeContent'
    : a.suspended
      ? 'suspend'
      : 'unsuspend';

const ACTION_LABELS: Record<string, { label: string; confirm: string; done: string }> = {
  removeContent: {
    label: 'კონტენტის წაშლა',
    confirm: 'რეპორტირებული კონტენტი დაიმალება. გავაგრძელოთ?',
    done: 'კონტენტი წაიშალა',
  },
  clearProfile: {
    label: 'პროფილის გასუფთავება',
    confirm: 'მეტსახელი და ავატარი წაიშლება. გავაგრძელოთ?',
    done: 'პროფილი გასუფთავდა',
  },
  suspend: {
    label: 'მომხმარებლის შეჩერება',
    confirm: 'ანგარიში შეჩერდება და მისი საჯარო ქვიზები დაიმალება. გავაგრძელოთ?',
    done: 'მომხმარებელი შეჩერდა',
  },
  unsuspend: {
    label: 'შეჩერების მოხსნა',
    confirm: 'ანგარიშის შეჩერება მოიხსნება. გავაგრძელოთ?',
    done: 'შეჩერება მოიხსნა',
  },
};

/** What a report says it is about, for the detail dialog. */
const CONTENT_TYPE_LABELS: Record<string, string> = {
  quiz: "ქვიზი",
  room: "ოთახი",
  message: "შეტყობინება",
  profile: "პროფილი",
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
  // Which moderation action is one tap from happening. Removing content and
  // ejecting an account are not undoable from this page, so neither is a
  // single click on a row you opened to read.
  const [pendingAction, setPendingAction] = useState<ModerationAction | null>(null);

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

  /**
   * Act on the report, not just on its status row.
   *
   * Until this existed the only thing this page could do with a report was
   * change a word in its `status` column. The Terms of Service promise that
   * content reported as offensive is "reviewed and removed within 24 hours,
   * and users who post it are ejected" — there was no code path anywhere in
   * the product that removed anything or ejected anyone, which is what
   * Guideline 1.2 asks a reviewer to check.
   *
   * Every action here is a `SECURITY DEFINER` function that checks the admin
   * role in its own body and is granted to `authenticated` only.
   */
  const runAction = async (action: ModerationAction) => {
    if (!selectedReport) return;
    setActionLoading(true);
    try {
      const { error } =
        action.kind === 'suspend'
          ? await callAdminRpc('admin_set_user_suspended', {
              p_user_id: selectedReport.reported_user_id,
              p_suspended: action.suspended,
              p_reason: selectedReport.report_type,
            })
          : await callAdminRpc('admin_remove_reported_content', {
              p_report_id: selectedReport.id,
              p_target: action.target,
            });

      if (error) throw new Error(error.message);

      toast.success(ACTION_LABELS[actionKey(action)].done);
      setPendingAction(null);
      setSelectedReport(null);
      fetchReports();
    } catch (error) {
      console.error('Moderation action failed:', error);
      toast.error('მოქმედება ვერ შესრულდა');
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
      <Dialog
        open={!!selectedReport}
        onOpenChange={() => {
          setSelectedReport(null);
          setPendingAction(null);
        }}
      >
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

              {/* What it is about. A report with a content id is one an admin
                  can act on directly; one without is about the person. */}
              {(selectedReport.content_type || selectedReport.content_id) && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">კონტენტი</p>
                  <p className="text-sm">
                    {CONTENT_TYPE_LABELS[selectedReport.content_type || ''] || selectedReport.content_type}
                    {selectedReport.content_id && (
                      <span className="ml-2 font-mono text-xs text-muted-foreground">
                        {selectedReport.content_id}
                      </span>
                    )}
                  </p>
                </div>
              )}

              {/* Date */}
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">თარიღი</p>
                <p className="text-sm">
                  {format(new Date(selectedReport.created_at), 'dd MMMM yyyy, HH:mm', { locale: ka })}
                </p>
              </div>

              {/* Moderation. Removing content and ejecting its author are the
                  two things the Terms promise and the page could not do. */}
              <div className="p-3 border border-destructive/30 rounded-lg space-y-2">
                <p className="text-xs text-muted-foreground">მოდერაცია</p>

                {pendingAction ? (
                  <div className="space-y-2">
                    <p className="text-sm">{ACTION_LABELS[actionKey(pendingAction)].confirm}</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={actionLoading}
                        onClick={() => runAction(pendingAction)}
                      >
                        {actionLoading ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4 mr-2" />
                        )}
                        დადასტურება
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={actionLoading}
                        onClick={() => setPendingAction(null)}
                      >
                        გაუქმება
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPendingAction({ kind: 'remove', target: 'auto' })}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {ACTION_LABELS.removeContent.label}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPendingAction({ kind: 'remove', target: 'profile' })}
                      disabled={selectedReport.reported_user_id === selectedReport.reporter_id}
                    >
                      <User className="w-4 h-4 mr-2" />
                      {ACTION_LABELS.clearProfile.label}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setPendingAction({ kind: 'suspend', suspended: true })}
                      disabled={selectedReport.reported_user_id === selectedReport.reporter_id}
                    >
                      <Ban className="w-4 h-4 mr-2" />
                      {ACTION_LABELS.suspend.label}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setPendingAction({ kind: 'suspend', suspended: false })}
                      disabled={selectedReport.reported_user_id === selectedReport.reporter_id}
                    >
                      <UserCheck className="w-4 h-4 mr-2" />
                      {ACTION_LABELS.unsuspend.label}
                    </Button>
                  </div>
                )}

                {/* king_question and words_word are filed by a player against
                    themselves — the reported column is NOT NULL and a bad
                    puzzle is not a person. Nothing here should touch them. */}
                {selectedReport.reported_user_id === selectedReport.reporter_id && (
                  <p className="text-xs text-muted-foreground">
                    კონტენტის რეპორტი — მომხმარებელზე მოქმედება არ ვრცელდება
                  </p>
                )}
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
