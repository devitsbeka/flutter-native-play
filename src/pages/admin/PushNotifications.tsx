import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { SafeAvatar } from '@/components/shared/SafeAvatar';
import { Badge } from '@/components/ui/badge';
import { Bell, Send, Loader2, Users, User, Search } from 'lucide-react';

interface UserWithToken {
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  platform: string;
}

const NOTIFICATION_TYPES = [
  { value: 'daily_reward', label: 'დღიური ჯილდო' },
  { value: 'game_invite', label: 'თამაშის მოწვევა' },
  { value: 'friend_request', label: 'მეგობრობის მოთხოვნა' },
  { value: 'game_started', label: 'თამაში დაიწყო' },
  { value: 'custom', label: 'სხვა' },
];

export default function PushNotifications() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [users, setUsers] = useState<UserWithToken[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [sendToAll, setSendToAll] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [notificationType, setNotificationType] = useState('custom');
  const [deepLink, setDeepLink] = useState('');

  useEffect(() => {
    fetchUsersWithTokens();
  }, []);

  const fetchUsersWithTokens = async () => {
    setLoading(true);
    try {
      // Get users who have push tokens
      const { data: tokens, error } = await supabase
        .from('push_tokens')
        .select('user_id, platform');

      if (error) throw error;

      // Get unique user IDs
      const uniqueUserIds = [...new Set(tokens?.map(t => t.user_id) || [])];

      if (uniqueUserIds.length > 0) {
        // Get profile info for these users
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('user_id, nickname, avatar_url')
          .in('user_id', uniqueUserIds);

        if (profileError) throw profileError;

        // Combine data
        const usersWithTokens = profiles?.map(p => ({
          user_id: p.user_id,
          nickname: p.nickname,
          avatar_url: p.avatar_url,
          platform: tokens?.find(t => t.user_id === p.user_id)?.platform || 'unknown'
        })) || [];

        setUsers(usersWithTokens);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'შეცდომა',
        description: 'მომხმარებლების ჩატვირთვა ვერ მოხერხდა',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendNotification = async () => {
    if (!title.trim() || !body.trim()) {
      toast({
        title: 'შეცდომა',
        description: 'გთხოვთ შეავსოთ სათაური და ტექსტი',
        variant: 'destructive',
      });
      return;
    }

    if (!sendToAll && selectedUsers.length === 0) {
      toast({
        title: 'შეცდომა',
        description: 'გთხოვთ აირჩიოთ მომხმარებლები',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('send-push-notification', {
        body: {
          user_ids: sendToAll ? undefined : selectedUsers,
          title,
          body,
          notification_type: notificationType,
          // `route` — the key usePushNotifications navigates on when the
          // notification is tapped. This sent `screen`, which nothing reads,
          // so a test push opened the app and went nowhere.
          data: deepLink ? { route: deepLink } : undefined,
        },
      });

      if (response.error) throw response.error;

      const result = response.data;
      
      toast({
        title: 'წარმატება!',
        description: `გაიგზავნა ${result.sent} შეტყობინება${result.failed > 0 ? `, ${result.failed} ვერ გაიგზავნა` : ''}`,
      });

      // Reset form
      setTitle('');
      setBody('');
      setDeepLink('');
      setSelectedUsers([]);
    } catch (error: unknown) {
      console.error('Error sending notification:', error);
      toast({
        title: 'შეცდომა',
        description: error instanceof Error ? error.message : 'შეტყობინების გაგზავნა ვერ მოხერხდა',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const filteredUsers = users.filter(user =>
    user.nickname.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Bell className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Push შეტყობინებები</h1>
          <p className="text-muted-foreground text-sm">გაგზავნე შეტყობინებები მომხმარებლებს</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compose Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              შეტყობინების შედგენა
            </CardTitle>
            <CardDescription>
              შეადგინე და გაგზავნე push შეტყობინება
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="type">შეტყობინების ტიპი</Label>
              <Select value={notificationType} onValueChange={setNotificationType}>
                <SelectTrigger>
                  <SelectValue placeholder="აირჩიე ტიპი" />
                </SelectTrigger>
                <SelectContent>
                  {NOTIFICATION_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">სათაური</Label>
              <Input
                id="title"
                placeholder="მაგ: დღიური ჯილდო მზადაა!"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">ტექსტი</Label>
              <Textarea
                id="body"
                placeholder="მაგ: შენი დღიური ჯილდო გელოდება! შედი და აიღე."
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deepLink">Deep Link (არასავალდებულო)</Label>
              <Input
                id="deepLink"
                placeholder="მაგ: /leaderboards ან /team?join=ABC123"
                value={deepLink}
                onChange={e => setDeepLink(e.target.value)}
              />
            </div>

            <Button 
              onClick={handleSendNotification} 
              disabled={sending || !title || !body}
              className="w-full"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  იგზავნება...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  გაგზავნა {sendToAll ? `(${users.length} მომხმარებელი)` : `(${selectedUsers.length} არჩეული)`}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Recipients Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              მიმღებები
            </CardTitle>
            <CardDescription>
              აირჩიე ვის გაეგზავნოს შეტყობინება
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="sendToAll"
                checked={sendToAll}
                onCheckedChange={(checked) => setSendToAll(checked === true)}
              />
              <Label htmlFor="sendToAll" className="cursor-pointer">
                გაგზავნა ყველა მომხმარებელს ({users.length})
              </Label>
            </div>

            {!sendToAll && (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="მოძებნე მომხმარებელი..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <ScrollArea className="h-[300px] border rounded-lg">
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <User className="h-8 w-8 mb-2" />
                      <p>Push token-ის მქონე მომხმარებელი ვერ მოიძებნა</p>
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {filteredUsers.map(user => (
                        <div
                          key={user.user_id}
                          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                            selectedUsers.includes(user.user_id)
                              ? 'bg-primary/10 border border-primary/30'
                              : 'hover:bg-muted'
                          }`}
                          onClick={() => toggleUserSelection(user.user_id)}
                        >
                          <Checkbox
                            checked={selectedUsers.includes(user.user_id)}
                            onCheckedChange={() => toggleUserSelection(user.user_id)}
                          />
                          <SafeAvatar
                            avatarUrl={user.avatar_url}
                            fallback={user.nickname}
                            className="h-8 w-8"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{user.nickname}</p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {user.platform}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                {selectedUsers.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    არჩეულია: {selectedUsers.length} მომხმარებელი
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
