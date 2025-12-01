import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Bell, CheckCheck, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  sent_at: string;
  action_url: string | null;
  data: any;
}

const Notifications = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    fetchNotifications();
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .order('sent_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error: any) {
      toast.error("Error loading notifications");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
      
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ));
    } catch (error: any) {
      toast.error("Error marking notification as read");
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user?.id)
        .eq('read', false);

      if (error) throw error;
      
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      toast.success("All notifications marked as read");
    } catch (error: any) {
      toast.error("Error marking all as read");
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  const getNotificationIcon = (type: string) => {
    const iconClass = "w-5 h-5";
    switch (type) {
      case 'handshake_request':
        return <Bell className={`${iconClass} text-secondary`} />;
      case 'handshake_approved':
        return <CheckCheck className={`${iconClass} text-green-400`} />;
      case 'handshake_rejected':
        return <Trash2 className={`${iconClass} text-destructive`} />;
      case 'payment_reminder':
        return <Bell className={`${iconClass} text-yellow-400`} />;
      case 'payment_overdue':
        return <Bell className={`${iconClass} text-destructive`} />;
      case 'payment_received':
        return <CheckCheck className={`${iconClass} text-green-400`} />;
      case 'penalty_notification':
        return <Bell className={`${iconClass} text-orange-400`} />;
      default:
        return <Bell className={`${iconClass} text-foreground/60`} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading notifications...</div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <header className="flex items-center justify-between mb-8 animate-slide-up">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
            className="hover:bg-muted/50"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-foreground/60">
                {unreadCount} unread
              </p>
            )}
          </div>
        </div>
        
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={markAllAsRead}
            className="hover:bg-secondary/10"
          >
            <CheckCheck className="w-4 h-4 mr-2" />
            Mark all as read
          </Button>
        )}
      </header>

      <div className="max-w-2xl mx-auto space-y-3">
        {notifications.length === 0 ? (
          <GlassCard className="text-center py-12">
            <Bell className="w-12 h-12 mx-auto mb-3 text-foreground/30" />
            <p className="text-foreground/60">No notifications yet</p>
            <p className="text-sm text-foreground/40 mt-1">
              You'll see important updates here
            </p>
          </GlassCard>
        ) : (
          notifications.map((notification, index) => (
            <GlassCard
              key={notification.id}
              hover
              onClick={() => handleNotificationClick(notification)}
              className={`cursor-pointer transition-all animate-slide-up ${
                !notification.read ? 'bg-secondary/5 border-secondary/30' : 'opacity-70'
              }`}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-full ${
                  !notification.read ? 'bg-secondary/20' : 'bg-muted/30'
                }`}>
                  {getNotificationIcon(notification.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className={`font-semibold ${
                      !notification.read ? 'text-foreground' : 'text-foreground/70'
                    }`}>
                      {notification.title}
                    </h3>
                    {!notification.read && (
                      <span className="flex h-2 w-2 rounded-full bg-secondary animate-pulse" />
                    )}
                  </div>
                  
                  <p className={`text-sm mb-2 ${
                    !notification.read ? 'text-foreground/80' : 'text-foreground/60'
                  }`}>
                    {notification.message}
                  </p>
                  
                  <div className="flex items-center gap-3 text-xs text-foreground/50">
                    <span>
                      {formatDistanceToNow(new Date(notification.sent_at), { addSuffix: true })}
                    </span>
                    {notification.action_url && (
                      <span className="text-secondary">Click to view</span>
                    )}
                  </div>
                </div>
              </div>
            </GlassCard>
          ))
        )}
      </div>
    </div>
  );
};

export default Notifications;