import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Users, Link2, TrendingUp, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

interface ReferralStats {
  usersWithCode: number;
  totalInvitesSent: number;
  acceptedInvites: number;
  conversionRate: number;
  dailyData: { date: string; sent: number; accepted: number }[];
}

export function ReferralAnalyticsWidget() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [codesRes, invitesRes, dailyRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id', { count: 'exact', head: true })
          .not('referral_code', 'is', null),
        supabase
          .from('friend_invites')
          .select('status', { count: 'exact' }),
        supabase
          .from('friend_invites')
          .select('created_at, status')
          .order('created_at', { ascending: true }),
      ]);

      const totalInvites = invitesRes.data?.length || 0;
      const accepted = invitesRes.data?.filter(i => i.status === 'accepted').length || 0;

      // Group daily
      const dayMap = new Map<string, { sent: number; accepted: number }>();
      dailyRes.data?.forEach(inv => {
        const day = new Date(inv.created_at!).toLocaleDateString('ka-GE', { month: 'short', day: 'numeric' });
        const entry = dayMap.get(day) || { sent: 0, accepted: 0 };
        entry.sent++;
        if (inv.status === 'accepted') entry.accepted++;
        dayMap.set(day, entry);
      });

      setStats({
        usersWithCode: codesRes.count || 0,
        totalInvitesSent: totalInvites,
        acceptedInvites: accepted,
        conversionRate: totalInvites > 0 ? Math.round((accepted / totalInvites) * 100) : 0,
        dailyData: Array.from(dayMap.entries()).map(([date, d]) => ({ date, ...d })),
      });
      setLoading(false);
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center h-48">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const statItems = [
    {
      label: 'ლინკი შექმნა',
      value: stats.usersWithCode,
      icon: Link2,
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      label: 'მოწვევა გაგზავნა',
      value: stats.totalInvitesSent,
      icon: Users,
      gradient: 'from-violet-500 to-purple-500',
    },
    {
      label: 'მიიღეს PRO',
      value: stats.acceptedInvites,
      icon: UserCheck,
      gradient: 'from-emerald-500 to-green-500',
    },
    {
      label: 'კონვერსია',
      value: `${stats.conversionRate}%`,
      icon: TrendingUp,
      gradient: stats.conversionRate > 10 ? 'from-emerald-500 to-teal-500' : 'from-amber-500 to-orange-500',
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500">
            <Users className="h-3.5 w-3.5 text-white" />
          </div>
          რეფერალ ანალიტიკა
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statItems.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 p-3 rounded-xl bg-muted/50"
            >
              <div className={cn("p-2 rounded-lg bg-gradient-to-br text-white", item.gradient)}>
                <item.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-lg font-bold leading-none">{item.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{item.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Chart */}
        {stats.dailyData.length > 0 && (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.dailyData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="sent" name="გაგზავნილი" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="accepted" name="მიღებული" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {stats.dailyData.length === 0 && (
          <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
            ჯერ არ არის მონაცემები
          </div>
        )}
      </CardContent>
    </Card>
  );
}
